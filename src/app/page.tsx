
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, isWeekend, parseISO, addDays, isValid, parse } from 'date-fns';
import { Loader2, PlusCircle, Trash2, CalendarPlus, Users, Armchair, DoorOpen } from 'lucide-react';
import { doc, getDoc, onSnapshot, writeBatch, Unsubscribe } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { optimizeSeatingArrangement } from '@/ai/flows/optimize-seating-arrangement';
import { useAuth } from '@/hooks/useAuth';
import { auth, db } from '@/lib/firebase';

import { Header } from '@/components/app/header';
import { CalendarView } from '@/components/app/calendar-view';
import { DayDetails } from '@/components/app/day-details';
import { FairnessStats } from '@/components/app/fairness-stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Arrangements, Arrangement, Group, UserProfile, Comment, Photo, OverrideRequest } from '@/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function NoGroupState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <Armchair className="h-24 w-24 text-primary opacity-20 mb-6" />
      <h2 className="text-3xl font-bold text-foreground">Welcome to FairDesk!</h2>
      <p className="text-lg text-muted-foreground mt-2 max-w-md">
        You're not part of a group yet. Create a group to start managing seat arrangements, or join an existing one using an invite link.
      </p>
      <div className="mt-8">
        <Button size="lg" onClick={() => router.push('/group-setup')}>
          <DoorOpen className="mr-2" />
          Create or Join a Group
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  
  const [arrangements, setArrangements] = useState<Arrangements>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [initialArrangement, setInitialArrangement] = useState<Record<string, string>>({});
  const [initialArrangementDate, setInitialArrangementDate] = useState('');
  const [isSettingInitial, setIsSettingInitial] = useState(false);


  const newHolidayRef = useRef<HTMLInputElement>(null);
  const newEventDateRef = useRef<HTMLInputElement>(null);
  const newEventDescRef = useRef<HTMLInputElement>(null);

  const seats = useMemo(() => group?.seats || [], [group]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    let groupUnsub: Unsubscribe | null = null;

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
      if (groupUnsub) {
        groupUnsub();
        groupUnsub = null;
      }
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (!userData.groupId) {
          setIsDataLoading(false);
          setGroup(null);
          setFriends([]);
          return;
        }
        
        groupUnsub = onSnapshot(doc(db, 'groups', userData.groupId), (groupDoc) => {
            if (groupDoc.exists()) {
                const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
                setGroup(groupData);
                fetchFriends(groupData.members);
                setArrangements(groupData.arrangements || {});
            } else {
                toast({ variant: 'destructive', title: 'Group not found.' });
                // Handle case where user's groupId is stale
                const userRef = doc(db, "users", user.uid);
                writeBatch(db).update(userRef, { groupId: null }).commit();
            }
            setIsDataLoading(false);
        });

      } else {
        toast({ variant: 'destructive', title: 'User profile not found.' });
        setIsDataLoading(false);
        router.push('/login');
      }
    });

    return () => {
        unsubUser();
        if (groupUnsub) {
            groupUnsub();
        }
    };
    
  }, [user, loading, router, toast]);

  const fetchFriends = async (memberIds: string[]) => {
      if (memberIds.length === 0) {
        setFriends([]);
        return;
      }
      const friendProfiles = await Promise.all(
          memberIds.map(async (id) => {
              const userDoc = await getDoc(doc(db, 'users', id));
              return userDoc.exists() ? { uid: userDoc.id, ...userDoc.data() } as UserProfile : null;
          })
      );
      setFriends(friendProfiles.filter(p => p !== null) as UserProfile[]);
  }

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
    toast({ title: 'Logged out successfully.' });
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setSelectedDate(null);
  };

  const isGroupReady = useMemo(() => {
    if (!group) return false;
    return friends.length === group.seats.length && friends.length > 0;
  }, [group, friends]);

  const handleGenerate = async () => {
    if (!group || !isGroupReady) {
      toast({
        variant: 'destructive',
        title: 'Group Not Ready',
        description: 'You need all seats to be filled by friends to generate arrangements.',
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const pastArrangementsForAI = Object.entries(arrangements).map(([date, arrangement]) => ({
        date,
        seats: seats.map(seat => {
            const friendId = arrangement.seats[seat];
            const friend = friends.find(f => f.uid === friendId);
            return friend ? friend.displayName : 'Unknown';
        }),
      }));

      const result = await optimizeSeatingArrangement({
        friends: friends.map(f => f.displayName),
        seats: seats,
        nonWorkingDays: group.nonWorkingDays || [],
        specialEvents: group.specialEvents || {},
        pastArrangements: pastArrangementsForAI,
      });

      if (!result.nextWorkingDay) {
        toast({
          variant: 'destructive',
          title: 'No Working Day Found',
          description: 'Could not determine the next working day to assign seats.',
        });
        return;
      }
      
      const nextWorkingDayDate = parseISO(result.nextWorkingDay);
      if (!isValid(nextWorkingDayDate)) {
         toast({
          variant: 'destructive',
          title: 'Invalid Date Received',
          description: 'The AI returned an invalid date for the next arrangement.',
        });
        return;
      }

      const newArrangement: Arrangement = {
        seats: seats.reduce((acc, seat, index) => {
          const friendName = result.arrangement[index];
          const friend = friends.find(f => f.displayName === friendName);
          acc[seat] = friend ? friend.uid : 'unknown'; // Store UID
          return acc;
        }, {} as Record<string, string>),
        comments: [{ user: 'ai_assistant', text: result.reasoning, timestamp: new Date().toISOString() }],
        photos: [],
      };

      const groupRef = doc(db, 'groups', group.id);
      const batch = writeBatch(db);
      batch.update(groupRef, {
        [`arrangements.${result.nextWorkingDay}`]: newArrangement
      });
      await batch.commit();

      toast({
        title: "Arrangement Optimized!",
        description: `A new seating arrangement has been generated for ${format(nextWorkingDayDate, 'MMMM do')}.`,
      });
    } catch (error) {
      console.error("AI optimization failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate arrangement. Please check console.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUpdateArrangement = async (date: Date, updatedArrangement: Arrangement) => {
    if (!group) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const groupRef = doc(db, 'groups', group.id);
    try {
      const batch = writeBatch(db);
      batch.update(groupRef, {
        [`arrangements.${dateStr}`]: updatedArrangement
      });
      await batch.commit();
    } catch (error) {
      console.error("Error updating arrangement:", error);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save changes.' });
    }
  };
  
  const handleAddHoliday = async () => {
    if (newHolidayRef.current?.value && group) {
      const newDate = parse(newHolidayRef.current.value, 'yyyy-MM-dd', new Date());
      if (isValid(newDate)) {
        const dateStr = format(newDate, 'yyyy-MM-dd');
        const updatedHolidays = [...new Set([...(group.nonWorkingDays || []), dateStr])];
        
        const groupRef = doc(db, 'groups', group.id);
        const batch = writeBatch(db);
        batch.update(groupRef, { nonWorkingDays: updatedHolidays });
        await batch.commit();

        newHolidayRef.current.value = '';
        toast({title: "Holiday added", description: `${format(newDate, 'MMMM do, yyyy')} is now a non-working day.`});
      } else {
        toast({variant: 'destructive', title: "Invalid Date", description: "Please enter a valid date for the holiday."});
      }
    }
  };

  const handleRemoveHoliday = async (dateToRemove: string) => {
    if (!group) return;
    const updatedHolidays = (group.nonWorkingDays || []).filter(d => d !== dateToRemove);
    const groupRef = doc(db, 'groups', group.id);
    const batch = writeBatch(db);
    batch.update(groupRef, { nonWorkingDays: updatedHolidays });
    await batch.commit();
    toast({title: "Holiday removed"});
  };
  
  const handleAddEvent = async () => {
    if (newEventDateRef.current?.value && newEventDescRef.current?.value && group) {
      const newDate = parse(newEventDateRef.current.value, 'yyyy-MM-dd', new Date());
      const newDesc = newEventDescRef.current.value;
      if (isValid(newDate) && newDesc.trim() !== '') {
        const dateStr = format(newDate, 'yyyy-MM-dd');
        const updatedEvents = {...(group.specialEvents || {}), [dateStr]: newDesc };

        const groupRef = doc(db, 'groups', group.id);
        const batch = writeBatch(db);
        batch.update(groupRef, { specialEvents: updatedEvents });
        await batch.commit();

        newEventDateRef.current.value = '';
        newEventDescRef.current.value = '';
        toast({title: "Event added", description: `Added "${newDesc}" on ${format(newDate, 'MMMM do, yyyy')}.`});
      } else {
        toast({variant: 'destructive', title: "Invalid Event", description: "Please enter a valid date and description."});
      }
    }
  }

  const handleRemoveEvent = async (dateToRemove: string) => {
    if (!group) return;
    const newEvents = {...(group.specialEvents || {})};
    delete newEvents[dateToRemove];
    
    const groupRef = doc(db, 'groups', group.id);
    const batch = writeBatch(db);
    batch.update(groupRef, { specialEvents: newEvents });
    await batch.commit();

    toast({title: "Event removed"});
  }

  const handleSetInitialArrangement = async () => {
    if (!group || !isGroupReady) return;
    // Validation
    if (!initialArrangementDate) {
      toast({ variant: 'destructive', title: 'Please select a date.' });
      return;
    }
    const selectedDate = parse(initialArrangementDate, 'yyyy-MM-dd', new Date());
    if (!isValid(selectedDate)) {
      toast({ variant: 'destructive', title: 'Invalid date format.' });
      return;
    }
    if (Object.keys(initialArrangement).length !== seats.length) {
      toast({ variant: 'destructive', title: `Please assign all ${seats.length} seats.` });
      return;
    }
    const assignedFriends = Object.values(initialArrangement);
    if (new Set(assignedFriends).size !== friends.length) {
      toast({ variant: 'destructive', title: 'Each friend must be assigned to a unique seat.' });
      return;
    }

    setIsSettingInitial(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const newArrangement: Arrangement = {
        seats: initialArrangement, // Storing UIDs here
        comments: [{ user: 'ai_assistant', text: 'Initial arrangement set by group creator.', timestamp: new Date().toISOString() }],
        photos: [],
      };

      const groupRef = doc(db, 'groups', group.id);
      const batch = writeBatch(db);
      batch.update(groupRef, {
        [`arrangements.${dateStr}`]: newArrangement
      });
      await batch.commit();

      toast({
        title: 'Initial Arrangement Set!',
        description: `The first seating arrangement for ${format(selectedDate, 'MMMM do')} is ready.`,
      });
      // Reset form
      setInitialArrangement({});
      setInitialArrangementDate('');

    } catch (error) {
       console.error("Error setting initial arrangement:", error);
       toast({ variant: 'destructive', title: 'Error', description: 'Could not save the initial arrangement.' });
    } finally {
      setIsSettingInitial(false);
    }
  };

  const selectedArrangement = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return arrangements[dateStr] || { seats: {}, comments: [], photos: [] };
  }, [selectedDate, arrangements]);
  
  const currentUserProfile = useMemo(() => friends.find(f => f.uid === user?.uid), [friends, user]);
  const isCreator = useMemo(() => user?.uid === group?.members[0], [user, group]);
  const showInitialSetup = useMemo(() => {
    if (!group || !isCreator || !isGroupReady) return false;
    return Object.keys(arrangements).length === 0;
  }, [group, isCreator, isGroupReady, arrangements]);


  const sortedNonWorkingDays = useMemo(() => (group?.nonWorkingDays || []).sort((a,b) => a.localeCompare(b)), [group]);
  const sortedSpecialEvents = useMemo(() => Object.entries(group?.specialEvents || {}).sort(([a], [b]) => a.localeCompare(b)), [group]);

  if (loading || isDataLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your FairDesk dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header user={user} group={group} onLogout={handleLogout} />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        {!group ? (
          <NoGroupState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
               {showInitialSetup ? (
                <Card className="mb-8 bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3"><CalendarPlus /> Set Initial Arrangement</CardTitle>
                    <CardDescription>Your group is full! Set the first seating arrangement to get started.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="initial-date">Start Date</Label>
                      <Input id="initial-date" type="date" value={initialArrangementDate} onChange={e => setInitialArrangementDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {seats.map(seat => (
                        <div key={seat}>
                          <Label>{seat}</Label>
                          <Select
                            onValueChange={(friendUid) => setInitialArrangement(p => ({...p, [seat]: friendUid}))}
                            value={initialArrangement[seat] || ''}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select friend" />
                            </SelectTrigger>
                            <SelectContent>
                              {friends.map(friend => (
                                <SelectItem key={friend.uid} value={friend.uid}>
                                  {friend.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleSetInitialArrangement} disabled={isSettingInitial} className="w-full">
                      {isSettingInitial ? <Loader2 className="animate-spin" /> : 'Save Initial Arrangement'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                 <CalendarView
                  arrangements={arrangements}
                  onSelectDate={handleSelectDate}
                  nonWorkingDays={(group.nonWorkingDays || []).map(d => parseISO(d))}
                  specialEvents={group.specialEvents || {}}
                  friends={friends}
                />
              )}
            </div>
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>AI Seat Optimizer</CardTitle>
                  <CardDescription>
                    Generate a fair and optimized seat arrangement for the next working day.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleGenerate} disabled={isAiLoading || !isGroupReady || showInitialSetup} className="w-full text-lg py-6 rounded-xl">
                    {isAiLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    {isAiLoading ? 'Optimizing...' : "Generate Next Arrangement"}
                  </Button>
                  {!isGroupReady && group.seats.length > 0 && (
                    <p className="text-xs text-center mt-2 text-destructive">
                      Waiting for all friends to join. You need {group.seats.length} members, but have {friends.length}.
                    </p>
                  )}
                   {showInitialSetup && (
                    <p className="text-xs text-center mt-2 text-primary">
                      You must set the initial arrangement before using the AI optimizer.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Manage Holidays</CardTitle>
                    <CardDescription>Add or remove non-working days.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4 items-end">
                      <div className='flex-1'>
                         <Label htmlFor="new-holiday" className="text-xs text-muted-foreground">New Holiday Date</Label>
                         <Input id="new-holiday" type="date" ref={newHolidayRef} className="bg-input" />
                      </div>
                      <Button size="icon" onClick={handleAddHoliday}><PlusCircle /></Button>
                    </div>
                     <div className="max-h-32 overflow-y-auto space-y-2">
                      {sortedNonWorkingDays.map(day => (
                        <div key={day} className="flex justify-between items-center text-sm p-2 bg-secondary rounded-md">
                          <span>{format(parseISO(day), 'MMMM do, yyyy')}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveHoliday(day)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                 <Card>
                  <CardHeader>
                    <CardTitle>Manage Special Events</CardTitle>
                    <CardDescription>Add events that might affect seating.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-2 items-end">
                       <div className='flex-1'>
                          <Label htmlFor="new-event-date" className="text-xs text-muted-foreground">Event Date</Label>
                          <Input id="new-event-date" type="date" ref={newEventDateRef} className="bg-input" />
                       </div>
                      <Button size="icon" onClick={handleAddEvent}><PlusCircle /></Button>
                    </div>
                     <div className='mb-4'>
                        <Label htmlFor="new-event-desc" className="text-xs text-muted-foreground">Event Description</Label>
                        <Input id="new-event-desc" placeholder="e.g. Thanksgiving Day Trip" ref={newEventDescRef} className="bg-input" />
                     </div>
                     <div className="max-h-32 overflow-y-auto space-y-2">
                      {sortedSpecialEvents.map(([date, desc]) => (
                        <div key={date} className="flex justify-between items-center text-sm p-2 bg-secondary rounded-md">
                          <div>
                            <p className="font-semibold">{format(parseISO(date), 'MMMM do, yyyy')}</p>
                            <p className="text-muted-foreground">{desc}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveEvent(date)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <FairnessStats arrangements={arrangements} friends={friends} seats={seats} />
            </div>
          </div>
        )}
      </main>
      {selectedDate && user && currentUserProfile && group && (
        <DayDetails
          isOpen={isSheetOpen}
          onClose={handleSheetClose}
          date={selectedDate}
          arrangement={selectedArrangement}
          onUpdateArrangement={handleUpdateArrangement}
          friends={friends}
          seats={seats}
          currentUser={currentUserProfile}
        />
      )}
    </div>
  );
}

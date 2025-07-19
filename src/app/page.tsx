'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, isWeekend, parseISO, addDays, isValid, parse } from 'date-fns';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';

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

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [seats] = useState(['Driver', 'Shotgun', 'Backseat']);

  const [arrangements, setArrangements] = useState<Arrangements>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const newHolidayRef = useRef<HTMLInputElement>(null);
  const newEventDateRef = useRef<HTMLInputElement>(null);
  const newEventDescRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (!userData.groupId) {
          router.push('/group-setup');
          return;
        }
        
        // Unsubscribe from previous group listener if groupId changes
        const groupUnsub = onSnapshot(doc(db, 'groups', userData.groupId), (groupDoc) => {
            if (groupDoc.exists()) {
                const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
                setGroup(groupData);
                fetchFriends(groupData.members);
                setArrangements(groupData.arrangements || {});
                setIsDataLoading(false);
            } else {
                // Handle case where group is deleted
                toast({ variant: 'destructive', title: 'Group not found.' });
                router.push('/group-setup');
            }
        });

        return () => groupUnsub(); // Cleanup group listener

      } else {
         // This case might happen if user record is deleted from Firestore but auth remains
        toast({ variant: 'destructive', title: 'User profile not found.' });
        router.push('/login');
      }
    });

    return () => unsub(); // Cleanup user listener
    
  }, [user, loading, router, toast]);

  const fetchFriends = async (memberIds: string[]) => {
      if (memberIds.length === 0) {
        setFriends([]);
        return;
      }
      const friendProfiles = await Promise.all(
          memberIds.map(async (id) => {
              const userDoc = await getDoc(doc(db, 'users', id));
              return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as UserProfile : null;
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

  const handleGenerate = async () => {
    if (!group || friends.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Group Not Full',
        description: 'You need 3 friends in the group to generate arrangements.',
      });
      return;
    }
    setIsAiLoading(true);
    try {
      const pastArrangementsForAI = Object.entries(arrangements).map(([date, arrangement]) => ({
        date,
        seats: seats.map(seat => arrangement.seats[seat]),
      }));

      const result = await optimizeSeatingArrangement({
        friends: friends.map(f => f.displayName),
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
        seats: {
          [seats[0]]: result.arrangement[0],
          [seats[1]]: result.arrangement[1],
          [seats[2]]: result.arrangement[2],
        },
        comments: [{ user: 'AI Assistant', text: result.reasoning, timestamp: new Date().toISOString() }],
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
        const updatedHolidays = [...(group.nonWorkingDays || []), dateStr];
        
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

  const selectedArrangement = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return arrangements[dateStr] || { seats: {}, comments: [], photos: [] };
  }, [selectedDate, arrangements]);
  
  const currentUserProfile = useMemo(() => friends.find(f => f.uid === user?.uid), [friends, user]);

  const sortedNonWorkingDays = useMemo(() => (group?.nonWorkingDays || []).sort((a,b) => a.localeCompare(b)), [group]);
  const sortedSpecialEvents = useMemo(() => Object.entries(group?.specialEvents || {}).sort(([a], [b]) => a.localeCompare(b)), [group]);

  if (loading || isDataLoading || !user || !group) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your FairSeat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header user={user} group={group} onLogout={handleLogout} />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <CalendarView
              arrangements={arrangements}
              onSelectDate={handleSelectDate}
              nonWorkingDays={(group.nonWorkingDays || []).map(d => parseISO(d))}
              specialEvents={group.specialEvents || {}}
              friends={friends}
            />
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
                <Button onClick={handleGenerate} disabled={isAiLoading || friends.length < 3} className="w-full text-lg py-6 rounded-xl">
                  {isAiLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isAiLoading ? 'Optimizing...' : "Generate Next Arrangement"}
                </Button>
                {friends.length < 3 && (
                  <p className="text-xs text-center mt-2 text-destructive">
                    You need 3 members in your group to generate seats. Your group has {friends.length}.
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
      </main>
      {selectedDate && user && currentUserProfile && (
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

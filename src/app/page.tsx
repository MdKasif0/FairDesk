'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays, isWeekend, parseISO, addDays, isValid, parse } from 'date-fns';
import { Loader2, PlusCircle, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { optimizeSeatingArrangement } from '@/ai/flows/optimize-seating-arrangement';

import { Header } from '@/components/app/header';
import { CalendarView } from '@/components/app/calendar-view';
import { DayDetails } from '@/components/app/day-details';
import { FairnessStats } from '@/components/app/fairness-stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Arrangements, Arrangement } from '@/types';
import { Label } from '@/components/ui/label';

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();

  const [friends, setFriends] = useState<string[]>([]);
  const [user, setUser] = useState<string | null>(null);
  const [group, setGroup] = useState<{name: string, inviteCode: string, members: string[]} | null>(null);

  const [seats] = useState(['Driver', 'Shotgun', 'Backseat']);
  const [arrangements, setArrangements] = useState<Arrangements>({});
  const [nonWorkingDays, setNonWorkingDays] = useState<string[]>(['2024-12-25']);
  const [specialEvents, setSpecialEvents] = useState<Record<string, string>>({ '2024-11-28': 'Thanksgiving Day Trip' });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);


  const newHolidayRef = useRef<HTMLInputElement>(null);
  const newEventDateRef = useRef<HTMLInputElement>(null);
  const newEventDescRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setIsClient(true);
    const loggedInUser = localStorage.getItem('fairseat_user');
    const groupDataStr = localStorage.getItem('fairseat_group');

    if (!loggedInUser || !groupDataStr) {
      router.push('/login');
      return;
    }
    
    setUser(loggedInUser);
    
    try {
        const groupData = JSON.parse(groupDataStr);
        setGroup(groupData);
        setFriends(groupData.members);

        if (groupData.members.length < 3) {
            toast({
                title: 'Waiting for friends',
                description: `Invite others with code: ${groupData.inviteCode}. You have ${groupData.members.length}/3 members.`,
            });
        }
        
    } catch(e) {
        toast({variant: 'destructive', title: 'Could not load group data'});
        localStorage.removeItem('fairseat_group');
        router.push('/login');
    }

  }, [router, toast]);


  useEffect(() => {
    if (friends.length === 0) return;

    const mockArrangements: Arrangements = {};
    const today = new Date();
    for (let i = 1; i < 30; i++) {
      const date = subDays(today, i);
      if (!isWeekend(date)) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const arrangement: Arrangement = {
          seats: {
            [seats[0]]: friends[i % friends.length],
            [seats[1]]: friends[(i + 1) % friends.length],
            [seats[2]]: friends[(i + 2) % friends.length],
          },
          comments: [],
          photos: [],
        };
        mockArrangements[dateStr] = arrangement;
      }
    }
    setArrangements(mockArrangements);
  }, [friends, seats]);

  const handleLogout = () => {
    localStorage.removeItem('fairseat_user');
    localStorage.removeItem('fairseat_group');
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
    if (friends.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Group Not Full',
        description: 'You need 3 friends in the group to generate arrangements.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const pastArrangementsForAI = Object.entries(arrangements).map(([date, arrangement]) => ({
        date,
        seats: seats.map(seat => arrangement.seats[seat]),
      }));

      const result = await optimizeSeatingArrangement({
        friends,
        nonWorkingDays,
        specialEvents,
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

      setArrangements(prev => ({
        ...prev,
        [result.nextWorkingDay!]: {
          seats: {
            [seats[0]]: result.arrangement[0],
            [seats[1]]: result.arrangement[1],
            [seats[2]]: result.arrangement[2],
          },
          comments: [{ user: 'AI Assistant', text: result.reasoning, timestamp: new Date().toISOString() }],
          photos: [],
        },
      }));

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
      setIsLoading(false);
    }
  };

  const handleUpdateArrangement = (date: Date, updatedArrangement: Arrangement) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setArrangements(prev => ({
      ...prev,
      [dateStr]: updatedArrangement,
    }));
  };
  
  const handleAddHoliday = () => {
    if (newHolidayRef.current?.value) {
      const newDate = parse(newHolidayRef.current.value, 'yyyy-MM-dd', new Date());
      if (isValid(newDate)) {
        const dateStr = format(newDate, 'yyyy-MM-dd');
        if (!nonWorkingDays.includes(dateStr)) {
          setNonWorkingDays([...nonWorkingDays, dateStr]);
          newHolidayRef.current.value = '';
          toast({title: "Holiday added", description: `${format(newDate, 'MMMM do, yyyy')} is now a non-working day.`});
        }
      } else {
        toast({variant: 'destructive', title: "Invalid Date", description: "Please enter a valid date for the holiday."});
      }
    }
  };

  const handleRemoveHoliday = (dateToRemove: string) => {
    setNonWorkingDays(nonWorkingDays.filter(d => d !== dateToRemove));
    toast({title: "Holiday removed"});
  };
  
  const handleAddEvent = () => {
    if (newEventDateRef.current?.value && newEventDescRef.current?.value) {
      const newDate = parse(newEventDateRef.current.value, 'yyyy-MM-dd', new Date());
      const newDesc = newEventDescRef.current.value;
      if (isValid(newDate) && newDesc.trim() !== '') {
        const dateStr = format(newDate, 'yyyy-MM-dd');
        setSpecialEvents({...specialEvents, [dateStr]: newDesc });
        newEventDateRef.current.value = '';
        newEventDescRef.current.value = '';
        toast({title: "Event added", description: `Added "${newDesc}" on ${format(newDate, 'MMMM do, yyyy')}.`});
      } else {
        toast({variant: 'destructive', title: "Invalid Event", description: "Please enter a valid date and description."});
      }
    }
  }

  const handleRemoveEvent = (dateToRemove: string) => {
    const newEvents = {...specialEvents};
    delete newEvents[dateToRemove];
    setSpecialEvents(newEvents);
    toast({title: "Event removed"});
  }

  const selectedArrangement = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return arrangements[dateStr] || { seats: {}, comments: [], photos: [] };
  }, [selectedDate, arrangements]);

  const sortedNonWorkingDays = useMemo(() => nonWorkingDays.sort((a,b) => a.localeCompare(b)), [nonWorkingDays]);
  const sortedSpecialEvents = useMemo(() => Object.entries(specialEvents).sort(([a], [b]) => a.localeCompare(b)), [specialEvents]);

  if (!isClient || !user || !group) {
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
              nonWorkingDays={nonWorkingDays.map(d => parseISO(d))}
              specialEvents={specialEvents}
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
                <Button onClick={handleGenerate} disabled={isLoading || friends.length < 3} className="w-full text-lg py-6 rounded-xl">
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isLoading ? 'Optimizing...' : "Generate Next Arrangement"}
                </Button>
                {friends.length < 3 && (
                  <p className="text-xs text-center mt-2 text-destructive">
                    You need 3 members in your group to generate seats.
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
      {selectedDate && user && (
        <DayDetails
          isOpen={isSheetOpen}
          onClose={handleSheetClose}
          date={selectedDate}
          arrangement={selectedArrangement}
          onUpdateArrangement={handleUpdateArrangement}
          friends={friends}
          seats={seats}
          currentUser={user}
        />
      )}
    </div>
  );
}

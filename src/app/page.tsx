'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, subDays, isWeekend, parseISO, addDays, isValid } from 'date-fns';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
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

export default function Home() {
  const { toast } = useToast();

  const [friends] = useState(['Alice', 'Bob', 'Charlie']);
  const [seats] = useState(['Driver', 'Shotgun', 'Backseat']);
  const [arrangements, setArrangements] = useState<Arrangements>({});
  const [nonWorkingDays, setNonWorkingDays] = useState<string[]>(['2024-12-25']);
  const [specialEvents, setSpecialEvents] = useState<Record<string, string>>({ '2024-11-28': 'Thanksgiving Day Trip' });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const newHolidayRef = useRef<HTMLInputElement>(null);
  const newEventDateRef = useRef<HTMLInputElement>(null);
  const newEventDescRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mockArrangements: Arrangements = {};
    const today = new Date();
    for (let i = 1; i < 30; i++) {
      const date = subDays(today, i);
      if (!isWeekend(date)) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const arrangement: Arrangement = {
          seats: {
            [seats[0]]: friends[i % 3],
            [seats[1]]: friends[(i + 1) % 3],
            [seats[2]]: friends[(i + 2) % 3],
          },
          comments: [],
          photos: [],
        };
        mockArrangements[dateStr] = arrangement;
      }
    }
    setArrangements(mockArrangements);
  }, [friends, seats]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setSelectedDate(null);
  };

  const handleGenerate = async () => {
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
        description: `A new seating arrangement has been generated for ${format(parseISO(result.nextWorkingDay), 'MMMM do')}.`,
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
    if (newHolidayRef.current) {
      const newDate = parseISO(newHolidayRef.current.value);
      if (isValid(newDate)) {
        const dateStr = format(newDate, 'yyyy-MM-dd');
        if (!nonWorkingDays.includes(dateStr)) {
          setNonWorkingDays([...nonWorkingDays, dateStr]);
          newHolidayRef.current.value = '';
        }
      }
    }
  };

  const handleRemoveHoliday = (dateToRemove: string) => {
    setNonWorkingDays(nonWorkingDays.filter(d => d !== dateToRemove));
  };
  
  const handleAddEvent = () => {
    if (newEventDateRef.current && newEventDescRef.current) {
      const newDate = parseISO(newEventDateRef.current.value);
      const newDesc = newEventDescRef.current.value;
      if (isValid(newDate) && newDesc.trim() !== '') {
        const dateStr = format(newDate, 'yyyy-MM-dd');
        setSpecialEvents({...specialEvents, [dateStr]: newDesc });
        newEventDateRef.current.value = '';
        newEventDescRef.current.value = '';
      }
    }
  }

  const handleRemoveEvent = (dateToRemove: string) => {
    const newEvents = {...specialEvents};
    delete newEvents[dateToRemove];
    setSpecialEvents(newEvents);
  }

  const selectedArrangement = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return arrangements[dateStr] || { seats: {}, comments: [], photos: [] };
  }, [selectedDate, arrangements]);

  const sortedNonWorkingDays = useMemo(() => nonWorkingDays.sort(), [nonWorkingDays]);
  const sortedSpecialEvents = useMemo(() => Object.entries(specialEvents).sort(([a], [b]) => a.localeCompare(b)), [specialEvents]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <CalendarView
              arrangements={arrangements}
              onSelectDate={handleSelectDate}
              nonWorkingDays={nonWorkingDays.map(d => parseISO(d))}
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
                <Button onClick={handleGenerate} disabled={isLoading} className="w-full text-lg py-6 rounded-xl">
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isLoading ? 'Optimizing...' : "Generate Next Arrangement"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Holidays</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Input type="date" ref={newHolidayRef} className="bg-input" />
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
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-2">
                    <Input type="date" ref={newEventDateRef} className="bg-input" />
                    <Button size="icon" onClick={handleAddEvent}><PlusCircle /></Button>
                  </div>
                  <Input placeholder="Event description..." ref={newEventDescRef} className="bg-input mb-4" />
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
      {selectedDate && (
        <DayDetails
          isOpen={isSheetOpen}
          onClose={handleSheetClose}
          date={selectedDate}
          arrangement={selectedArrangement}
          onUpdateArrangement={handleUpdateArrangement}
          friends={friends}
          seats={seats}
        />
      )}
    </div>
  );
}

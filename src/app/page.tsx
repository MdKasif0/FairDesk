'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays, isWeekend, parseISO, addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { optimizeSeatingArrangement } from '@/ai/flows/optimize-seating-arrangement';

import { Header } from '@/components/app/header';
import { CalendarView } from '@/components/app/calendar-view';
import { DayDetails } from '@/components/app/day-details';
import { FairnessStats } from '@/components/app/fairness-stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Arrangements, Arrangement, OverrideRequest } from '@/types';

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
      let nextDay = addDays(new Date(), 1);
      while (isWeekend(nextDay) || nonWorkingDays.includes(format(nextDay, 'yyyy-MM-dd'))) {
        nextDay = addDays(nextDay, 1);
      }
      const nextDayStr = format(nextDay, 'yyyy-MM-dd');

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

      setArrangements(prev => ({
        ...prev,
        [nextDayStr]: {
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
        description: `A new seating arrangement has been generated for ${format(nextDay, 'MMMM do')}.`,
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

  const selectedArrangement = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return arrangements[dateStr] || { seats: {}, comments: [], photos: [] };
  }, [selectedDate, arrangements]);

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

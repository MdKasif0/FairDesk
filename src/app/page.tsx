'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, subDays, isWeekend, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { optimizeSeatingArrangement } from '@/ai/flows/optimize-seating-arrangement';

import { Header } from '@/components/app/header';
import { CalendarView } from '@/components/app/calendar-view';
import { DayDetails } from '@/components/app/day-details';
import { FairnessStats } from '@/components/app/fairness-stats';
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
    for (let i = 1; i < 15; i++) {
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
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

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
        [todayStr]: {
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
        description: "A new seating arrangement has been generated for today.",
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
    return arrangements[dateStr] || null;
  }, [selectedDate, arrangements]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          <div className="xl:col-span-2">
            <CalendarView
              arrangements={arrangements}
              onSelectDate={handleSelectDate}
              nonWorkingDays={nonWorkingDays.map(d => parseISO(d))}
            />
          </div>
          <div className="space-y-8 xl:sticky xl:top-24">
            <div className="bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">AI Seat Optimizer</h2>
              <p className="text-muted-foreground mb-4">
                Click the button to get a fair and optimized seat arrangement for the next working day.
              </p>
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Optimizing...' : "Optimize for Next Day"}
              </Button>
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

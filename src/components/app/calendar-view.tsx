'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isWeekend, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Arrangements } from '@/types';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface CalendarViewProps {
  arrangements: Arrangements;
  onSelectDate: (date: Date) => void;
  nonWorkingDays?: Date[];
}

export function CalendarView({ arrangements, onSelectDate, nonWorkingDays = [] }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth),
    end: endOfWeek(lastDayOfMonth),
  });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const getFriendInitial = (name: string) => name ? name.charAt(0).toUpperCase() : <User className="h-4 w-4" />;
  
  const getAvatarColor = (name: string) => {
    const colors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  }


  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline text-2xl">
          {format(currentDate, 'MMMM yyyy')}
        </CardTitle>
        <div className="space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const arrangement = arrangements[dateStr];
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isNonWorking = nonWorkingDays.some(d => isSameDay(d, day)) || isWeekend(day);

            return (
              <div
                key={day.toString()}
                className={cn(
                  'relative aspect-square rounded-lg border p-2 text-left flex flex-col transition-all duration-200 ease-in-out',
                  isCurrentMonth ? 'bg-card' : 'bg-muted/50 text-muted-foreground',
                  !isNonWorking && arrangement && 'cursor-pointer hover:border-primary hover:shadow-lg',
                  isToday(day) && 'border-2 border-primary',
                  isNonWorking && 'bg-muted/30 text-muted-foreground/70'
                )}
                onClick={() => !isNonWorking && arrangement && onSelectDate(day)}
              >
                <div className={cn(
                    "font-bold",
                    isToday(day) ? "text-primary" : ""
                )}>{format(day, 'd')}</div>

                {arrangement ? (
                  <div className="mt-1 flex-1 flex flex-col justify-end space-y-1">
                    {Object.entries(arrangement.seats).map(([seat, friend]) => (
                      <div key={seat} className="flex items-center gap-1.5 text-xs">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className={cn("text-xs text-white", getAvatarColor(friend))}>
                            {getFriendInitial(friend)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{friend}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  isCurrentMonth && !isNonWorking && (
                     <div className="flex-1 flex items-center justify-center">
                        <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                     </div>
                  )
                )}
                
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

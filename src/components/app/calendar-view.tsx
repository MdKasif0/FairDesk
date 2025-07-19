'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isWeekend, isToday, startOfWeek, endOfWeek, getMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, User, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Arrangements } from '@/types';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface CalendarViewProps {
  arrangements: Arrangements;
  onSelectDate: (date: Date) => void;
  nonWorkingDays?: Date[];
  specialEvents?: Record<string, string>;
}

export function CalendarView({ arrangements, onSelectDate, nonWorkingDays = [], specialEvents = {} }: CalendarViewProps) {
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
    if (!name) return 'bg-gray-400';
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  }


  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">
          {format(currentDate, 'MMMM yyyy')}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={handleNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground pb-2 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const arrangement = arrangements[dateStr];
            const isCurrentMonth = getMonth(day) === getMonth(currentDate);
            const isNonWorking = nonWorkingDays.some(d => isSameDay(d, day)) || isWeekend(day);
            const isSpecialEvent = !!specialEvents[dateStr];

            return (
              <div
                key={day.toString()}
                className={cn(
                  'relative aspect-square border-r border-b p-2 text-left flex flex-col transition-colors duration-200',
                  isCurrentMonth ? 'bg-card' : 'bg-secondary/50',
                  !isNonWorking && 'cursor-pointer hover:bg-secondary',
                  isToday(day) && 'bg-accent/10',
                  isNonWorking && 'bg-muted/30 text-muted-foreground/50'
                )}
                onClick={() => !isNonWorking && onSelectDate(day)}
              >
                <div className="flex justify-between items-center">
                  <div className={cn(
                    "font-semibold text-sm",
                    isToday(day) ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {format(day, 'd')}
                  </div>
                   {isSpecialEvent && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                           <Star className="h-4 w-4 text-yellow-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{specialEvents[dateStr]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                   )}
                </div>

                {arrangement ? (
                  <TooltipProvider>
                    <div className="mt-1 flex-1 flex flex-col justify-end items-start space-y-1">
                      {Object.entries(arrangement.seats).map(([seat, friend]) => (
                        <Tooltip key={seat}>
                          <TooltipTrigger asChild>
                            <Avatar className="h-6 w-6 border-2 border-white dark:border-card">
                              <AvatarFallback className={cn("text-xs text-white", getAvatarColor(friend))}>
                                {getFriendInitial(friend)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{friend} - {seat}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                ) : (
                  isCurrentMonth && !isNonWorking && (
                     <div className="flex-1 flex items-center justify-center">
                        <Badge variant="outline" className="text-xs font-normal">Unassigned</Badge>
                     </div>
                  )
                )}
                 {nonWorkingDays.some(d => isSameDay(d, day)) && (
                    <div className="absolute inset-0 bg-destructive/10"></div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

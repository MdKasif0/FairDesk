'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Arrangements } from '@/types';
import { TrendingUp, Percent } from 'lucide-react';

interface FairnessStatsProps {
  arrangements: Arrangements;
  friends: string[];
  seats: string[];
}

export function FairnessStats({ arrangements, friends, seats }: FairnessStatsProps) {
  const stats = useMemo(() => {
    const initialStats: Record<string, Record<string, number>> = {};
    friends.forEach(friend => {
      initialStats[friend] = {};
      seats.forEach(seat => {
        initialStats[friend][seat] = 0;
      });
    });

    Object.values(arrangements).forEach(arrangement => {
      Object.entries(arrangement.seats).forEach(([seat, friend]) => {
        if (initialStats[friend] && initialStats[friend][seat] !== undefined) {
          initialStats[friend][seat]++;
        }
      });
    });

    return initialStats;
  }, [arrangements, friends, seats]);

  const totalAssignments = useMemo(() => Object.values(arrangements).length, [arrangements]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-3 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>Fairness Statistics</CardTitle>
            <CardDescription>How often each person has had each seat.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Friend</TableHead>
                {seats.map(seat => <TableHead key={seat} className="text-right font-bold">{seat}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {friends.map(friend => (
                <TableRow key={friend}>
                  <TableCell className="font-medium">{friend}</TableCell>
                  {seats.map(seat => (
                    <TableCell key={seat} className="text-right">
                      <Badge variant="secondary" className="text-sm font-mono">{stats[friend]?.[seat] || 0}</Badge>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center text-sm text-muted-foreground p-3 bg-secondary rounded-lg">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span>Seat Distribution</span>
            </div>
            <span className="font-semibold text-foreground">{totalAssignments} total assignments</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

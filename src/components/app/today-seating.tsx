
// src/components/app/today-seating.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { getFriendInitial } from '@/lib/utils';
import type { Arrangement, UserProfile } from '@/types';
import { Armchair } from 'lucide-react';

interface TodaySeatingProps {
  arrangement: Arrangement | null;
  getFriendById: (uid: string) => UserProfile | undefined;
  seats: string[];
}


export function TodaySeating({ arrangement, getFriendById, seats }: TodaySeatingProps) {
    const seatingData = arrangement ? Object.entries(arrangement.seats) : [];
    
  return (
    <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4">
      {seatingData.length > 0 ? (
        seats.map((seat) => {
          const friendUid = arrangement?.seats[seat];
          if (!friendUid) {
            return (
              <Card key={seat} className="flex-shrink-0 w-36 rounded-2xl shadow-md bg-gray-100">
                <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                    <Armchair className="h-12 w-12 mb-2 text-gray-400"/>
                    <h3 className="font-bold text-sm text-muted-foreground">Empty</h3>
                    <p className="text-xs text-muted-foreground">{seat}</p>
                </div>
              </Card>
            )
          }

          const friend = getFriendById(friendUid);
          if (!friend) return null;

          return (
            <Card key={seat} className={`flex-shrink-0 w-36 rounded-2xl shadow-md bg-blue-100`}>
                <div className="flex flex-col items-center p-4 text-center">
                    <Avatar className="h-20 w-20 mb-2 border-4 border-white">
                        <AvatarImage src={friend.photoURL || undefined} alt={friend.displayName}/>
                        <AvatarFallback className="text-3xl bg-gray-200">{getFriendInitial(friend.displayName)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-sm truncate w-full">{friend.displayName}</h3>
                    <p className="text-xs text-muted-foreground">{seat}</p>
                </div>
            </Card>
          );
        })
      ) : (
        <Card className="flex-shrink-0 w-full rounded-2xl shadow-md bg-gray-50">
           <div className="p-6 text-center text-muted-foreground">
             No seating arrangement for today.
           </div>
        </Card>
      )} 
    </div>
  );
}

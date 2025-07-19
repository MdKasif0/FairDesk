// src/components/app/today-seating.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { getFriendInitial } from '@/lib/utils';
import type { Arrangement, UserProfile } from '@/types';
import NextImage from 'next/image';

interface TodaySeatingProps {
  arrangement: Arrangement | null;
  getFriendById: (uid: string) => UserProfile | undefined;
  seats: string[];
}

const placeholderAvatars = [
    { name: 'Alice Smith', desk: 'Desk 14', color: 'bg-green-100', image: '/avatars/woman1.png' },
    { name: 'Bob Johnson', desk: 'Desk 23', color: 'bg-orange-100', image: '/avatars/man1.png' },
    { name: 'Charlie Brown', desk: 'Desk 8', color: 'bg-blue-100', image: '/avatars/man2.png' },
];

export function TodaySeating({ arrangement, getFriendById, seats }: TodaySeatingProps) {
    const seatingData = arrangement ? Object.entries(arrangement.seats) : [];
    
  return (
    <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4">
      {placeholderAvatars.map((person, index) => (
         <Card key={index} className={`flex-shrink-0 w-36 rounded-2xl shadow-md ${person.color}`}>
            <div className="flex flex-col items-center p-4 text-center">
                 <div className="relative h-20 w-20 mb-2">
                    <NextImage src={person.image} layout="fill" alt={person.name} className="rounded-full object-cover" data-ai-hint="portrait" />
                </div>
                <h3 className="font-bold text-sm">{person.name}</h3>
                <p className="text-xs text-muted-foreground">{person.desk}</p>
            </div>
         </Card>
      ))}
      {/* 
      // This is the original logic. Re-enable when data is ready.
      {seatingData.length > 0 ? (
        seatingData.map(([seat, friendUid], index) => {
          const friend = getFriendById(friendUid);
          if (!friend) return null;
          return (
            <Card key={seat} className={`flex-shrink-0 w-36 rounded-2xl shadow-md bg-blue-100`}>
                <div className="flex flex-col items-center p-4 text-center">
                    <Avatar className="h-20 w-20 mb-2">
                        <AvatarImage src={friend.photoURL || undefined} alt={friend.displayName}/>
                        <AvatarFallback className="text-3xl bg-gray-200">{getFriendInitial(friend.displayName)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-sm">{friend.displayName}</h3>
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
      */}
    </div>
  );
}


'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader2, History as HistoryIcon } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Group, UserProfile, Arrangement } from '@/types';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DayDetails } from '@/components/app/day-details';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFriendInitial } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.groupId) {
          const unsubGroup = onSnapshot(doc(db, 'groups', userData.groupId), (groupDoc) => {
            if (groupDoc.exists()) {
              const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
              setGroup(groupData);
              
              if (groupData.members && groupData.members.length > 0) {
                 Promise.all(groupData.members.map(id => getDoc(doc(db, 'users', id))))
                    .then(docs => {
                        const memberProfiles = docs.map(d => d.data() as UserProfile).filter(Boolean);
                        setFriends(memberProfiles);
                    });
              } else {
                setFriends([]);
              }
            } else {
                 setGroup(null);
                 setFriends([]);
            }
            setIsDataLoading(false);
          });
          return () => unsubGroup();
        } else {
          setGroup(null);
          setFriends([]);
          setIsDataLoading(false);
        }
      } else {
        setIsDataLoading(false);
      }
    });

    return () => unsubUser();
  }, [user, loading, router]);


  if (loading || isDataLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading History...</p>
      </div>
    );
  }
  
  if (!group) {
    router.push('/group-setup');
    return null;
  }
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsSheetOpen(true);
  }

  const handleUpdateArrangement = async (date: Date, updatedArrangement: Arrangement) => {
    if (!group) return;
    const dateKey = `arrangements.${format(date, 'yyyy-MM-dd')}`;
    try {
        await updateDoc(doc(db, 'groups', group.id), {
            [dateKey]: updatedArrangement
        });
    } catch(e) {
        console.error("Failed to update arrangement", e);
        toast({variant: 'destructive', title: "Error", description: "Could not save changes."})
    }
  }
  
  const arrangements = group?.arrangements || {};
  const sortedArrangements = Object.entries(arrangements)
    .sort(([dateA], [dateB]) => parseISO(dateB).getTime() - parseISO(dateA).getTime());

  const selectedArrangement = arrangements[selectedDateStr] || { seats: {}, comments: [], photos: [] };
  const currentUserProfile = friends.find(f => f.uid === user?.uid);
  const findFriendById = (uid: string) => friends.find(f => f.uid === uid);

  return (
    <>
      <main className="p-4 md:p-6 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">History</h1>
        <div className="space-y-4">
            {sortedArrangements.length > 0 ? (
                sortedArrangements.map(([date, arrangement]) => (
                    <Card key={date} className="cursor-pointer" onClick={() => handleDateSelect(parseISO(date))}>
                        <CardHeader>
                            <CardTitle>{format(parseISO(date), 'eeee, MMMM do, yyyy')}</CardTitle>
                             {arrangement.override && <Badge variant={arrangement.override.status === 'approved' ? 'default' : 'secondary'} className="w-fit mt-1">{arrangement.override.status}</Badge>}
                        </CardHeader>
                        <CardContent>
                            <div className="flex -space-x-2 overflow-hidden">
                                {Object.values(arrangement.seats).map(friendUid => {
                                    const friend = findFriendById(friendUid);
                                    if (!friend) return null;
                                    return (
                                        <Avatar key={friendUid} className="inline-block h-8 w-8 rounded-full ring-2 ring-white">
                                            <AvatarImage src={friend.photoURL || undefined} />
                                            <AvatarFallback>{getFriendInitial(friend.displayName)}</AvatarFallback>
                                        </Avatar>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        <HistoryIcon className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-4">No past arrangements found.</p>
                    </CardContent>
                </Card>
            )}
        </div>
      </main>

      {currentUserProfile && (
        <DayDetails 
            isOpen={isSheetOpen}
            onClose={() => setIsSheetOpen(false)}
            date={selectedDate}
            arrangement={selectedArrangement}
            onUpdateArrangement={handleUpdateArrangement}
            friends={friends}
            seats={group.seats}
            currentUser={currentUserProfile}
        />
      )}
    </>
  );
}

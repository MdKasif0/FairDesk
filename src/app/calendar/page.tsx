
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { CalendarView } from '@/components/app/calendar-view';
import { DayDetails } from '@/components/app/day-details';
import type { Group, UserProfile, Arrangement } from '@/types';
import { format } from 'date-fns';


export default function CalendarPage() {
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
        <p className="mt-4 text-muted-foreground">Loading Calendar...</p>
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
  const selectedArrangement = arrangements[selectedDateStr] || { seats: {}, comments: [], photos: [] };
  const currentUserProfile = friends.find(f => f.uid === user?.uid);


  return (
    <>
      <main className="p-4 md:p-6 space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
        <CalendarView 
          arrangements={group.arrangements} 
          onSelectDate={handleDateSelect}
          friends={friends}
        />
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

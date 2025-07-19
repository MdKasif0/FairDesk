
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Loader2, DoorOpen, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { TodaySeating } from '@/components/app/today-seating';
import { ActionButtons } from '@/components/app/action-buttons';
import type { Group, UserProfile, Arrangements, Arrangement } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


function NoGroupState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center text-center p-4 min-h-[calc(100vh-160px)]">
      <div className="bg-gray-100 p-6 rounded-full mb-6">
        <DoorOpen className="h-16 w-16 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Welcome to FairDesk!</h2>
      <p className="text-base text-muted-foreground mt-2 max-w-md">
        Create a group to start managing seat arrangements, or join one with an invite link.
      </p>
      <div className="mt-8">
        <Button size="lg" onClick={() => router.push('/group-setup')}>
          Create or Join a Group
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [arrangements, setArrangements] = useState<Arrangements>({});
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const todayStr = useMemo(() => format(currentDate, 'yyyy-MM-dd'), [currentDate]);

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
              setArrangements(groupData.arrangements || {});
              
              if (groupData.members) {
                 Promise.all(groupData.members.map(id => getDoc(doc(db, 'users', id))))
                    .then(docs => {
                        const memberProfiles = docs.map(d => d.data() as UserProfile).filter(Boolean);
                        setFriends(memberProfiles);
                    });
              }
            }
            setIsDataLoading(false);
          });
          return () => unsubGroup();
        } else {
          setGroup(null);
          setFriends([]);
          setArrangements({});
          setIsDataLoading(false);
        }
      } else {
        setIsDataLoading(false);
      }
    });

    return () => unsubUser();
  }, [user, loading, router]);


  const todayArrangement: Arrangement | null = arrangements[todayStr] || null;

  if (loading || isDataLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }
  
  if (!group) {
    return <NoGroupState />;
  }
  
  const getFriendById = (uid: string) => friends.find(f => f.uid === uid);

  return (
    <main className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{format(currentDate, 'eeee, MMMM d, yyyy')}</h1>
        <h2 className="text-lg md:text-xl font-semibold text-muted-foreground mt-2">Today's Seating</h2>
      </div>

      <TodaySeating arrangement={todayArrangement} getFriendById={getFriendById} seats={group?.seats || []} />
      
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-base">Calendar Preview</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={(date) => date && setCurrentDate(date)}
            className="p-0"
            classNames={{
              root: 'w-full',
              months: "w-full",
              month: "w-full",
              table: 'w-full',
              head_row: 'flex justify-between',
              head_cell: 'w-auto text-muted-foreground uppercase text-xs font-medium',
              row: 'flex w-full mt-2 justify-between',
              cell: 'h-9 w-9 text-center text-sm p-0 relative',
              day: 'h-9 w-9 p-0 font-normal rounded-full',
              day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90',
              day_today: 'ring-2 ring-primary',
            }}
          />
          <div className="flex items-center justify-start gap-4 text-xs text-muted-foreground mt-4 flex-wrap">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>Notes</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span>Present</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span>Overrides</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300"></span>Locked</div>
          </div>
        </CardContent>
      </Card>
      
      <ActionButtons />

       <Card className="shadow-md rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between">
          <h3 className="font-semibold text-base">View Fairness Stats</h3>
          <Button variant="ghost" size="icon">
            <ChevronRight />
          </Button>
        </CardContent>
      </Card>

    </main>
  );
}

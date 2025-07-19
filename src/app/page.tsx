
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Loader2, DoorOpen, Calendar as CalendarIcon, ChevronRight, Shuffle, Settings2, Copy } from 'lucide-react';
import { onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { TodaySeating } from '@/components/app/today-seating';
import { DayDetails } from '@/components/app/day-details';
import type { Group, UserProfile, Arrangements, Arrangement } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { optimizeSeatingArrangement } from '@/ai/flows/optimize-seating-arrangement';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


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
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
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
  
  const handleOptimizeSeats = async () => {
    if (!group) return;
    setIsOptimizing(true);
    try {
      const pastArrangementsForAI = Object.entries(group.arrangements || {})
        .map(([date, arrangement]) => ({
          date,
          seats: group.seats.map(seat => {
            const friendUid = arrangement.seats[seat];
            const friend = friends.find(f => f.uid === friendUid);
            return friend?.displayName || 'Empty';
          })
        }));

      const input = {
        friends: friends.map(f => f.displayName),
        seats: group.seats,
        nonWorkingDays: group.nonWorkingDays || [],
        specialEvents: group.specialEvents || {},
        pastArrangements: pastArrangementsForAI,
      };

      const result = await optimizeSeatingArrangement(input);
      
      if (result.arrangement && result.nextWorkingDay) {
        const friendNameMap = new Map(friends.map(f => [f.displayName, f.uid]));
        const newSeats: Record<string, string> = {};
        
        group.seats.forEach((seat, index) => {
          const friendName = result.arrangement[index];
          const friendUid = friendNameMap.get(friendName);
          if (friendUid) {
            newSeats[seat] = friendUid;
          }
        });
        
        const newArrangement: Arrangement = {
          seats: newSeats,
          comments: [{
            user: 'ai_assistant',
            text: `Optimized Arrangement: ${result.reasoning}`,
            timestamp: new Date().toISOString()
          }],
          photos: [],
        };

        await handleUpdateArrangement(parseISO(result.nextWorkingDay), newArrangement);

        toast({
          title: 'Seating Optimized!',
          description: `New arrangement for ${format(parseISO(result.nextWorkingDay), 'MMMM do')} has been set.`,
        });
      } else {
         toast({ variant: 'destructive', title: 'Optimization Failed', description: result.reasoning });
      }

    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: e.message || "An AI error occurred." });
    } finally {
      setIsOptimizing(false);
    }
  }
  
  const handleCopyInviteLink = () => {
    if(!group) return;
    const inviteLink = `${window.location.origin}/join?groupId=${group.id}`;
    navigator.clipboard.writeText(inviteLink);
    toast({title: 'Invite link copied!', description: 'Share it with your friends to join.'})
  }

  const arrangements = group?.arrangements || {};
  const todayArrangement: Arrangement | null = arrangements[todayStr] || null;
  const selectedArrangement = arrangements[selectedDateStr] || { seats: {}, comments: [], photos: [] };
  const currentUserProfile = friends.find(f => f.uid === user?.uid);

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
    <>
      <main className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{format(new Date(), 'eeee, MMMM d, yyyy')}</h1>
          <h2 className="text-lg md:text-xl font-semibold text-muted-foreground mt-2">Today's Seating</h2>
        </div>

        <TodaySeating arrangement={todayArrangement} getFriendById={getFriendById} seats={group?.seats || []} />
        
        <Alert>
          <Shuffle className="h-4 w-4" />
          <AlertTitle>New Suggestions Available!</AlertTitle>
          <AlertDescription>
            <Button size="sm" className="mt-2" onClick={handleOptimizeSeats} disabled={isOptimizing}>
              {isOptimizing ? <Loader2 className="mr-2 animate-spin"/> : <Shuffle className="mr-2"/>}
              {isOptimizing ? 'Optimizing...' : 'Get Next Arrangement'}
            </Button>
          </AlertDescription>
        </Alert>

        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-base">Calendar Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/calendar')}>
                Full Calendar <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && handleDateSelect(date)}
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
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-2 gap-4">
           <Card className="shadow-md rounded-2xl">
            <CardContent className="p-3">
              <Button variant="ghost" className="w-full justify-start h-auto p-0" onClick={handleCopyInviteLink}>
                <div className={`p-2 rounded-lg bg-green-100 text-green-700`}>
                  <Copy className="h-5 w-5" />
                </div>
                <span className="ml-3 font-semibold text-sm">Copy Invite</span>
              </Button>
            </CardContent>
          </Card>
           <Card className="shadow-md rounded-2xl">
            <CardContent className="p-3">
              <Button variant="ghost" className="w-full justify-start h-auto p-0" onClick={() => router.push('/settings')}>
                <div className={`p-2 rounded-lg bg-blue-100 text-blue-700`}>
                  <Settings2 className="h-5 w-5" />
                </div>
                <span className="ml-3 font-semibold text-sm">Group Settings</span>
              </Button>
            </CardContent>
          </Card>
        </div>


        <Card className="shadow-md rounded-2xl" onClick={() => router.push('/stats')}>
          <CardContent className="p-4 flex items-center justify-between cursor-pointer">
            <h3 className="font-semibold text-base">View Fairness Stats</h3>
            <Button variant="ghost" size="icon">
              <ChevronRight />
            </Button>
          </CardContent>
        </Card>

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

// src/app/group-setup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { joinGroup } from '@/ai/flows/join-group';
import { Armchair, Loader2, LogOut, Users, PlusCircle, Trash2, Link as LinkIcon, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function GroupSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [groupName, setGroupName] = useState('');
  const [seats, setSeats] = useState<string[]>(['Seat 1', 'Seat 2', 'Seat 3']);
  const [isCreating, setIsCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSeatChange = (index: number, value: string) => {
    const newSeats = [...seats];
    newSeats[index] = value;
    setSeats(newSeats);
  };

  const addSeat = () => {
    setSeats([...seats, `Seat ${seats.length + 1}`]);
  };

  const removeSeat = (index: number) => {
    if (seats.length > 2) {
      const newSeats = seats.filter((_, i) => i !== index);
      setSeats(newSeats);
    } else {
      toast({ variant: 'destructive', title: 'Minimum of 2 seats required.' });
    }
  };
  
  const handleJoinWithLink = async () => {
    if (!user) return;
    if (!inviteLink) {
        toast({ variant: 'destructive', title: 'Invite link is required.' });
        return;
    }
    
    let groupId;
    try {
        const url = new URL(inviteLink);
        groupId = url.searchParams.get('groupId');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Invalid Link', description: 'Please paste a valid invite link.' });
        return;
    }

    if (!groupId) {
        toast({ variant: 'destructive', title: 'Invalid Link', description: 'The link does not contain a group ID.' });
        return;
    }

    setIsJoining(true);
    try {
        const result = await joinGroup({
          groupId,
          user: { uid: user.uid },
        });

        if (result.success) {
          toast({ title: 'Success!', description: result.message });
          router.push('/');
        } else {
          toast({ variant: 'destructive', title: 'Could not join group', description: result.message });
        }
    } catch (e: any) {
        console.error("Error joining group:", e);
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'An unexpected server error occurred.' });
    } finally {
        setIsJoining(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    if (!groupName) {
      toast({ variant: 'destructive', title: 'Group name is required.' });
      return;
    }
    if (seats.some((s) => s.trim() === '')) {
      toast({ variant: 'destructive', title: 'All seat names must be filled.' });
      return;
    }
    if (new Set(seats.map((s) => s.trim())).size !== seats.length) {
      toast({ variant: 'destructive', title: 'Seat names must be unique.' });
      return;
    }

    setIsCreating(true);
    try {
      const batch = writeBatch(db);

      const newGroupRef = doc(collection(db, 'groups'));

      batch.set(newGroupRef, {
        name: groupName,
        members: [user.uid],
        seats: seats.map((s) => s.trim()),
        arrangements: {},
        nonWorkingDays: [],
        specialEvents: {},
      });

      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, { groupId: newGroupRef.id });

      await batch.commit();

      toast({ title: 'Group created!', description: 'Your dashboard is ready.' });
      router.push('/');
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ variant: 'destructive', title: 'Could not create group.', description: 'Please check your Firestore rules.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
    toast({ title: 'Logged out successfully.' });
  };
  
  const handleGoToDashboard = () => {
    router.push('/');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg">
            <Armchair className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to FairDesk</h1>
            <p className="text-muted-foreground">{user?.displayName || user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Create a Group</CardTitle>
              <CardDescription>
                Start a new group and invite your friends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input id="group-name" placeholder="e.g. The Carpool Crew" value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={isCreating} />
                </div>
                <div>
                  <Label>Seats</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {seats.map((seat, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={seat} onChange={(e) => handleSeatChange(index, e.target.value)} disabled={isCreating} placeholder={`Seat ${index + 1}`} />
                        <Button variant="ghost" size="icon" onClick={() => removeSeat(index)} disabled={isCreating || seats.length <= 2}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={addSeat} disabled={isCreating}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Seat
                  </Button>
                </div>
                <Button onClick={handleCreateGroup} className="w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="mr-2 animate-spin" /> : <Users className="mr-2" />}
                  {isCreating ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>Join a Group</CardTitle>
                <CardDescription>
                  Have an invite link? Paste it here to join.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-link">Invite Link</Label>
                    <Input id="invite-link" placeholder="Paste invite link here" value={inviteLink} onChange={(e) => setInviteLink(e.target.value)} disabled={isJoining} />
                  </div>
                  <Button onClick={handleJoinWithLink} className="w-full" disabled={isJoining}>
                     {isJoining ? <Loader2 className="mr-2 animate-spin" /> : <LinkIcon className="mr-2" />}
                     {isJoining ? 'Joining...' : 'Join with Link'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl bg-card/50">
                <CardHeader>
                    <CardTitle>Not Ready?</CardTitle>
                     <CardDescription>
                      You can explore the dashboard first.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="secondary" className="w-full" onClick={handleGoToDashboard}>
                        <Home className="mr-2"/>
                        Go to Dashboard
                    </Button>
                </CardContent>
            </Card>
          </div>
        </div>

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

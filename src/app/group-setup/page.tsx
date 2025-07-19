// src/app/group-setup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Armchair, Loader2, LogOut, Users, PlusCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';

export default function GroupSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [groupName, setGroupName] = useState('');
  const [seats, setSeats] = useState<string[]>(['Seat 1', 'Seat 2', 'Seat 3']);
  const [isCreating, setIsCreating] = useState(false);

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

  const handleCreateGroup = async () => {
    if (!user) return;
    if (!groupName) {
      toast({ variant: 'destructive', title: 'Group name is required.' });
      return;
    }
     if (seats.some(s => s.trim() === '')) {
      toast({ variant: 'destructive', title: 'All seat names must be filled.' });
      return;
    }
    if (new Set(seats.map(s => s.trim())).size !== seats.length) {
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
        seats: seats.map(s => s.trim()),
        arrangements: {},
        nonWorkingDays: [],
        specialEvents: {}
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
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg">
            <Armchair className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome to FairDesk</h1>
            <p className="text-muted-foreground">{user.displayName || user.email}</p>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Create a Group</CardTitle>
            <CardDescription>
              To start assigning seats, you need to create a group and invite your friends.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              <div>
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="e.g. The Carpool Crew"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
               <div>
                <Label>Seats</Label>
                <div className="space-y-2">
                  {seats.map((seat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={seat}
                        onChange={(e) => handleSeatChange(index, e.target.value)}
                        disabled={isCreating}
                        placeholder={`Seat ${index + 1}`}
                      />
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
                {isCreating ? <Loader2 className="mr-2" /> : <Users className="mr-2" />}
                {isCreating ? 'Creating...' : 'Create Group and Get Invite Link'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="text-center mt-4">
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
        </div>
      </div>
    </div>
  );
}

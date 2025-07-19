// src/app/group-setup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Armchair, Loader2, LogOut, Users, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth } from '@/lib/firebase';

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function GroupSetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateGroup = async () => {
    if (!user) return;
    if (!groupName) {
      toast({ variant: 'destructive', title: 'Group name is required.' });
      return;
    }
    setIsCreating(true);
    try {
      const newInviteCode = generateInviteCode();
      const batch = writeBatch(db);

      // 1. Create the new group document
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: groupName,
        inviteCode: newInviteCode,
        members: [user.uid],
        arrangements: {},
        nonWorkingDays: [],
        specialEvents: {}
      });

      // 2. Update the user's document with the new group ID
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, { groupId: groupRef.id });

      await batch.commit();

      toast({ title: 'Group created!', description: 'Your dashboard is ready.' });
      router.push('/');
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ variant: 'destructive', title: 'Could not create group.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user) return;
    if (!inviteCode) {
      toast({ variant: 'destructive', title: 'Invite code is required.' });
      return;
    }
    setIsJoining(true);
    try {
      const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Invalid Invite Code' });
        return;
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();

      if (groupData.members.length >= 3) {
        toast({ variant: 'destructive', title: 'Group is full.' });
        return;
      }
      
      if (groupData.members.includes(user.uid)) {
        toast({ variant: 'destructive', title: "You're already in this group." });
        // redirect them anyway
         router.push('/');
        return;
      }

      const batch = writeBatch(db);

      // 1. Add user to group's member list
      batch.update(groupDoc.ref, {
        members: [...groupData.members, user.uid],
      });

      // 2. Update user's document with group ID
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, { groupId: groupDoc.id });

      await batch.commit();

      toast({ title: 'Joined group successfully!', description: 'Welcome!' });
      router.push('/');
    } catch (error) {
      console.error('Error joining group:', error);
      toast({ variant: 'destructive', title: 'Could not join group.' });
    } finally {
      setIsJoining(false);
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
            <h1 className="text-3xl font-bold text-foreground">Welcome to FairSeat</h1>
            <p className="text-muted-foreground">{user.displayName || user.email}</p>
          </div>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Join or Create a Group</CardTitle>
            <CardDescription>
              To start assigning seats, you need to be in a group with your friends.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="join">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="join">Join Group</TabsTrigger>
                <TabsTrigger value="create">Create Group</TabsTrigger>
              </TabsList>
              <TabsContent value="join" className="pt-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invite-code">Invite Code</Label>
                    <Input
                      id="invite-code"
                      placeholder="e.g. ABCDEF"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      disabled={isJoining}
                    />
                  </div>
                  <Button onClick={handleJoinGroup} className="w-full" disabled={isJoining}>
                    {isJoining ? <Loader2 className="mr-2" /> : <UserPlus className="mr-2" />}
                    {isJoining ? 'Joining...' : 'Join Group'}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="create" className="pt-4">
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
                  <Button onClick={handleCreateGroup} className="w-full" disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2" /> : <Users className="mr-2" />}
                    {isCreating ? 'Creating...' : 'Create Group'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
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

    
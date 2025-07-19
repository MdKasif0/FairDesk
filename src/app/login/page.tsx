// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Armchair, LogIn, UserPlus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleLogin = () => {
    if (username.trim() === '') {
      toast({ variant: 'destructive', title: 'Username required' });
      return;
    }
    // In a real app, you'd perform authentication here.
    // We'll just save it to local storage for this simulation.
    localStorage.setItem('fairseat_user', username);
    
    const group = localStorage.getItem('fairseat_group');
    if (group) {
      router.push('/');
    } else {
        toast({ title: "Logged in!", description: "Now create or join a group."})
    }
  };

  const handleCreateGroup = () => {
    if (groupName.trim() === '') {
      toast({ variant: 'destructive', title: 'Group name required' });
      return;
    }
    const user = localStorage.getItem('fairseat_user');
    if (!user) {
        toast({ variant: 'destructive', title: 'You must log in first!'});
        return;
    }

    const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const groupData = {
        name: groupName,
        inviteCode: newInviteCode,
        members: [user]
    };
    localStorage.setItem('fairseat_group', JSON.stringify(groupData));
    toast({ title: `Group "${groupName}" created!`, description: `Invite code: ${newInviteCode}`});
    router.push('/');
  };

  const handleJoinGroup = () => {
    if (inviteCode.trim() === '') {
        toast({ variant: 'destructive', title: 'Invite code required' });
        return;
    }
    const user = localStorage.getItem('fairseat_user');
    if (!user) {
        toast({ variant: 'destructive', title: 'You must log in first!'});
        return;
    }

    // This is a simulation. In a real app, you'd validate the invite code with a backend.
    // For now, we'll assume a hardcoded "group" in localStorage for others to join.
    // A user creating a group would set this item.
    // To test joining, you'd need to manually set this in your browser's dev tools
    // or have another "user" create it first.
    const groupStr = localStorage.getItem('fairseat_group');
    if (!groupStr) {
        toast({ variant: 'destructive', title: 'Group not found', description: 'No group has been created yet.'});
        return;
    }
    
    let group;
    try {
        group = JSON.parse(groupStr);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error reading group data.' });
        return;
    }


    if (group.inviteCode.toUpperCase() !== inviteCode.toUpperCase()) {
        toast({ variant: 'destructive', title: 'Invalid Invite Code' });
        return;
    }

    if (group.members.includes(user)) {
        toast({ title: 'Already in group!', description: 'You are already a member of this group.'});
    } else if (group.members.length >= 3) {
        toast({ variant: 'destructive', title: 'Group is full' });
        return;
    } else {
        group.members.push(user);
        localStorage.setItem('fairseat_group', JSON.stringify(group));
        toast({ title: `Joined "${group.name}"!` });
    }
    
    router.push('/');
  };
  
  const loggedInUser = typeof window !== 'undefined' ? localStorage.getItem('fairseat_user') : null;


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-center gap-4 mb-6">
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg">
                <Armchair className="h-10 w-10" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-foreground">FairSeat</h1>
                <p className="text-muted-foreground">Login or join a group</p>
            </div>
        </div>
        
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>{loggedInUser ? `Welcome, ${loggedInUser}` : 'Start Here'}</CardTitle>
            <CardDescription>
                {loggedInUser ? "Now create a group or join one." : "Please enter a username to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!loggedInUser ? (
                 <div className="space-y-4">
                    <div>
                        <Label htmlFor="username">Your Name</Label>
                        <Input
                            id="username"
                            type="text"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-input"
                        />
                    </div>
                    <Button onClick={handleLogin} className="w-full">
                        <LogIn className="mr-2"/>
                        Continue
                    </Button>
                </div>
            ) : (
                <Tabs defaultValue="join" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="join">Join Group</TabsTrigger>
                        <TabsTrigger value="create">Create Group</TabsTrigger>
                    </TabsList>
                    <TabsContent value="join">
                        <Card>
                            <CardHeader>
                                <CardTitle>Join an Existing Group</CardTitle>
                                <CardDescription>Enter the invite code you received.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="invite-code">Invite Code</Label>
                                    <Input
                                        id="invite-code"
                                        type="text"
                                        placeholder="ABCDEF"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        className="bg-input"
                                        maxLength={6}
                                    />
                                </div>
                                <Button onClick={handleJoinGroup} className="w-full">
                                    <UserPlus className="mr-2"/>
                                    Join Group
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="create">
                        <Card>
                             <CardHeader>
                                <CardTitle>Create a New Group</CardTitle>
                                <CardDescription>Give your group a name to get started.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="group-name">Group Name</Label>
                                    <Input
                                        id="group-name"
                                        type="text"
                                        placeholder="e.g., The Carpool Crew"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="bg-input"
                                    />
                                </div>
                                <Button onClick={handleCreateGroup} className="w-full">
                                    <Users className="mr-2"/>
                                    Create Group
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

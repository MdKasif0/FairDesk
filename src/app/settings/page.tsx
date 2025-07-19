
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Loader2, Trash2, PlusCircle, Save, LogOut, Copy, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Group, UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFriendInitial } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [groupName, setGroupName] = useState('');
  const [seats, setSeats] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);


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
              setGroupName(groupData.name);
              setSeats(groupData.seats);
              
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

  const handleSaveChanges = async () => {
    if (!group) return;
    if (!groupName.trim()) {
        toast({variant: 'destructive', title: 'Group name cannot be empty.'});
        return;
    }
    if (seats.some(s => !s.trim())) {
        toast({variant: 'destructive', title: 'Seat names cannot be empty.'});
        return;
    }
    setIsSaving(true);
    try {
        await updateDoc(doc(db, 'groups', group.id), {
            name: groupName.trim(),
            seats: seats.map(s => s.trim())
        });
        toast({title: 'Success!', description: 'Group settings have been updated.'})
    } catch(e) {
        console.error(e);
        toast({variant: 'destructive', title: 'Error', description: 'Failed to save changes.'})
    } finally {
        setIsSaving(false);
    }
  }

  const handleCopyInviteLink = () => {
    if(!group) return;
    const inviteLink = `${window.location.origin}/join?groupId=${group.id}`;
    navigator.clipboard.writeText(inviteLink);
    toast({title: 'Invite link copied!', description: 'Share it with your friends to join.'})
  }

  const handleLeaveGroup = async () => {
    if (!group || !user) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(db);

        const userRef = doc(db, 'users', user.uid);
        batch.update(userRef, {groupId: null});

        const groupRef = doc(db, 'groups', group.id);
        const updatedMembers = group.members.filter(uid => uid !== user.uid);
        
        if (updatedMembers.length === 0) {
            // If last member, delete the group
            batch.delete(groupRef);
             toast({title: 'Group Deleted', description: 'You were the last member, so the group has been deleted.'});
        } else {
            batch.update(groupRef, {members: updatedMembers});
            toast({title: 'You have left the group.'});
        }

        await batch.commit();
        router.push('/group-setup');
    } catch(e) {
        console.error(e);
        toast({variant: 'destructive', title: 'Error', description: 'Failed to leave group.'})
    } finally {
        setIsSaving(false);
    }
  }

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
    toast({ title: 'Logged out successfully.' });
  };


  if (loading || isDataLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Settings...</p>
      </div>
    );
  }
  
  if (!group) {
    router.push('/group-setup');
    return null;
  }
  
  return (
    <main className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Settings</h1>
      
      <Card>
        <CardHeader>
            <CardTitle>Group Settings</CardTitle>
            <CardDescription>Manage your group's name and seats.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input id="group-name" value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={isSaving} />
            </div>
            <div>
              <Label>Seats</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {seats.map((seat, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={seat} onChange={(e) => handleSeatChange(index, e.target.value)} disabled={isSaving} placeholder={`Seat ${index + 1}`} />
                    <Button variant="ghost" size="icon" onClick={() => removeSeat(index)} disabled={isSaving || seats.length <= 2}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addSeat} disabled={isSaving}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Seat
              </Button>
            </div>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                {isSaving ? "Saving..." : "Save Changes"}
            </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>View members of your group.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
           {friends.map(friend => (
            <div key={friend.uid} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={friend.photoURL || undefined} alt={friend.displayName}/>
                        <AvatarFallback>{getFriendInitial(friend.displayName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{friend.displayName}</p>
                        <p className="text-sm text-muted-foreground">{friend.email}</p>
                    </div>
                </div>
            </div>
           ))}
           <Button variant="secondary" className="w-full mt-4" onClick={handleCopyInviteLink}>
                <Copy className="mr-2"/>
                Copy Invite Link
           </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                    <Users className="mr-2"/>
                    Leave Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. You will be removed from the group and will need a new invite to rejoin. If you are the last member, the group will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveGroup}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2"/>
                Logout
            </Button>
        </CardContent>
      </Card>


    </main>
  );
}

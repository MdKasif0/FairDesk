
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import type { Group, UserProfile } from '@/types';
import { FairnessStats } from '@/components/app/fairness-stats';


export default function StatsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

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
        <p className="mt-4 text-muted-foreground">Loading Statistics...</p>
      </div>
    );
  }
  
  if (!group) {
    router.push('/group-setup');
    return null;
  }
  
  return (
    <main className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Statistics</h1>
      <FairnessStats 
        arrangements={group.arrangements}
        friends={friends}
        seats={group.seats}
      />
    </main>
  );
}

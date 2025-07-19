// src/app/join/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { joinGroup } from '@/ai/flows/join-group';
import { Loader2, Armchair } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function JoinGroupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupId = searchParams.get('groupId');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // If user is not logged in, redirect to login page, but keep the invite link
      const loginUrl = `/login?redirect=/join?groupId=${groupId}`;
      router.push(loginUrl);
      return;
    }

    if (!groupId) {
      setError('No group ID provided. The invite link is invalid.');
      setIsLoading(false);
      return;
    }

    const handleJoin = async () => {
      try {
        const result = await joinGroup({
          groupId: groupId,
          user: { uid: user.uid },
        });

        if (result.success) {
          toast({ title: 'Success!', description: result.message });
          router.push('/');
        } else {
          setError(result.message);
          toast({ variant: 'destructive', title: 'Could not join group', description: result.message });
        }
      } catch (e: any) {
        console.error(e);
        setError('An unexpected error occurred. Please try again.');
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected server error occurred.' });
      } finally {
        setIsLoading(false);
      }
    };

    handleJoin();

  }, [user, authLoading, groupId, router, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg w-fit mb-4">
               <Armchair className="h-10 w-10" />
            </div>
          <CardTitle>Joining Group...</CardTitle>
          <CardDescription>
            Please wait while we add you to the group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying invitation...</p>
            </div>
          )}
          {error && (
            <div className="text-center text-destructive space-y-4">
                <p>{error}</p>
                <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

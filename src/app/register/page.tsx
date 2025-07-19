// src/app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Armchair, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { auth, db } from '@/lib/firebase';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      toast({ variant: 'destructive', title: 'All fields are required' });
      return;
    }
     if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Password must be at least 6 characters' });
      return;
    }
    setIsLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const photoURL = `https://placehold.co/100x100.png?text=${displayName.charAt(0).toUpperCase()}`;

      // 2. Update Auth profile
      await updateProfile(user, { displayName, photoURL });
      
      // 3. Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: displayName,
        email: user.email,
        groupId: null, // Initially, user is not in a group
        photoURL: photoURL,
      });


      toast({ title: 'Account created successfully!', description: "Redirecting you to group setup..." });
      router.push('/group-setup');
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-center gap-4 mb-6">
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg">
                <Armchair className="h-10 w-10" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-foreground">FairDesk</h1>
                <p className="text-muted-foreground">Create your account</p>
            </div>
        </div>
        
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
                Fill in the details below to create your account.
            </CardDescription>
          </Header>
          <CardContent>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                        id="displayName"
                        type="text"
                        placeholder="Your Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-input"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-input"
                        disabled={isLoading}
                    />
                </div>
                 <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-input"
                        disabled={isLoading}
                    />
                </div>
                <Button onClick={handleRegister} className="w-full" disabled={isLoading}>
                    <UserPlus className="mr-2"/>
                    {isLoading ? 'Creating Account...' : 'Register'}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Sign In
                    </Link>
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

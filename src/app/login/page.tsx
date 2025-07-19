// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Armchair, LogIn, Mail } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { auth } from '@/lib/firebase';


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleLogin = async () => {
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Email and password required' });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Logged in successfully!' });
      
      const redirectUrl = searchParams.get('redirect');
      router.push(redirectUrl || '/');

    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
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
                <p className="text-muted-foreground">Welcome back!</p>
            </div>
        </div>
        
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
                Enter your credentials to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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
                <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                    <LogIn className="ml-2"/>
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="font-semibold text-primary hover:underline">
                        Register
                    </Link>
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// src/components/app/header.tsx
import { Menu, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
    user: FirebaseUser | null;
    group: any;
    onLogout: () => void;
}

export function Header({ user, group, onLogout }: HeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-10">
      <div className="container mx-auto flex items-center justify-between p-4 h-20">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              FairDesk
            </h1>
        </div>
        <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
                 <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'}/>
                    <AvatarFallback>{user?.displayName ? user.displayName.charAt(0) : <User />}</AvatarFallback>
                </Avatar>
            </Button>
            <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
        </div>
      </div>
    </header>
  );
}

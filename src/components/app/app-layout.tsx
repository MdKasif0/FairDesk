// src/components/app/app-layout.tsx
'use client';

import { Header } from '@/components/app/header';
import { Home, Calendar, History, BarChart2, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/history', label: 'History', icon: History },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const handleLogout = () => {
    // Implement your sign out logic here
    console.log("Logout");
    router.push('/login');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    // This will protect routes that use AppLayout
     if (pathname !== '/login' && pathname !== '/register') {
        // Can't use router.push during render, so use useEffect
        if (typeof window !== 'undefined') {
            router.push('/login');
        }
        return null;
     }
     return <>{children}</>;
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} group={null} onLogout={handleLogout} />
      <div className="flex-1 pb-20">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-t-lg">
        <div className="flex justify-around max-w-lg mx-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={label}>
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-2 w-20 transition-colors',
                  pathname === href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

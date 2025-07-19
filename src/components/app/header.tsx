import { Armchair, LogOut, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '../ui/badge';


interface HeaderProps {
    user: string | null;
    group: { name: string; inviteCode: string; members: string[] } | null;
    onLogout: () => void;
}


export function Header({ user, group, onLogout }: HeaderProps) {
  const { toast } = useToast();

  const handleCopyInviteCode = () => {
    if (group?.inviteCode) {
        navigator.clipboard.writeText(group.inviteCode);
        toast({ title: "Copied!", description: "Invite code copied to clipboard."});
    }
  }

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-md">
            <Armchair className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {group?.name || 'FairSeat'}
            </h1>
            <p className="text-sm text-muted-foreground">{user ? `Welcome, ${user}`: "Next level seat management"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {group && group.members.length < 3 && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Badge variant="secondary" className="cursor-pointer" onClick={handleCopyInviteCode}>
                            Invite Code: {group.inviteCode}
                            <Copy className="h-3 w-3 ml-2"/>
                         </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Click to copy invite code</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}
          {user && (
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4"/>
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

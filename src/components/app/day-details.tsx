'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Camera, MessageCircle, Send, User, Users, Check, X, ThumbsUp, GitPullRequest } from 'lucide-react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from '@/lib/utils';
import type { Arrangement, OverrideRequest } from '@/types';

interface DayDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  arrangement: Arrangement | null;
  onUpdateArrangement: (date: Date, updatedArrangement: Arrangement) => void;
  friends: string[];
  seats: string[];
}

export function DayDetails({ isOpen, onClose, date, arrangement, onUpdateArrangement, friends, seats }: DayDetailsProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideProposal, setOverrideProposal] = useState<Record<string, string>>({});

  if (!arrangement) return null;

  const handleAddComment = () => {
    if (commentText.trim() === '') return;
    const newComment = {
      user: 'You', // In a real app, this would be the logged-in user
      text: commentText,
      timestamp: new Date().toISOString(),
    };
    onUpdateArrangement(date, { ...arrangement, comments: [...arrangement.comments, newComment] });
    setCommentText('');
    toast({ title: 'Comment added!' });
  };
  
  const handleProposeOverride = () => {
    if (Object.keys(overrideProposal).length !== seats.length) {
        toast({ variant: 'destructive', title: 'Invalid Proposal', description: 'Please assign a friend to every seat.' });
        return;
    }
    const newOverrideRequest: OverrideRequest = {
        requester: "You",
        newArrangement: overrideProposal,
        approvals: [],
        status: 'pending',
    };
    onUpdateArrangement(date, { ...arrangement, override: newOverrideRequest });
    setShowOverrideForm(false);
    setOverrideProposal({});
    toast({ title: 'Override proposal submitted!', description: 'Waiting for 2 approvals.' });
  }

  const handleApprove = (approver: string) => {
    if (!arrangement.override) return;
    const existingApprovals = arrangement.override.approvals;
    if (existingApprovals.includes(approver)) return;

    const newApprovals = [...existingApprovals, approver];
    let newStatus = arrangement.override.status;
    let newSeats = arrangement.seats;

    if (newApprovals.length >= 2) {
        newStatus = 'approved';
        newSeats = arrangement.override.newArrangement;
        toast({ title: 'Override Approved!', description: 'The seating arrangement has been updated.' });
    }

    onUpdateArrangement(date, {
        ...arrangement,
        seats: newSeats,
        override: {
            ...arrangement.override,
            approvals: newApprovals,
            status: newStatus,
        },
    });
  };

  const getFriendInitial = (name: string) => name ? name.charAt(0).toUpperCase() : <User className="h-4 w-4" />;
  const getAvatarColor = (name: string) => {
    const colors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  }


  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-2xl font-headline">{format(date, 'EEEE, MMMM do')}</SheetTitle>
          <SheetDescription>Details for today's seating arrangement.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-6">

            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>Seat Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {Object.entries(arrangement.seats).map(([seat, friend]) => (
                    <li key={seat} className="flex items-center justify-between">
                      <span className="font-medium text-muted-foreground">{seat}</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className={cn("text-white", getAvatarColor(friend))}>
                                {getFriendInitial(friend)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{friend}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {arrangement.override ? (
                <Card className={cn(
                    arrangement.override.status === 'approved' && 'border-green-500',
                    arrangement.override.status === 'pending' && 'border-accent',
                )}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GitPullRequest className="h-5 w-5"/>
                            Override Request
                            <Badge variant={arrangement.override.status === 'approved' ? 'default' : 'secondary'} className={cn(arrangement.override.status === 'approved' ? 'bg-green-600' : 'bg-accent text-accent-foreground')}>
                                {arrangement.override.status}
                            </Badge>
                        </CardTitle>
                        <CardDescription>Requested by: {arrangement.override.requester}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold mb-2">Proposed Arrangement:</p>
                        <ul className="space-y-2 mb-4">
                        {Object.entries(arrangement.override.newArrangement).map(([seat, friend]) => (
                            <li key={seat} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{seat}</span>
                            <span>{friend}</span>
                            </li>
                        ))}
                        </ul>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                                <ThumbsUp className="h-4 w-4"/>
                                <span>Approvals: {arrangement.override.approvals.length} / 2</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {arrangement.override.approvals.map(f => (
                                    <Avatar key={f} className="h-6 w-6">
                                        <AvatarFallback className={cn("text-xs text-white", getAvatarColor(f))}>{getFriendInitial(f)}</AvatarFallback>
                                    </Avatar>
                                ))}
                            </div>
                        </div>
                        {arrangement.override.status === 'pending' && (
                            <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Approve as:</p>
                                <div className="flex gap-2">
                                {friends.map(f => (
                                    <Button key={f} size="sm" variant="outline" disabled={arrangement.override.approvals.includes(f)} onClick={() => handleApprove(f)}>
                                        <Check className={cn("mr-2 h-4 w-4", !arrangement.override.approvals.includes(f) && 'hidden')}/>
                                        {f}
                                    </Button>
                                ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center">
                    <Button variant="secondary" onClick={() => setShowOverrideForm(!showOverrideForm)}>
                        <GitPullRequest className="mr-2 h-4 w-4" />
                        {showOverrideForm ? 'Cancel Override' : 'Request Override'}
                    </Button>
                </div>
            )}

            {showOverrideForm && !arrangement.override && (
                <Card>
                    <CardHeader>
                        <CardTitle>Propose New Arrangement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {seats.map(seat => (
                            <div key={seat} className="flex items-center justify-between">
                                <span className="font-medium">{seat}</span>
                                <Select onValueChange={(friend) => setOverrideProposal(p => ({...p, [seat]: friend}))}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select friend" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {friends.map(friend => <SelectItem key={friend} value={friend}>{friend}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                        <Button className="w-full" onClick={handleProposeOverride}>Submit Proposal</Button>
                    </CardContent>
                </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <MessageCircle className="h-6 w-6 text-primary" />
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {arrangement.comments.map((comment, index) => (
                    <div key={index} className="flex gap-3">
                       <Avatar className="h-8 w-8">
                         <AvatarFallback className={cn("text-white", getAvatarColor(comment.user))}>{getFriendInitial(comment.user)}</AvatarFallback>
                       </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{comment.user} <span className="text-xs text-muted-foreground font-normal">{formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}</span></p>
                        <p className="text-sm text-muted-foreground">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {arrangement.comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>}
                </div>
              </CardContent>
              <SheetFooter className="bg-card p-4 border-t">
                 <div className="flex w-full items-center gap-2">
                    <Input placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                    <Button size="icon" onClick={handleAddComment}><Send className="h-4 w-4"/></Button>
                 </div>
              </SheetFooter>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Camera className="h-6 w-6 text-primary" />
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-2 gap-4">
                     <div data-ai-hint="office desk" className="relative aspect-square bg-muted rounded-lg overflow-hidden"><Image src="https://placehold.co/400x400.png" alt="Seat photo 1" layout="fill" objectFit="cover" /></div>
                     <div data-ai-hint="computer monitor" className="relative aspect-square bg-muted rounded-lg overflow-hidden"><Image src="https://placehold.co/400x400.png" alt="Seat photo 2" layout="fill" objectFit="cover" /></div>
                 </div>
                 <Button variant="outline" className="w-full mt-4"><Camera className="mr-2 h-4 w-4"/>Upload Photo</Button>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

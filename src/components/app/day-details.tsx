'use client';

import { useState, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Camera, MessageCircle, Send, User, Users, Check, ThumbsUp, GitPullRequest, Upload } from 'lucide-react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from '@/lib/utils';
import type { Arrangement, OverrideRequest, Photo } from '@/types';

interface DayDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  arrangement: Arrangement | null;
  onUpdateArrangement: (date: Date, updatedArrangement: Arrangement) => void;
  friends: string[];
  seats: string[];
  currentUser: string;
}

export function DayDetails({ isOpen, onClose, date, arrangement, onUpdateArrangement, friends, seats, currentUser }: DayDetailsProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideProposal, setOverrideProposal] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!arrangement) return null;

  const handleAddComment = () => {
    if (commentText.trim() === '') return;
    const newComment = {
      user: currentUser, 
      text: commentText,
      timestamp: new Date().toISOString(),
    };
    onUpdateArrangement(date, { ...arrangement, comments: [...arrangement.comments, newComment] });
    setCommentText('');
    toast({ title: 'Comment added!' });
  };
  
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto: Photo = {
          user: currentUser,
          url: reader.result as string,
          timestamp: new Date().toISOString(),
        };
        onUpdateArrangement(date, { ...arrangement, photos: [...arrangement.photos, newPhoto] });
        toast({ title: 'Photo uploaded!' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProposeOverride = () => {
    if (Object.keys(overrideProposal).length !== seats.length) {
        toast({ variant: 'destructive', title: 'Invalid Proposal', description: 'Please assign a friend to every seat.' });
        return;
    }
     const newValues = Object.values(overrideProposal);
    if (new Set(newValues).size !== seats.length) {
        toast({ variant: 'destructive', title: 'Invalid Proposal', description: 'Each friend must be assigned to exactly one seat.' });
        return;
    }

    const newOverrideRequest: OverrideRequest = {
        requester: currentUser,
        newArrangement: overrideProposal,
        approvals: [currentUser],
        status: 'pending',
    };
    onUpdateArrangement(date, { ...arrangement, override: newOverrideRequest });
    setShowOverrideForm(false);
    setOverrideProposal({});
    toast({ title: 'Override proposal submitted!', description: 'Waiting for 1 more approval.' });
  }

  const handleApprove = () => {
    if (!arrangement.override) return;
    const approver = currentUser;
    const existingApprovals = arrangement.override.approvals;
    if (existingApprovals.includes(approver)) {
      toast({description: "You've already approved this."})
      return;
    }

    const newApprovals = [...existingApprovals, approver];
    let newStatus = arrangement.override.status;
    let newSeats = arrangement.seats;

    if (newApprovals.length >= 2) {
        newStatus = 'approved';
        newSeats = arrangement.override.newArrangement;
        toast({ title: 'Override Approved!', description: 'The seating arrangement has been updated.' });
    } else {
        toast({ title: 'Approval recorded!', description: `1 more approval needed.` });
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
    if (!name) return 'bg-gray-400';
    const colors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
    const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-2xl font-headline">{format(date, 'EEEE, MMMM do')}</SheetTitle>
          <SheetDescription>Details for the seating arrangement.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-6">

            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle>Seat Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(arrangement.seats).length > 0 ? (
                    <ul className="space-y-4">
                    {seats.map((seat) => (
                        <li key={seat} className="flex items-center justify-between">
                        <span className="font-medium text-muted-foreground">{seat}</span>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className={cn("text-white", getAvatarColor(arrangement.seats[seat]))}>
                                    {getFriendInitial(arrangement.seats[seat])}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{arrangement.seats[seat]}</span>
                        </div>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No arrangement for this day.</p>
                )}
              </CardContent>
            </Card>

            {arrangement.override ? (
                <Card className={cn(
                    'border-2',
                    arrangement.override.status === 'approved' && 'border-green-500 bg-green-500/10',
                    arrangement.override.status === 'pending' && 'border-accent bg-accent/10',
                    arrangement.override.status === 'rejected' && 'border-destructive bg-destructive/10',
                )}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GitPullRequest className="h-5 w-5"/>
                            Override Request
                            <Badge variant={arrangement.override.status === 'approved' ? 'default' : 'secondary'} className={cn(
                              arrangement.override.status === 'approved' ? 'bg-green-600' : 
                              arrangement.override.status === 'pending' ? 'bg-accent text-accent-foreground' : 'bg-destructive'
                              )}>
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
                        {arrangement.override.status === 'pending' && !arrangement.override.approvals.includes(currentUser) && (
                            <div className="mt-4">
                               <Button className="w-full" onClick={handleApprove}>
                                 <ThumbsUp className="mr-2 h-4 w-4"/>
                                  Approve as {currentUser}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                Object.keys(arrangement.seats).length > 0 && (
                    <div className="text-center">
                        <Button variant="secondary" onClick={() => setShowOverrideForm(!showOverrideForm)}>
                            <GitPullRequest className="mr-2 h-4 w-4" />
                            {showOverrideForm ? 'Cancel Override' : 'Request Override'}
                        </Button>
                    </div>
                )
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
                <Camera className="h-6 w-6 text-primary" />
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-2 gap-4">
                  {arrangement.photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <Image src={photo.url} alt={`Seat photo ${index + 1}`} layout="fill" objectFit="cover" />
                       <div className="absolute bottom-0 w-full bg-black/50 text-white p-1 text-xs">
                          {photo.user} - {formatDistanceToNow(new Date(photo.timestamp), { addSuffix: true })}
                       </div>
                    </div>
                  ))}
                  {arrangement.photos.length === 0 && (
                     <div className="col-span-2 text-center text-sm text-muted-foreground p-4">No photos for this day.</div>
                  )}
                 </div>
                 <Button variant="outline" className="w-full mt-4" onClick={() => photoInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4"/>
                    Upload Photo
                 </Button>
                 <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                    accept="image/*"
                  />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <MessageCircle className="h-6 w-6 text-primary" />
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-4 p-6">
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
                    <Input placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
                    <Button size="icon" onClick={handleAddComment}><Send className="h-4 w-4"/></Button>
                 </div>
              </SheetFooter>
            </Card>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// src/components/app/action-buttons.tsx
'use client';

import { GitPullRequest, Shuffle, Camera, MessageSquare, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ActionButton = ({ icon: Icon, label, colorClass }: { icon: React.ElementType, label: string, colorClass: string }) => (
  <Card className="shadow-md rounded-2xl">
    <CardContent className="p-3">
      <Button variant="ghost" className="w-full justify-start h-auto p-0">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="ml-3 font-semibold text-sm">{label}</span>
      </Button>
    </CardContent>
  </Card>
);

export function ActionButtons() {
  const actions = [
    { icon: GitPullRequest, label: 'Request Override', color: 'bg-green-100 text-green-700' },
    { icon: Shuffle, label: 'Randomize Seats', color: 'bg-blue-100 text-blue-700' },
    { icon: Camera, label: 'Upload Photo', color: 'bg-indigo-100 text-indigo-700' },
    { icon: MessageSquare, label: 'Add Comment', color: 'bg-orange-100 text-orange-700' },
    { icon: Bell, label: 'Remind Me', color: 'bg-teal-100 text-teal-700' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {actions.slice(0, 4).map(action => (
        <ActionButton key={action.label} icon={action.icon} label={action.label} colorClass={action.color} />
      ))}
       <div className="col-span-2">
         <ActionButton icon={actions[4].icon} label={actions[4].label} colorClass={actions[4].color} />
       </div>
    </div>
  );
}

import { Armchair } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md">
            <Armchair className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold font-headline text-foreground">
            FairSeat
          </h1>
        </div>
      </div>
    </header>
  );
}

import { Armchair } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-3 rounded-xl shadow-md">
            <Armchair className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              FairSeat
            </h1>
            <p className="text-sm text-muted-foreground">Next level seat management</p>
          </div>
        </div>
      </div>
    </header>
  );
}

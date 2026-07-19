import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AppShell({ title, description, user, onLogout, children, actions }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f3f4f6,transparent_34rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Patient Health Records
            </Link>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
            </div>
            {user && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{user.role}</Badge>
                <Badge variant="outline">{user.email}</Badge>
                {user.ecard_number && <Badge>{user.ecard_number}</Badge>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {onLogout && (
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function AuthShell({ title, description, children }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#f3f4f6,transparent_32rem)] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Patient Health Records
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

import Link from 'next/link';
import { Activity, BadgeCheck, CreditCard, Shield, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const portals = [
  { href: '/login/admin', title: 'Admin', description: 'Approve doctors and search every account by e-card.', icon: Shield },
  { href: '/login/doctor', title: 'Doctor', description: 'Find patients by e-card and create visit records.', icon: Stethoscope },
  { href: '/login/patient', title: 'Patient', description: 'View your e-card and date-wise medical history.', icon: UserRound },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f3f4f6,transparent_34rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center gap-10">
        <section className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Unified hospital health records
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Patient Health Record Management
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              A black themed clinical workspace for e-card based identity, doctor approvals, patient lookup, and date-wise visit history.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login/admin">Admin Login</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register/doctor">Doctor Request</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/register/patient">Patient Registration</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link href={portal.href} key={portal.href}>
                <Card className="h-full transition-colors hover:bg-accent">
                  <CardHeader>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>{portal.title}</CardTitle>
                    <CardDescription>{portal.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    E-card enabled
                    <BadgeCheck className="ml-auto h-4 w-4" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

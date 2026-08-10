import Link from 'next/link';
import { Activity, ArrowRight, BadgeCheck, CreditCard, HeartPulse, Shield, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const portals = [
  { href: '/login/admin', title: 'Admin', description: 'Approve doctors and search every account by e-card.', icon: Shield },
  { href: '/login/doctor', title: 'Doctor', description: 'Find patients by e-card and create visit records.', icon: Stethoscope },
  { href: '/login/patient', title: 'Patient', description: 'View your e-card and date-wise medical history.', icon: UserRound },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col justify-center gap-8">
        <section className="overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground shadow-[0_18px_48px_rgba(15,43,70,0.18)] sm:px-10 sm:py-14">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><HeartPulse className="h-5 w-5" /></span>
              CareLedger · Healthcare records
            </div>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-cyan-50">
                <Activity className="h-4 w-4" /> Unified hospital workspace
              </div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Care that stays connected.</h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-200">A calm, secure workspace for e-card identity, clinician approvals, patient history, and blockchain-backed record integrity.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-primary hover:bg-slate-100" asChild><Link href="/login/admin">Admin Login <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button className="border-white/30 bg-white/10 text-white hover:bg-white/15" variant="outline" asChild><Link href="/register/doctor">Doctor Request</Link></Button>
              <Button className="bg-teal-400 text-slate-950 hover:bg-teal-300" asChild><Link href="/register/patient">Patient Registration</Link></Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link href={portal.href} key={portal.href}>
                <Card className="h-full border-primary/10">
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

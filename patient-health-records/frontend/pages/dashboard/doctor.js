import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CreditCard, FilePlus2, Search, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser, logout } from '../../lib/api';

const actions = [
  { href: '/doctor/find-patient', title: 'Find by E-Card', description: 'Open a patient profile and add visit history.', icon: Search },
  { href: '/doctor/create-patient', title: 'Create Patient', description: 'Create an account for a patient from your doctor profile.', icon: FilePlus2 },
  { href: '/doctor/my-patients', title: 'My Patients', description: 'Review patient accounts created by you.', icon: Users },
];

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      router.push('/login/doctor');
      return;
    }
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading...</main>;
  }

  return (
    <AppShell title="Doctor Dashboard" description="Search patients by e-card and maintain date-wise medical records." user={user} onLogout={handleLogout}>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={item.href}>
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
      <Card>
        <CardHeader>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Clinical Flow</CardTitle>
          <CardDescription>Ask the patient for their e-card, search it, review history, then save today&apos;s visit in the common medical structure.</CardDescription>
        </CardHeader>
      </Card>
    </AppShell>
  );
}

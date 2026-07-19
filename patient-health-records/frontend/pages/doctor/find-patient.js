import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Lock, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDateIST } from '@/lib/date';
import { findPatientByEcard, getUser, logout } from '../../lib/api';

export default function FindPatient() {
  const [user, setUser] = useState(null);
  const [ecardNumber, setEcardNumber] = useState('');
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [access, setAccess] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const searchPatient = async (event) => {
    event.preventDefault();
    setError('');
    setPatient(null);
    setVisits([]);
    setAccess(null);
    setLoading(true);

    try {
      const response = await findPatientByEcard(ecardNumber.trim().toUpperCase());
      setPatient(response.data.patient);
      setVisits(response.data.visits || []);
      setAccess(response.data.access || { canAccess: true, privacy: 'public' });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to find patient');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading...</main>;
  }

  return (
    <AppShell title="Patient E-Card Lookup" description="Search the patient first, then open their profile to view history or add entries." user={user} onLogout={handleLogout} actions={<Button variant="outline" asChild><Link href="/dashboard/doctor">Dashboard</Link></Button>}>
      <Card>
        <CardHeader>
          <CardTitle>Search Patient</CardTitle>
          <CardDescription>Enter the 7-character hospital e-card provided by the patient.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={searchPatient}>
            <Input className="font-mono uppercase tracking-wider" maxLength={7} minLength={7} placeholder="E-card number" value={ecardNumber} onChange={(event) => setEcardNumber(event.target.value.toUpperCase())} required />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              {loading ? 'Searching...' : 'Find Patient'}
            </Button>
          </form>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
        </CardContent>
      </Card>

      {patient && (
        <Link href={`/doctor/patient/${patient.ecard_number}`}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{patient.first_name} {patient.last_name}</CardTitle>
                <Badge>{patient.ecard_number}</Badge>
                <Badge variant="outline">{patient.profile_visibility === 'private' ? 'Private' : 'Public'}</Badge>
              </div>
              <CardDescription>{patient.email}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <p>Date of Birth: {formatDateIST(patient.date_of_birth)}</p>
              <p>Govt ID: {patient.govt_id_type}: {patient.govt_id_number}</p>
              <p>Nearby Hospital: {patient.nearby_hospital_name || 'Not provided'}</p>
              <p className="flex items-center gap-2">
                {access?.canAccess ? `Previous Entries: ${visits.length}` : <><Lock className="h-4 w-4" /> Private profile - request access</>}
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
    </AppShell>
  );
}

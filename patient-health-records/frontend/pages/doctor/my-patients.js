import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST } from '@/lib/date';
import { getMyCreatedPatients, getUser, logout } from '../../lib/api';

export default function MyPatients() {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      router.push('/login/doctor');
      return;
    }
    setUser(currentUser);
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await getMyCreatedPatients();
      setPatients(response.data);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading...</main>;
  }

  return (
    <AppShell title="My Patients" description="Patient accounts created by your doctor profile." user={user} onLogout={handleLogout} actions={<Button variant="outline" asChild><Link href="/dashboard/doctor">Dashboard</Link></Button>}>
      <Card>
        <CardHeader>
          <CardTitle>Created Patients</CardTitle>
          <CardDescription>Use the e-card for future patient lookup and visits.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : patients.length === 0 ? <p className="text-sm text-muted-foreground">No patients created yet.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Card</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Govt ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.patient_id}>
                    <TableCell>{patient.first_name} {patient.last_name}</TableCell>
                    <TableCell><Badge>{patient.ecard_number}</Badge></TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{formatDateIST(patient.date_of_birth)}</TableCell>
                    <TableCell>{patient.govt_id_type}: {patient.govt_id_number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Search } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateIST, formatDateTimeIST } from '@/lib/date';
import {
  adminSearchByEcard,
  approveDoctorRequest,
  getAllDoctors,
  getAllPatientsForAdmin,
  getPendingDoctorRequests,
  getUser,
  logout,
  rejectDoctorRequest,
} from '../../lib/api';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [ecardQuery, setEcardQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/login/admin');
      return;
    }
    setUser(currentUser);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [pendingResponse, patientsResponse, doctorsResponse] = await Promise.all([
        getPendingDoctorRequests(),
        getAllPatientsForAdmin(),
        getAllDoctors(),
      ]);
      setPendingDoctors(pendingResponse.data);
      setPatients(patientsResponse.data);
      setDoctors(doctorsResponse.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearchError('');
    setSearchResult(null);
    try {
      const response = await adminSearchByEcard(ecardQuery.trim().toUpperCase());
      setSearchResult(response.data);
    } catch (err) {
      setSearchError(err.response?.data?.error || 'Unable to search e-card');
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
    <AppShell
      title="Admin Dashboard"
      description="Approve doctor accounts, inspect patient origins, and search any user by hospital e-card."
      user={user}
      onLogout={handleLogout}
    >
      <Card>
        <CardHeader>
          <CardTitle>E-Card Search</CardTitle>
          <CardDescription>Search any admin, doctor, or patient account using the 7-character e-card.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
            <Input
              className="font-mono uppercase tracking-wider"
              maxLength={7}
              minLength={7}
              placeholder="E.g. AED7172"
              value={ecardQuery}
              onChange={(event) => setEcardQuery(event.target.value.toUpperCase())}
              required
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
          {searchError && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{searchError}</p>}
          {searchResult && (
            <Card className="bg-background">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{searchResult.account.first_name} {searchResult.account.last_name}</CardTitle>
                  <Badge>{searchResult.account.ecard_number}</Badge>
                  <Badge variant="secondary">{searchResult.account.role}</Badge>
                </div>
                <CardDescription>{searchResult.account.email}</CardDescription>
              </CardHeader>
              {searchResult.account.role === 'patient' && (
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Govt ID: {searchResult.details?.govt_id_type}: {searchResult.details?.govt_id_number}</p>
                  <p>Date of Birth: {formatDateIST(searchResult.details?.date_of_birth)}</p>
                  <p>Nearby Hospital: {searchResult.details?.nearby_hospital_name || 'Not provided'}</p>
                  <p>Visit Records: {searchResult.visits?.length || 0}</p>
                </CardContent>
              )}
              {searchResult.account.role === 'doctor' && (
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>License: {searchResult.details?.license_number}</p>
                  <p>Hospital: {searchResult.details?.hospital_name || 'Not provided'}</p>
                  <p>Status: {searchResult.details?.status}</p>
                  <p>Requested: {formatDateTimeIST(searchResult.details?.created_at)}</p>
                </CardContent>
              )}
            </Card>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Pending Doctors" value={pendingDoctors.length} />
        <StatCard title="Patients" value={patients.length} />
        <StatCard title="Doctors" value={doctors.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Doctor Approvals</CardTitle>
          <CardDescription>Only approved doctors can sign in and create visit records.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : pendingDoctors.length === 0 ? <p className="text-sm text-muted-foreground">No pending doctor requests.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Card</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDoctors.map((doctor) => (
                  <TableRow key={doctor.doctor_id}>
                    <TableCell>{doctor.first_name} {doctor.last_name}</TableCell>
                    <TableCell><Badge>{doctor.ecard_number}</Badge></TableCell>
                    <TableCell>{doctor.email}</TableCell>
                    <TableCell>{doctor.license_number}</TableCell>
                    <TableCell>{doctor.hospital_name}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" onClick={() => approveDoctorRequest(doctor.doctor_id).then(fetchDashboardData)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectDoctorRequest(doctor.doctor_id).then(fetchDashboardData)}>Reject</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patient Accounts</CardTitle>
          <CardDescription>Account origin is retained for admin inspection.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Card</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Govt ID</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Created By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => (
                <TableRow key={patient.patient_id}>
                  <TableCell>{patient.first_name} {patient.last_name}</TableCell>
                  <TableCell><Badge>{patient.ecard_number}</Badge></TableCell>
                  <TableCell>{patient.email}</TableCell>
                  <TableCell>{patient.govt_id_type}: {patient.govt_id_number}</TableCell>
                  <TableCell>{formatDateIST(patient.date_of_birth)}</TableCell>
                  <TableCell>{patient.created_by_self ? 'Self registered' : `Dr. ${patient.doctor_first_name || ''} ${patient.doctor_last_name || ''}`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doctor Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Card</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.doctor_id}>
                  <TableCell>{doctor.first_name} {doctor.last_name}</TableCell>
                  <TableCell><Badge>{doctor.ecard_number}</Badge></TableCell>
                  <TableCell>{doctor.email}</TableCell>
                  <TableCell>{doctor.license_number}</TableCell>
                  <TableCell><Badge variant="secondary">{doctor.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({ title, value }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

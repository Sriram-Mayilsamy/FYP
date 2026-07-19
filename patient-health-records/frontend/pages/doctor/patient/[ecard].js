import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Lock, Plus, Send } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VisitCard } from '@/components/medical/visit-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateIST, formatDateTimeIST } from '@/lib/date';
import { findPatientByEcard, getUser, logout, requestPatientAccess } from '@/lib/api';

export default function DoctorPatientProfile() {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [access, setAccess] = useState(null);
  const [requestForm, setRequestForm] = useState({ requested_until: '', reason: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { ecard } = router.query;

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      router.push('/login/doctor');
      return;
    }
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (ecard) {
      fetchPatient(ecard);
    }
  }, [ecard]);

  const fetchPatient = async (ecardNumber) => {
    try {
      const response = await findPatientByEcard(String(ecardNumber).toUpperCase());
      setPatient(response.data.patient);
      setVisits(response.data.visits || []);
      setAccess(response.data.access || { canAccess: true, privacy: 'public' });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load patient');
    }
  };

  const submitAccessRequest = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const response = await requestPatientAccess(patient.patient_id, requestForm);
      setMessage(response.data.message || 'Access request sent to patient.');
      await fetchPatient(patient.ecard_number);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to request access');
    } finally {
      setSubmitting(false);
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
      title="Patient Profile"
      description="Review the patient profile and date-wise medical history."
      user={user}
      onLogout={handleLogout}
      actions={
        <>
          <Button variant="outline" asChild><Link href="/doctor/find-patient">Search</Link></Button>
          {patient && access?.canAccess && (
            <Button asChild>
              <Link href={`/doctor/patient/${patient.ecard_number}/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Entry
              </Link>
            </Button>
          )}
        </>
      }
    >
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
      {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

      {patient && (
        <>
          <Card>
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
              <p>Total Entries: {visits.length}</p>
            </CardContent>
          </Card>

          {!access?.canAccess ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  <CardTitle>Private Profile</CardTitle>
                </div>
                <CardDescription>
                  This patient must approve access before records or new entries are available.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {access?.pendingRequest ? (
                  <div className="rounded-md border bg-muted/20 p-4 text-sm">
                    <p className="font-medium">Access request already pending.</p>
                    <p className="mt-1 text-muted-foreground">Requested until {formatDateTimeIST(access.pendingRequest.requested_until)}</p>
                    <p className="mt-3">{access.pendingRequest.reason}</p>
                  </div>
                ) : (
                  <form className="grid gap-4" onSubmit={submitAccessRequest}>
                    <div className="grid gap-2">
                      <Label htmlFor="requested_until">Access required until</Label>
                      <Input
                        id="requested_until"
                        name="requested_until"
                        type="datetime-local"
                        value={requestForm.requested_until}
                        onChange={(event) => setRequestForm((previous) => ({ ...previous, requested_until: event.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reason">Reason</Label>
                      <Textarea
                        id="reason"
                        name="reason"
                        placeholder="Example: Follow-up consultation, emergency review, or lab report discussion."
                        value={requestForm.reason}
                        onChange={(event) => setRequestForm((previous) => ({ ...previous, reason: event.target.value }))}
                        required
                      />
                    </div>
                    <Button className="w-fit" type="submit" disabled={submitting}>
                      <Send className="mr-2 h-4 w-4" />
                      {submitting ? 'Sending...' : 'Request Access'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Previous Entries</CardTitle>
                <CardDescription>Newest visit first. Detailed entries are read-only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {visits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous entries yet.</p>
                ) : (
                  visits.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      detailedHref={`/doctor/visits/${visit.id}`}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}

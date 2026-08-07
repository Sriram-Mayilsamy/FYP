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
import { PatientTimelineCharts } from '@/components/medical/patient-timeline-charts';


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
          {/* Patient Overview Header Banner (Light Theme) */}
          <Card className="border border-gray-100 shadow-sm bg-white text-slate-900 overflow-hidden rounded-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-md ring-2 ring-blue-100 shrink-0">
                    {patient.first_name?.[0]}{patient.last_name?.[0]}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {patient.first_name} {patient.last_name}
                      </h2>
                      <Badge className="bg-blue-600 text-white font-mono px-2.5 py-0.5 shadow-sm">
                        {patient.ecard_number}
                      </Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-sm px-2 py-0.5">
                        {patient.profile_visibility === 'private' ? '🔒 Private Record' : '🌐 Public Profile'}
                      </Badge>
                      {patient.blood_group && (
                        <Badge className="bg-rose-600 text-white font-bold">
                          {patient.blood_group}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-2">
                      <span>{patient.email}</span>
                      <span>•</span>
                      <span>DOB: {formatDateIST(patient.date_of_birth)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-xs text-slate-600">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium block uppercase tracking-wider">Govt Identity</span>
                    <p className="font-semibold text-slate-900">{patient.govt_id_type?.toUpperCase()}: {patient.govt_id_number}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium block uppercase tracking-wider">Registered Hospital</span>
                    <p className="font-semibold text-slate-900">{patient.nearby_hospital_name || 'General Hospital'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-600 font-medium block uppercase tracking-wider">Timeline Records</span>
                    <p className="font-semibold text-blue-600">{visits.length} Visit Entries</p>
                  </div>
                </div>
              </div>
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
            <>
              <PatientTimelineCharts patientId={patient.patient_id} visits={visits} />
              
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
            </>
          )}
        </>
      )}
    </AppShell>
  );
}

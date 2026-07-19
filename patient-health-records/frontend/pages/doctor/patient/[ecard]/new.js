import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/app-shell';
import { AIReportImporter, VisitForm, visitFields } from '@/components/medical/visit-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateIST, todayInputDateIST } from '@/lib/date';
import { createMedicalVisit, findPatientByEcard, getUser, importMedicalReport, logout } from '@/lib/api';

const blankVisit = {
  ...visitFields,
  visit_date: todayInputDateIST(),
};

export default function NewVisitEntry() {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [visitForm, setVisitForm] = useState(blankVisit);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSource, setImportSource] = useState(null);
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
      if (response.data.access && !response.data.access.canAccess) {
        router.push(`/doctor/patient/${String(ecardNumber).toUpperCase()}`);
        return;
      }
      setPatient(response.data.patient);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load patient');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleVisitChange = (event) => {
    const { name, value } = event.target;
    setVisitForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleReportImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');
    setMessage('');
    setImporting(true);
    setImportSource(null);

    try {
      const response = await importMedicalReport(file);
      const extracted = response.data.fields || {};
      const extractedCount = Object.values(extracted).filter(Boolean).length;
      setVisitForm((previous) => ({
        ...previous,
        ...Object.fromEntries(Object.entries(extracted).filter(([, value]) => value !== '')),
      }));
      setImportSource(response.data.source);
      setMessage(
        extractedCount > 0
          ? `AI extracted ${extractedCount} fields. Please review before saving.`
          : 'AI completed import but did not find matching fields in this report.'
      );
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to import medical report');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const submitVisit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await createMedicalVisit(patient.patient_id, visitForm);
      router.push(`/doctor/patient/${patient.ecard_number}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save visit');
    }
  };

  if (!user) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading...</main>;
  }

  return (
    <AppShell
      title="Add New Entry"
      description="Create one date-wise visit entry after reviewing AI-filled or manually-entered data."
      user={user}
      onLogout={handleLogout}
      actions={patient && <Button variant="outline" asChild><Link href={`/doctor/patient/${patient.ecard_number}`}>Back to History</Link></Button>}
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
              </div>
              <CardDescription>DOB {formatDateIST(patient.date_of_birth)} - {patient.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Govt ID: {patient.govt_id_type}: {patient.govt_id_number}
            </CardContent>
          </Card>

          <AIReportImporter importing={importing} importSource={importSource} onImport={handleReportImport} />

          <Card>
            <CardHeader>
              <CardTitle>Visit Fields</CardTitle>
              <CardDescription>Doctor must review every field before submitting.</CardDescription>
            </CardHeader>
            <CardContent>
              <VisitForm form={visitForm} onChange={handleVisitChange} onSubmit={submitVisit} submitLabel="Save Entry" />
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}

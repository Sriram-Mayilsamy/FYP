import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateIST, formatTimeIST } from '@/lib/date';
import { getUser, getVisitDetails, logout } from '@/lib/api';

const sections = [
  {
    title: 'Visit',
    fields: [
      ['visit_date', 'Visit Date', 'date'],
      ['visit_time', 'Visit Time', 'time'],
      ['hospital_name', 'Hospital'],
      ['department', 'Department'],
      ['follow_up_date', 'Follow-up Date', 'date'],
    ],
  },
  {
    title: 'Vitals and Labs',
    fields: [
      ['height_cm', 'Height cm'],
      ['weight_kg', 'Weight kg'],
      ['temperature_c', 'Temperature C'],
      ['pulse_bpm', 'Pulse bpm'],
      ['respiratory_rate_bpm', 'Respiratory rate'],
      ['oxygen_saturation_percent', 'SpO2 %'],
      ['systolic_bp', 'Systolic BP'],
      ['diastolic_bp', 'Diastolic BP'],
      ['blood_sugar_fasting_mg_dl', 'Fasting sugar'],
      ['blood_sugar_random_mg_dl', 'Random sugar'],
      ['blood_sugar_pp_mg_dl', 'PP sugar'],
      ['hemoglobin_g_dl', 'Hemoglobin'],
    ],
  },
  {
    title: 'Clinical Notes',
    fields: [
      ['chief_complaint', 'Chief Complaint'],
      ['symptoms', 'Symptoms'],
      ['diagnosis', 'Diagnosis'],
      ['prescription', 'Prescription'],
      ['injections_given', 'Injections Given'],
      ['lab_tests_requested', 'Lab Tests Requested'],
      ['notes', 'Doctor Notes'],
    ],
  },
];

export default function VisitDetail() {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [visit, setVisit] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { visitId } = router.query;

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      router.push('/login/doctor');
      return;
    }
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (visitId) {
      fetchVisit(visitId);
    }
  }, [visitId]);

  const fetchVisit = async (id) => {
    try {
      const response = await getVisitDetails(id);
      setVisit(response.data.visit);
      setPatient(response.data.patient);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load visit details');
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
      title="Visit Detail"
      description="Read-only complete entry made by the examining doctor."
      user={user}
      onLogout={handleLogout}
      actions={patient && <Button variant="outline" asChild><Link href={`/doctor/patient/${patient.ecard_number}`}>Back to Patient</Link></Button>}
    >
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}

      {patient && visit && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{patient.first_name} {patient.last_name}</CardTitle>
                <Badge>{patient.ecard_number}</Badge>
                <Badge variant="outline">Record ID: {visit.id}</Badge>
                <Badge variant={visit.blockchain_transaction_id ? 'default' : 'secondary'}>
                  {visit.blockchain_transaction_id ? 'Blockchain registered' : 'Not registered'}
                </Badge>
              </div>
              <CardDescription>
                Entry by Dr. {visit.doctor_first_name} {visit.doctor_last_name} · {formatDateIST(visit.visit_date)} {formatTimeIST(visit.visit_time)}
              </CardDescription>
            </CardHeader>
          </Card>

          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {section.fields.map(([key, label, type]) => (
                  <ReadOnlyField key={key} label={label} value={formatValue(visit[key], type)} />
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </AppShell>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value || 'Not provided'}</p>
    </div>
  );
}

function formatValue(value, type) {
  if (type === 'date') {
    return formatDateIST(value);
  }
  if (type === 'time') {
    return formatTimeIST(value);
  }
  return value;
}

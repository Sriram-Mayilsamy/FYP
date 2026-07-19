import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { doctorCreatePatient, getUser, logout } from '../../lib/api';

export default function CreatePatient() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    govt_id_type: 'aadhar',
    govt_id_number: '',
    govt_id_proof_url: '',
    nearby_hospital_name: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'doctor') {
      router.push('/login/doctor');
      return;
    }
    setUser(currentUser);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await doctorCreatePatient(formData);
      setMessage(`Patient created. E-card: ${response.data.ecard_number}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create patient record');
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
      title="Create Patient"
      description="Create a patient account and generate a 7-character hospital e-card."
      user={user}
      onLogout={handleLogout}
      actions={<Button variant="outline" asChild><Link href="/dashboard/doctor">Dashboard</Link></Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Patient Account</CardTitle>
          <CardDescription>Government ID stays unique across patient accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
            {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} />
              <Field label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} />
              <Field label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              <Field label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
              <Field label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} required />
              <div className="space-y-2">
                <Label>Government ID Type</Label>
                <Select name="govt_id_type" value={formData.govt_id_type} onChange={handleChange}>
                  <option value="aadhar">Aadhar</option>
                  <option value="pan">PAN</option>
                  <option value="passport">Passport</option>
                  <option value="license">Driver License</option>
                </Select>
              </div>
              <Field label="Government ID Number" name="govt_id_number" value={formData.govt_id_number} onChange={handleChange} required />
              <Field label="Government ID Proof URL" name="govt_id_proof_url" type="url" value={formData.govt_id_proof_url} onChange={handleChange} />
              <Field label="Nearby Hospital" name="nearby_hospital_name" value={formData.nearby_hospital_name} onChange={handleChange} />
            </div>
            <Button type="submit">Create Patient</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}

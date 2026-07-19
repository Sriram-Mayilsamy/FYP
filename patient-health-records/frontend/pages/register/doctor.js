import { useState } from 'react';
import { useRouter } from 'next/router';
import { AuthShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitDoctorRegistration } from '../../lib/api';

export default function DoctorRegister() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    license_number: '',
    specialization: '',
    hospital_name: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await submitDoctorRegistration(formData);
      setMessage('Registration request submitted. Admin approval is required before login.');
      setTimeout(() => router.push('/login/doctor'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <AuthShell title="Doctor Request" description="Submit license details for master admin approval.">
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
            {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} />
              <Field label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} />
            </div>
            <Field label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <Field label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
            <Field label="License Number" name="license_number" value={formData.license_number} onChange={handleChange} required />
            <Field label="Specialization" name="specialization" value={formData.specialization} onChange={handleChange} />
            <Field label="Hospital Name" name="hospital_name" value={formData.hospital_name} onChange={handleChange} />
            <Button className="w-full" type="submit">Submit Request</Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
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

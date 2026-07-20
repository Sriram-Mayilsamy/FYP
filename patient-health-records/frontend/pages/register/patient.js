import { useState } from 'react';
import { useRouter } from 'next/router';
import { AuthShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { patientSelfRegister, setToken, setUser } from '../../lib/api';

export default function PatientRegister() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    blood_group: '',
    govt_id_type: 'aadhar',
    govt_id_number: '',
    govt_id_proof_url: '',
    nearby_hospital_name: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await patientSelfRegister(formData);
      setToken(response.data.token);
      setUser(response.data.user);
      router.push('/dashboard/patient');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <AuthShell title="Patient Registration" description="Create one account using government ID and nearby hospital.">
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} />
              <Field label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} />
            </div>
            <Field label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <Field label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required />
            <Field label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} required />
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select name="blood_group" value={formData.blood_group} onChange={handleChange}>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Government ID Type</Label>
              <Select name="govt_id_type" value={formData.govt_id_type} onChange={handleChange} required>
                <option value="aadhar">Aadhar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="license">Driver License</option>
              </Select>
            </div>
            <Field label="Government ID Number" name="govt_id_number" value={formData.govt_id_number} onChange={handleChange} required />
            <Field label="Government ID Proof URL" name="govt_id_proof_url" type="url" value={formData.govt_id_proof_url} onChange={handleChange} />
            <Field label="Nearby Hospital Name" name="nearby_hospital_name" value={formData.nearby_hospital_name} onChange={handleChange} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emergency Contact Name" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} />
              <Field label="Emergency Contact Phone" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} />
            </div>
            <Field label="Emergency Contact Relation" name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleChange} />
            <Button className="w-full" type="submit">Create Account</Button>
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

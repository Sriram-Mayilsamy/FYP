import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { AuthShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientLogin, setToken, setUser } from '../../lib/api';

export default function PatientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await patientLogin(email, password);
      setToken(response.data.token);
      setUser(response.data.user);
      router.push('/dashboard/patient');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <AuthShell title="Patient Login" description="Access your hospital e-card and full date-wise visit history.">
      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <Button className="w-full" type="submit">Login</Button>
            <Button className="w-full" variant="ghost" asChild>
              <Link href="/register/patient">Create patient account</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

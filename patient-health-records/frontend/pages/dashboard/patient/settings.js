import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Lock, Unlock, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  getPatientProfile,
  getUser,
  logout,
  updatePatientPrivacy,
} from '../../../lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'patient') {
      router.push('/login/patient');
      return;
    }
    setUser(currentUser);
    loadPatient();
  }, [router]);

  const loadPatient = async () => {
    setLoading(true);
    try {
      const response = await getPatientProfile();
      setPatient(response.data?.data || response.data);
    } catch (err) {
      setError('Unable to load patient information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handlePrivacyToggle = async () => {
    if (!patient) return;
    const nextVisibility = patient.profile_visibility === 'private' ? 'public' : 'private';
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await updatePatientPrivacy(nextVisibility);
      setPatient((previous) => ({ 
        ...previous, 
        profile_visibility: response.data?.data?.profile_visibility || nextVisibility 
      }));
      setMessage(`Profile visibility changed to ${nextVisibility}.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update privacy setting');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading...</main>;
  }

  const isPrivate = patient?.profile_visibility === 'private';

  return (
    <AppShell 
      title="Account Settings" 
      description="Manage your privacy and account settings" 
      user={user} 
      onLogout={handleLogout}
    >
      <div className="min-h-screen flex flex-col gap-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and privacy</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {message && (
          <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <Check className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">{message}</p>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6 flex-1">
          {loading ? (
            <Card>
              <CardContent className="pt-8 text-center text-muted-foreground">
                <p>Loading settings...</p>
              </CardContent>
            </Card>
          ) : patient ? (
            <>
              {/* Privacy Settings Section */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control who can access your health records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border-2 p-6 transition-all" style={{ borderColor: isPrivate ? '#ef4444' : '#10b981' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {isPrivate ? (
                            <Lock className="h-5 w-5 text-red-500" />
                          ) : (
                            <Unlock className="h-5 w-5 text-emerald-500" />
                          )}
                          <h3 className="text-lg font-semibold">
                            {isPrivate ? 'Private Profile' : 'Public Profile'}
                          </h3>
                          <Badge className={isPrivate ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                            {isPrivate ? 'Restricted' : 'Open'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {isPrivate 
                            ? 'Doctors must submit access requests with a specific reason and duration. You can approve, reject, or terminate access at any time.'
                            : 'Any approved doctor can view your complete health records using your e-card number. You can switch to Private mode anytime.'}
                        </p>
                      </div>
                      <Switch 
                        checked={isPrivate} 
                        onClick={handlePrivacyToggle} 
                        disabled={busy || loading}
                        className="h-6 w-11"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-2">
                      <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Pro Tip</p>
                        <p className="text-xs text-blue-800 mt-0.5">
                          Use Private Profile for better control over your data. You'll be notified of all access requests.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your personal and account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium">{patient.first_name} {patient.last_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">E-Card Number</p>
                      <p className="text-sm font-mono font-medium">{patient.ecard_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Government ID</p>
                      <p className="text-sm">
                        {patient.govt_id_type && patient.govt_id_number 
                          ? `${patient.govt_id_type} - ${patient.govt_id_number}` 
                          : 'Not provided'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Hospital</p>
                      <p className="text-sm">{patient.nearby_hospital_name || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Account Created</p>
                      <p className="text-sm">
                        {patient.created_by_self 
                          ? 'Self registered' 
                          : (patient.doctor_first_name 
                            ? `By Dr. ${patient.doctor_first_name} ${patient.doctor_last_name}` 
                            : 'Not provided')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Email</p>
                      <p className="text-sm">{user.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium">Account Verified</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700">✓ Yes</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">Profile Visibility</span>
                    <Badge className={isPrivate ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                      {isPrivate ? 'Private' : 'Public'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive">Account Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="destructive" className="w-full" onClick={handleLogout}>
                    Logout
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-8 text-center text-muted-foreground">
                <p>Unable to load settings</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard/patient')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

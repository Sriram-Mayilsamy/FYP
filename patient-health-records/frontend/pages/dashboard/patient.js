import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, Check, Clock, CreditCard, Lock, LogOut, ShieldCheck, Unlock, X, FileText, Users, Eye } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatDateIST, formatDateTimeIST } from '@/lib/date';
import {
  approveAccessRequest,
  getPatientAccessRequests,
  getPatientProfile,
  getUser,
  logout,
  rejectAccessRequest,
  terminateAccessRequest,
  updatePatientPrivacy,
} from '../../lib/api';

export default function PatientDashboard() {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [requests, setRequests] = useState({ pending: [], active: [] });
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
    loadDashboard();
  }, [router]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [profileResponse, requestResponse] = await Promise.all([
        getPatientProfile(),
        getPatientAccessRequests(),
      ]);
      setPatient(profileResponse.data?.data || profileResponse.data);
      setRequests(requestResponse.data?.data || { pending: [], active: [] });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load patient dashboard');
      setRequests({ pending: [], active: [] });
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
      setPatient((previous) => ({ ...previous, profile_visibility: response.data?.data?.profile_visibility || nextVisibility }));
      setMessage(`Profile is now ${nextVisibility}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update privacy setting');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (action === 'approve') {
        await approveAccessRequest(requestId);
        setMessage('Doctor access approved.');
      } else if (action === 'reject') {
        await rejectAccessRequest(requestId);
        setMessage('Access request rejected.');
      } else if (action === 'terminate') {
        await terminateAccessRequest(requestId);
        setMessage('Active access session terminated.');
      }
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update access request');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Loading...</main>;
  }

  const isPrivate = patient?.profile_visibility === 'private';

  return (
    <AppShell title="My Health Records" description="Manage your health records and privacy settings" user={user} onLogout={handleLogout}>
      {error && (
        <div className="mb-4 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {message && (
        <div className="mb-4 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <Check className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">{message}</p>
        </div>
      )}

      {/* Non-scrollable layout */}
      <div className="flex h-[calc(100vh-140px)] gap-6">
        {/* Left Sidebar */}
        <div className="w-80 space-y-4 overflow-y-auto pr-2">
          {/* E-Card */}
          {patient ? (
            <div className="relative aspect-[1.586/1] overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-blue-900 to-teal-900 p-5 text-white shadow-lg">
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">E-Card</p>
                    <h2 className="mt-3 text-lg font-bold leading-tight">
                      {patient.first_name} {patient.last_name}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <CreditCard className="h-6 w-6 opacity-60" />
                    {patient.blood_group && (
                      <div className="rounded-md bg-red-500/20 px-2 py-0.5">
                        <p className="text-xs font-bold text-red-200">{patient.blood_group}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <p className="font-semibold uppercase tracking-wider text-white/50">Card Number</p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-wider">{patient.ecard_number}</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-white/50">DOB</p>
                      <p className="font-semibold">{formatDateIST(patient.date_of_birth) || 'N/A'}</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  </div>
                </div>
                {patient.emergency_contact_name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-sm px-5 py-1.5 text-[10px]">
                    <p className="text-white/60">Emergency Contact</p>
                    <p className="font-semibold">{patient.emergency_contact_name} ({patient.emergency_contact_relation || 'N/A'}) - {patient.emergency_contact_phone || 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4 text-center text-sm text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          )}

          {/* Privacy Settings */}
          {patient && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Privacy & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 p-3 transition-colors" style={{ borderColor: isPrivate ? '#ef4444' : '#10b981' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">
                        {isPrivate ? 'Private Profile' : 'Public Profile'}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {isPrivate 
                          ? 'Doctors must request access' 
                          : 'Any approved doctor can view'}
                      </p>
                    </div>
                    <Switch 
                      checked={isPrivate} 
                      onClick={handlePrivacyToggle} 
                      disabled={busy || loading}
                      className="h-5 w-9"
                    />
                  </div>
                </div>

                <div className="space-y-1 rounded-lg bg-muted/40 p-2 text-xs">
                  <p className="font-semibold text-muted-foreground">Account Info</p>
                  <div className="space-y-0.5 text-[11px] text-muted-foreground">
                    <p><span className="font-medium">ID:</span> {patient.govt_id_type}</p>
                    <p className="truncate"><span className="font-medium">Hospital:</span> {patient.nearby_hospital_name || 'N/A'}</p>
                    <p><span className="font-medium">Created:</span> {patient.created_by_self ? 'Self' : 'Doctor'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Visits</p>
                    <p className="text-2xl font-bold">{patient?.visits?.length || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500/30" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Pending</p>
                    <p className="text-2xl font-bold">{requests?.pending?.length || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500/30" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Active</p>
                    <p className="text-2xl font-bold">{requests?.active?.length || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-emerald-500/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* Pending Requests */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Doctor Requests</CardTitle>
                  <Badge className="bg-amber-100 text-amber-700 text-xs">{requests?.pending?.length || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-2">
                {requests?.pending?.length ? (
                  requests.pending.map((request) => (
                    <div key={request.id} className="rounded-lg border p-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 shrink-0">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">Dr. {request.doctor_first_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{request.doctor_hospital_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="xs" 
                          className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs flex-1"
                          disabled={busy} 
                          onClick={() => handleRequestAction(request.id, 'approve')}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="xs" 
                          variant="outline" 
                          className="h-7 text-xs flex-1"
                          disabled={busy} 
                          onClick={() => handleRequestAction(request.id, 'reject')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No pending requests</p>
                )}
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Active Sessions</CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">{requests?.active?.length || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-2">
                {requests?.active?.length ? (
                  requests.active.map((request) => (
                    <div key={request.id} className="group relative overflow-hidden rounded-lg border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 transition-all hover:border-emerald-500/40 hover:shadow-md">
                      <div className="absolute top-0 right-0 h-20 w-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10"></div>
                      <div className="relative space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shrink-0">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-900 truncate">Dr. {request.doctor_first_name} {request.doctor_last_name}</p>
                            <p className="text-xs text-emerald-700 truncate">{request.doctor_specialization || 'General Physician'}</p>
                            <p className="text-xs text-emerald-600 mt-1">{request.doctor_hospital_name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-emerald-700">
                            <Clock className="h-3 w-3" />
                            <span>Until {formatDateIST(request.requested_until)}</span>
                          </div>
                        </div>

                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs w-full border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          disabled={busy} 
                          onClick={() => handleRequestAction(request.id, 'terminate')}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Terminate Access
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="rounded-full bg-muted/30 p-3 mb-2">
                      <Users className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">No active sessions</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push('/dashboard/patient/history')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Visit History
                </Button>
                <Button 
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => router.push('/dashboard/patient/settings')}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Privacy Settings
                </Button>
              </CardContent>
            </Card>

            {/* Health Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Health Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Profile Status</span>
                  <Badge variant={isPrivate ? 'secondary' : 'default'} className="text-xs">
                    {isPrivate ? 'Private' : 'Public'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Last Visit</span>
                  <span className="font-semibold">
                    {patient?.visits?.length ? formatDateIST(patient.visits[0]?.visit_date) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Verified</span>
                  <Badge variant="outline" className="text-xs">✓ Yes</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TabButton({ active, children, ...props }) {
  return (
    <button
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
        active 
          ? 'border-b-2 border-blue-500 bg-blue-50 text-blue-700' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value || 'Not provided'}</p>
    </div>
  );
}

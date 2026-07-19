import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { VisitCard } from '@/components/medical/visit-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateIST } from '@/lib/date';
import {
  getPatientProfile,
  getUser,
  logout,
} from '../../../lib/api';

export default function VisitHistoryPage() {
  const [user, setUser] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'patient') {
      router.push('/login/patient');
      return;
    }
    setUser(currentUser);
    loadVisits();
  }, [router]);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const response = await getPatientProfile();
      setVisits(response.data?.data?.visits || response.data?.visits || []);
    } catch (err) {
      console.error('Unable to load visits:', err);
      setVisits([]);
    } finally {
      setLoading(false);
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
      title="Visit History" 
      description="View all your medical visit records" 
      user={user} 
      onLogout={handleLogout}
    >
      <div className="min-h-screen flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Visit History</h1>
              <p className="text-sm text-muted-foreground">All your medical visit records</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{visits.length} visits</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {loading ? (
            <Card>
              <CardContent className="pt-8 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p>Loading visits...</p>
              </CardContent>
            </Card>
          ) : visits.length > 0 ? (
            <div className="grid gap-4">
              {visits.map((visit) => (
                <VisitCard visit={visit} key={visit.id} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No Visit Records</h3>
                <p className="text-sm text-muted-foreground mb-6">You don't have any medical visit records yet.</p>
                <Button onClick={() => router.push('/dashboard/patient')} variant="outline">
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

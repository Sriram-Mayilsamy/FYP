import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTimeIST } from '@/lib/date';
import { getBlockchainAccessHistory, getBlockchainRecords, getBlockchainStatus, getUser, logout, verifyMedicalRecord } from '@/lib/api';
import { useRouter } from 'next/router';

export default function BlockchainAuditDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [recordId, setRecordId] = useState('');
  const [verification, setVerification] = useState(null);
  const [history, setHistory] = useState([]);
  const [records, setRecords] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'admin') return router.replace('/login/admin');
    setUser(currentUser);
    Promise.all([getBlockchainAccessHistory(), getBlockchainStatus(), getBlockchainRecords()])
      .then(([historyResponse, statusResponse, recordsResponse]) => {
        setHistory(historyResponse.data.data || []);
        setConfigured(statusResponse.data.configured);
        setRecords(recordsResponse.data.data || []);
      })
      .catch(() => setError('Could not load blockchain audit data.'));
  }, [router]);

  const verifyRecord = async (id) => {
    setError(''); setVerification(null);
    setRecordId(String(id));
    try { setVerification((await verifyMedicalRecord(id)).data); }
    catch (err) { setError(err.response?.data?.error || 'Verification failed'); }
  };

  const verify = async (event) => {
    event.preventDefault();
    await verifyRecord(recordId);
  };

  if (!user) return <main className="grid min-h-screen place-items-center">Loading...</main>;
  return <AppShell title="Blockchain Audit Dashboard" description="Demo-only immutable hashes and access audit events. Clinical data is never stored on-chain." user={user} onLogout={() => { logout(); router.push('/'); }} actions={<Button variant="outline" asChild><Link href="/dashboard/admin">Back to Admin</Link></Button>}>
    <Card>
      <CardHeader><CardTitle>Blockchain Connection</CardTitle><CardDescription>Ganache local demo status</CardDescription></CardHeader>
      <CardContent><Badge variant={configured ? 'default' : 'secondary'}>{configured ? 'CONNECTED / CONFIGURED' : 'NOT CONFIGURED'}</Badge></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Medical Record Verification</CardTitle><CardDescription>Recompute the PostgreSQL visit hash and compare it with its on-chain hash.</CardDescription></CardHeader>
      <CardContent className="space-y-4"><form onSubmit={verify} className="flex gap-2"><Input required type="number" min="1" placeholder="Record ID, e.g. 101" value={recordId} onChange={(e) => setRecordId(e.target.value)} /><Button type="submit">Verify record</Button></form>
      {verification && <div className="rounded-md border p-4"><p><Badge variant={verification.status === 'VALID' ? 'default' : 'secondary'}>{verification.status}</Badge></p><p className="mt-2 font-medium">{verification.message}</p>{verification.transactionId && <p className="mt-2 break-all text-sm text-muted-foreground">Transaction: {verification.transactionId}</p>}</div>}
      {error && <p className="text-sm text-destructive">{error}</p>}</CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Medical Record Audit Queue</CardTitle><CardDescription>Choose a visit directly—no manual record ID lookup is required. This table contains identifiers and blockchain metadata only.</CardDescription></CardHeader><CardContent>{records.length === 0 ? <p className="text-sm text-muted-foreground">No medical visits have been created yet.</p> : <Table><TableHeader><TableRow><TableHead>Record ID</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Created</TableHead><TableHead>Blockchain</TableHead><TableHead /></TableRow></TableHeader><TableBody>{records.map((record) => <TableRow key={record.id}><TableCell><Badge variant="outline">#{record.id}</Badge></TableCell><TableCell>{record.patient_first_name} {record.patient_last_name} ({record.patient_ecard})</TableCell><TableCell>Dr. {record.doctor_first_name} {record.doctor_last_name}</TableCell><TableCell>{formatDateTimeIST(record.created_at)}</TableCell><TableCell><Badge variant={record.blockchain_transaction_id ? 'default' : 'secondary'}>{record.blockchain_transaction_id ? 'Registered' : 'Not registered'}</Badge></TableCell><TableCell><Button size="sm" variant="outline" onClick={() => verifyRecord(record.id)}>Verify</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Access History</CardTitle><CardDescription>Permission events recorded in PostgreSQL with their corresponding blockchain request metadata.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Doctor</TableHead><TableHead>Patient ID</TableHead><TableHead>Requested</TableHead><TableHead>Status</TableHead><TableHead>Expiry / revoked</TableHead></TableRow></TableHeader><TableBody>{history.map((request) => <TableRow key={request.id}><TableCell>Dr. {request.doctor_first_name} {request.doctor_last_name}</TableCell><TableCell>{request.patient_ecard}</TableCell><TableCell>{formatDateTimeIST(request.created_at)}</TableCell><TableCell><Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>{request.status}</Badge></TableCell><TableCell>{request.revoked_at ? `Revoked ${formatDateTimeIST(request.revoked_at)}` : formatDateTimeIST(request.requested_until)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </AppShell>;
}

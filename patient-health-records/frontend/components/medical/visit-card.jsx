import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateIST, formatTimeIST } from '@/lib/date';

export function VisitCard({ visit, detailedHref }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{formatDateIST(visit.visit_date)} {formatTimeIST(visit.visit_time)}</CardTitle>
          <Badge variant="secondary">Dr. {visit.doctor_first_name} {visit.doctor_last_name}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground">
        <p><span className="text-foreground">Hospital:</span> {visit.hospital_name || 'Not provided'}</p>
        <p><span className="text-foreground">Vitals:</span> BP {visit.systolic_bp || '-'} / {visit.diastolic_bp || '-'}, Sugar {visit.blood_sugar_random_mg_dl || '-'}, SpO2 {visit.oxygen_saturation_percent || '-'}</p>
        <p><span className="text-foreground">Complaint:</span> {visit.chief_complaint || 'Not provided'}</p>
        <p><span className="text-foreground">Diagnosis:</span> {visit.diagnosis || 'Not provided'}</p>
        <p><span className="text-foreground">Prescription:</span> {visit.prescription || 'Not provided'}</p>
        {detailedHref && (
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link href={detailedHref}>View detailed</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

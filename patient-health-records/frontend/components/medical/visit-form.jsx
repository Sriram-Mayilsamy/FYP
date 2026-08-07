import { BrainCircuit, FileUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const visitFields = {
  visit_date: '',
  visit_time: '',
  hospital_name: '',
  department: '',
  chief_complaint: '',
  symptoms: '',
  diagnosis: '',
  notes: '',
  height_cm: '',
  weight_kg: '',
  temperature_c: '',
  pulse_bpm: '',
  respiratory_rate_bpm: '',
  oxygen_saturation_percent: '',
  systolic_bp: '',
  diastolic_bp: '',
  blood_sugar_fasting_mg_dl: '',
  blood_sugar_random_mg_dl: '',
  blood_sugar_pp_mg_dl: '',
  hemoglobin_g_dl: '',
  prescription: '',
  injections_given: '',
  lab_tests_requested: '',
  follow_up_date: '',
};

const numericFields = [
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
];

export function AIReportImporter({ importing, importSource, onImport }) {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary p-2 text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">AI Medical Report Importer</CardTitle>
            <CardDescription>Upload a PDF, image, or text report. AI fills the form, doctor reviews, then saves.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent">
          <FileUp className="mr-2 h-4 w-4" />
          {importing ? 'Extracting...' : 'Choose Report'}
          <input
            type="file"
            className="sr-only"
            accept=".pdf,image/*,.txt,text/plain"
            disabled={importing}
            onChange={onImport}
          />
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          {importSource ? `${importSource.filename} imported` : 'Review all AI-filled values before saving.'}
        </div>
      </CardContent>
    </Card>
  );
}

export function VisitForm({ form, onChange, onSubmit, submitLabel = 'Save Visit' }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Visit Date" name="visit_date" type="date" value={form.visit_date} onChange={onChange} />
        <Field label="Visit Time" name="visit_time" type="time" value={form.visit_time} onChange={onChange} />
        <Field label="Hospital" name="hospital_name" value={form.hospital_name} onChange={onChange} />
        <Field label="Department" name="department" value={form.department} onChange={onChange} />
        <Field label="Follow-up Date" name="follow_up_date" type="date" value={form.follow_up_date} onChange={onChange} />
        {numericFields.map(([name, label]) => (
          <Field key={name} label={label} name={name} value={form[name]} onChange={onChange} />
        ))}
      </div>
      <TextField label="Chief Complaint" name="chief_complaint" value={form.chief_complaint} onChange={onChange} />
      <TextField label="Symptoms" name="symptoms" value={form.symptoms} onChange={onChange} />
      <TextField label="Diagnosis" name="diagnosis" value={form.diagnosis} onChange={onChange} />
      <TextField label="Prescription" name="prescription" value={form.prescription} onChange={onChange} />
      <TextField label="Injections Given" name="injections_given" value={form.injections_given} onChange={onChange} />
      <TextField label="Lab Tests Requested" name="lab_tests_requested" value={form.lab_tests_requested} onChange={onChange} />
      <TextField label="Doctor Notes" name="notes" value={form.notes} onChange={onChange} />
      <Button type="submit">{submitLabel}</Button>
    </form>
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

function TextField({ label, ...props }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea {...props} />
    </div>
  );
}

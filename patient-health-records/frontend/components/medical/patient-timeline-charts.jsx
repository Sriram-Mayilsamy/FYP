import { useState, useMemo } from 'react';
import { 
  Activity, 
  AlertCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  BrainCircuit, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  Droplet, 
  Heart, 
  LineChart as LineChartIcon, 
  RefreshCw, 
  ShieldAlert, 
  Sparkles, 
  Stethoscope, 
  Thermometer, 
  Weight, 
  Zap 
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyzePatientTimeline } from '@/lib/api';

const METRICS_CONFIG = {
  blood_pressure: {
    id: 'blood_pressure',
    label: 'Blood Pressure',
    shortLabel: 'Blood Pressure',
    unit: 'mmHg',
    icon: Heart,
    color: '#e11d48',
    gradientId: 'bpGradient',
    lines: [
      { key: 'systolic', name: 'Systolic BP', color: '#f43f5e', area: true },
      { key: 'diastolic', name: 'Diastolic BP', color: '#3b82f6', area: false }
    ],
    normalRange: { min: 60, max: 120 },
    normalBand: { y1: 60, y2: 120, label: 'Normal BP Zone (60-120)' },
    refLines: [
      { y: 120, label: 'Systolic Max (120)', color: '#f43f5e' },
      { y: 80, label: 'Diastolic Max (80)', color: '#3b82f6' }
    ]
  },
  pulse_bpm: {
    id: 'pulse_bpm',
    label: 'Heart Rate / Pulse',
    shortLabel: 'Heart Rate',
    unit: 'bpm',
    icon: Activity,
    color: '#10b981',
    gradientId: 'pulseGradient',
    lines: [{ key: 'pulse', name: 'Heart Rate', color: '#10b981', area: true }],
    normalRange: { min: 60, max: 100 },
    normalBand: { y1: 60, y2: 100, label: 'Normal Range (60 - 100 bpm)' },
    refLines: [
      { y: 60, label: 'Min Normal (60)', color: '#10b981' },
      { y: 100, label: 'Max Normal (100)', color: '#f43f5e' }
    ]
  },
  oxygen_saturation_percent: {
    id: 'oxygen_saturation_percent',
    label: 'Oxygen Saturation (SpO2)',
    shortLabel: 'SpO2 Saturation',
    unit: '%',
    icon: Zap,
    color: '#0284c7',
    gradientId: 'spo2Gradient',
    lines: [{ key: 'spo2', name: 'SpO2', color: '#0ea5e9', area: true }],
    normalRange: { min: 95, max: 100 },
    normalBand: { y1: 95, y2: 100, label: 'Optimal SpO2 (95% - 100%)' },
    refLines: [{ y: 95, label: 'Hypoxia Threshold (95%)', color: '#ef4444' }]
  },
  temperature_c: {
    id: 'temperature_c',
    label: 'Body Temperature',
    shortLabel: 'Temperature',
    unit: '°C',
    icon: Thermometer,
    color: '#f59e0b',
    gradientId: 'tempGradient',
    lines: [{ key: 'temp', name: 'Body Temp', color: '#f59e0b', area: true }],
    normalRange: { min: 36.0, max: 37.5 },
    normalBand: { y1: 36.0, y2: 37.5, label: 'Normal Temp (36.0°C - 37.5°C)' },
    refLines: [{ y: 37.5, label: 'Fever Cutoff (37.5°C)', color: '#ef4444' }]
  },
  blood_sugar: {
    id: 'blood_sugar',
    label: 'Blood Sugar',
    shortLabel: 'Blood Glucose',
    unit: 'mg/dL',
    icon: Droplet,
    color: '#8b5cf6',
    gradientId: 'sugarGradient',
    lines: [
      { key: 'fasting', name: 'Fasting Sugar', color: '#a855f7', area: true },
      { key: 'random', name: 'Random Sugar', color: '#ec4899', area: false },
      { key: 'pp', name: 'Post-Prandial', color: '#6366f1', area: false }
    ],
    normalRange: { min: 70, max: 140 },
    normalBand: { y1: 70, y2: 100, label: 'Normal Fasting (70 - 100 mg/dL)' },
    refLines: [{ y: 100, label: 'Fasting Max (100)', color: '#a855f7' }]
  },
  respiratory_rate_bpm: {
    id: 'respiratory_rate_bpm',
    label: 'Respiratory Rate',
    shortLabel: 'Respiratory Rate',
    unit: 'bpm',
    icon: Stethoscope,
    color: '#0d9488',
    gradientId: 'respGradient',
    lines: [{ key: 'resp', name: 'Respiratory Rate', color: '#14b8a6', area: true }],
    normalRange: { min: 12, max: 20 },
    normalBand: { y1: 12, y2: 20, label: 'Normal (12 - 20 bpm)' },
    refLines: [
      { y: 12, label: 'Min (12)', color: '#14b8a6' },
      { y: 20, label: 'Max (20)', color: '#ef4444' }
    ]
  },
  hemoglobin_g_dl: {
    id: 'hemoglobin_g_dl',
    label: 'Hemoglobin (Hb)',
    shortLabel: 'Hemoglobin',
    unit: 'g/dL',
    icon: LineChartIcon,
    color: '#d946ef',
    gradientId: 'hbGradient',
    lines: [{ key: 'hb', name: 'Hemoglobin', color: '#d946ef', area: true }],
    normalRange: { min: 12.0, max: 17.5 },
    normalBand: { y1: 12.0, y2: 17.5, label: 'Normal Hb (12.0 - 17.5 g/dL)' },
    refLines: [{ y: 12.0, label: 'Anemia Threshold (12.0)', color: '#ef4444' }]
  },
  weight_bmi: {
    id: 'weight_bmi',
    label: 'Weight & BMI',
    shortLabel: 'Weight / BMI',
    unit: 'kg / BMI',
    icon: Weight,
    color: '#6366f1',
    gradientId: 'bmiGradient',
    lines: [
      { key: 'weight', name: 'Weight (kg)', color: '#6366f1', area: true },
      { key: 'bmi', name: 'BMI (kg/m²)', color: '#8b5cf6', area: false }
    ],
    normalRange: { min: 18.5, max: 24.9 },
    normalBand: { y1: 18.5, y2: 24.9, label: 'Healthy BMI (18.5 - 24.9)' },
    refLines: [{ y: 25, label: 'Overweight (BMI 25)', color: '#f59e0b' }]
  }
};

export function PatientTimelineCharts({ patientId, visits = [] }) {
  const [activeMetric, setActiveMetric] = useState('blood_pressure');
  const [aiAnalyses, setAiAnalyses] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Process visits into sorted timeline data
  const chartData = useMemo(() => {
    if (!visits || visits.length === 0) return [];

    const sorted = [...visits].sort((a, b) => {
      const dateA = new Date(a.visit_date + 'T' + (a.visit_time || '00:00:00'));
      const dateB = new Date(b.visit_date + 'T' + (b.visit_time || '00:00:00'));
      return dateA - dateB;
    });

    return sorted.map((v) => {
      const dateLabel = v.visit_date
        ? new Date(v.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
        : 'N/A';

      const heightInM = v.height_cm ? Number(v.height_cm) / 100 : null;
      const weightInKg = v.weight_kg ? Number(v.weight_kg) : null;
      let bmi = null;
      if (weightInKg && heightInM && heightInM > 0) {
        bmi = Number((weightInKg / (heightInM * heightInM)).toFixed(1));
      }

      return {
        date: dateLabel,
        fullDate: v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Unknown',
        systolic: v.systolic_bp != null ? Number(v.systolic_bp) : null,
        diastolic: v.diastolic_bp != null ? Number(v.diastolic_bp) : null,
        pulse: v.pulse_bpm != null ? Number(v.pulse_bpm) : null,
        spo2: v.oxygen_saturation_percent != null ? Number(v.oxygen_saturation_percent) : null,
        temp: v.temperature_c != null ? Number(v.temperature_c) : null,
        fasting: v.blood_sugar_fasting_mg_dl != null ? Number(v.blood_sugar_fasting_mg_dl) : null,
        random: v.blood_sugar_random_mg_dl != null ? Number(v.blood_sugar_random_mg_dl) : null,
        pp: v.blood_sugar_pp_mg_dl != null ? Number(v.blood_sugar_pp_mg_dl) : null,
        resp: v.respiratory_rate_bpm != null ? Number(v.respiratory_rate_bpm) : null,
        hb: v.hemoglobin_g_dl != null ? Number(v.hemoglobin_g_dl) : null,
        weight: weightInKg,
        bmi: bmi,
        notes: v.notes || v.chief_complaint || ''
      };
    });
  }, [visits]);

  const currentConfig = METRICS_CONFIG[activeMetric];

  // Latest values map for metric quick cards
  const latestMetrics = useMemo(() => {
    if (!chartData.length) return {};
    const last = chartData[chartData.length - 1];
    return {
      blood_pressure: last.systolic && last.diastolic ? `${last.systolic}/${last.diastolic}` : null,
      pulse_bpm: last.pulse ? `${last.pulse}` : null,
      oxygen_saturation_percent: last.spo2 ? `${last.spo2}` : null,
      temperature_c: last.temp ? `${last.temp}` : null,
      blood_sugar: last.fasting || last.random || last.pp ? `${last.fasting || last.random || last.pp}` : null,
      respiratory_rate_bpm: last.resp ? `${last.resp}` : null,
      hemoglobin_g_dl: last.hb ? `${last.hb}` : null,
      weight_bmi: last.weight ? `${last.weight}` : null
    };
  }, [chartData]);

  // Data points count for active metric
  const dataPointsCount = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.filter((d) => {
      if (activeMetric === 'blood_pressure') return d.systolic != null || d.diastolic != null;
      if (activeMetric === 'pulse_bpm') return d.pulse != null;
      if (activeMetric === 'oxygen_saturation_percent') return d.spo2 != null;
      if (activeMetric === 'temperature_c') return d.temp != null;
      if (activeMetric === 'respiratory_rate_bpm') return d.resp != null;
      if (activeMetric === 'blood_sugar') return d.fasting != null || d.random != null || d.pp != null;
      if (activeMetric === 'hemoglobin_g_dl') return d.hb != null;
      if (activeMetric === 'weight_bmi') return d.weight != null || d.bmi != null;
      return false;
    }).length;
  }, [chartData, activeMetric]);

  // Smart Y-Axis Domain with padding
  const yAxisDomain = useMemo(() => {
    if (!chartData.length) return ['auto', 'auto'];

    const values = [];
    chartData.forEach((d) => {
      if (activeMetric === 'blood_pressure') {
        if (d.systolic != null) values.push(d.systolic);
        if (d.diastolic != null) values.push(d.diastolic);
      } else if (activeMetric === 'pulse_bpm' && d.pulse != null) values.push(d.pulse);
      else if (activeMetric === 'oxygen_saturation_percent' && d.spo2 != null) values.push(d.spo2);
      else if (activeMetric === 'temperature_c' && d.temp != null) values.push(d.temp);
      else if (activeMetric === 'respiratory_rate_bpm' && d.resp != null) values.push(d.resp);
      else if (activeMetric === 'blood_sugar') {
        if (d.fasting != null) values.push(d.fasting);
        if (d.random != null) values.push(d.random);
        if (d.pp != null) values.push(d.pp);
      } else if (activeMetric === 'hemoglobin_g_dl' && d.hb != null) values.push(d.hb);
      else if (activeMetric === 'weight_bmi') {
        if (d.weight != null) values.push(d.weight);
        if (d.bmi != null) values.push(d.bmi);
      }
    });

    if (values.length === 0) return ['auto', 'auto'];
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = Math.max((maxVal - minVal) * 0.25, 5);
    return [Math.floor(Math.max(0, minVal - padding)), Math.ceil(maxVal + padding)];
  }, [chartData, activeMetric]);

  const handleRunAiAnalysis = async () => {
    if (!patientId) return;
    setAnalyzing(true);
    setError('');

    try {
      const response = await analyzePatientTimeline(patientId, activeMetric);
      const evalData = response.data.evaluation || response.data.analysis;
      setAiAnalyses((prev) => ({
        ...prev,
        [activeMetric]: evalData
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'AI timeline analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const currentAiAnalysis = aiAnalyses[activeMetric];

  return (
    <Card className="border shadow-sm bg-white text-slate-900 overflow-hidden rounded-2xl">
      {/* Top Header Bar (Light Theme) */}
      <div className="bg-white px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg ring-2 ring-indigo-400/30">
              <BrainCircuit className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Patient Health Timeline & AI Diagnostic Engine
                </h3>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[11px] uppercase tracking-wider font-semibold">
                  Live Vitals
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Longitudinal vital sign trend monitoring & Groq AI anomaly detection over patient visits
              </p>
            </div>
          </div>

          <Button
            onClick={handleRunAiAnalysis}
            disabled={analyzing || dataPointsCount === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-sm border border-blue-100 px-4 py-2 rounded-md transition-all duration-150"
          >
            {analyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin text-indigo-200" />
                Analyzing Timeline...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4 text-amber-300 fill-amber-300" />
                AI Analyze {currentConfig.shortLabel}
              </>
            )}
          </Button>
        </div>

        {/* Metric Quick Cards Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-5 pt-4 border-t border-gray-100">
          {Object.values(METRICS_CONFIG).map((metric) => {
            const Icon = metric.icon;
            const isActive = activeMetric === metric.id;
            const val = latestMetrics[metric.id];

            return (
              <button
                key={metric.id}
                onClick={() => setActiveMetric(metric.id)}
                className={`flex flex-col justify-between p-2.5 rounded-xl text-left transition-all duration-150 border ${
                  isActive
                    ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm'
                    : 'bg-white border-gray-100 hover:bg-gray-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[11px] font-medium truncate ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                    {metric.shortLabel}
                  </span>
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold tracking-tight text-slate-800">
                    {val ? val : '--'}
                  </span>
                  <span className="text-[10px] text-slate-600 uppercase">{metric.unit}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <CardContent className="p-6 space-y-6 bg-white">
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Visual Graph Canvas Area */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: currentConfig.color }}
              />
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                {currentConfig.label} Timeline Trend
              </h4>
              <Badge className="bg-gray-50 text-slate-700 border-gray-100 text-xs px-2.5 py-0.5">
                {dataPointsCount === 1 ? '1 Visit Record' : `${dataPointsCount} Visit Records`}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-200" />
                Normal Zone ({currentConfig.normalRange.min} - {currentConfig.normalRange.max} {currentConfig.unit})
              </span>
            </div>
          </div>

          {dataPointsCount === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center text-slate-600 border-2 border-dashed border-gray-200 rounded-xl p-6 bg-gray-50">
              <Activity className="h-10 w-10 text-gray-400 mb-3" />
              <p className="font-semibold text-sm text-slate-700">No data points logged for {currentConfig.label}</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                Add clinical entries with {currentConfig.label} values during patient visits to render dynamic trajectory charts.
              </p>
            </div>
          ) : (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 35, left: 10, bottom: 15 }}>
                  <defs>
                    <linearGradient id={currentConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    tickLine={{ stroke: '#e6eef6' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    domain={yAxisDomain}
                    tickLine={{ stroke: '#e6eef6' }}
                    unit={` ${currentConfig.unit}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-xs space-y-1 text-slate-900 min-w-[180px]">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1.5">
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-blue-500" />
                                {data.fullDate}
                              </span>
                            </div>
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between gap-4 font-semibold">
                                <span style={{ color: entry.color }}>{entry.name}:</span>
                                <span className="text-slate-800 bg-gray-50 px-2 py-0.5 rounded text-[11px]">
                                  {entry.value} {currentConfig.unit}
                                </span>
                              </div>
                            ))}
                            {data.notes && (
                              <p className="text-[11px] text-slate-600 pt-1.5 border-t border-gray-100 italic mt-1 leading-relaxed">
                                &quot;{data.notes}&quot;
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />

                  {/* Normal Range Shaded Zone */}
                  {currentConfig.normalBand && (
                    <ReferenceArea
                      y1={currentConfig.normalBand.y1}
                      y2={currentConfig.normalBand.y2}
                      fill="#22c55e"
                      fillOpacity={0.08}
                      stroke="#22c55e"
                      strokeOpacity={0.2}
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Threshold Reference Lines */}
                  {currentConfig.refLines?.map((ref, idx) => (
                    <ReferenceLine
                      key={idx}
                      y={ref.y}
                      stroke={ref.color}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: ref.label,
                        fill: ref.color,
                        fontSize: 11,
                        position: 'insideTopRight',
                        fontWeight: 600
                      }}
                    />
                  ))}

                  {/* Gradient Area & Line plots */}
                  {currentConfig.lines.map((line) => (
                    <g key={line.key}>
                      {line.area && (
                        <Area
                          type="monotone"
                          dataKey={line.key}
                          stroke="none"
                          fill={`url(#${currentConfig.gradientId})`}
                          connectNulls
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey={line.key}
                        name={line.name}
                        stroke={line.color}
                        strokeWidth={3}
                        dot={{ r: 5, strokeWidth: 2, fill: '#0f172a', stroke: line.color }}
                        activeDot={{ r: 8, strokeWidth: 3, fill: '#ffffff', stroke: line.color }}
                        connectNulls
                      />
                    </g>
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* AI Health Assessment Result Report */}
        {currentAiAnalysis && (
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    AI Clinical Timeline Assessment
                  </h4>
                  <p className="text-xs text-slate-600">
                    Groq LLM Temporal Analysis across {currentAiAnalysis.data_points_count || dataPointsCount} logged parameters
                  </p>
                </div>
              </div>

              {/* Status Badge Indicator */}
              <div>
                {currentAiAnalysis.status === 'NORMAL' && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-4 py-1.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    NORMAL TIMELINE
                  </Badge>
                )}
                {currentAiAnalysis.status === 'BORDERLINE' && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 px-4 py-1.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    BORDERLINE / FLUCTUATING
                  </Badge>
                )}
                {currentAiAnalysis.status === 'ABNORMAL' && (
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 px-4 py-1.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-500/10">
                    <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
                    ABNORMAL TIMELINE DETECTED
                  </Badge>
                )}
              </div>
            </div>

            {/* Structured Findings */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Executive Summary */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                  Executive Summary
                </h5>
                <p className="text-xs leading-relaxed text-slate-700 font-medium">
                  {currentAiAnalysis.summary}
                </p>

                {currentAiAnalysis.trend && (
                    <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Trend Classification:</span>
                    <Badge variant="outline" className="text-[11px] border-gray-100 text-blue-700 bg-white/0">
                      {currentAiAnalysis.trend}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Key Observations */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  Temporal Key Observations
                </h5>
                {currentAiAnalysis.key_observations && currentAiAnalysis.key_observations.length > 0 ? (
                  <ul className="space-y-2">
                    {currentAiAnalysis.key_observations.map((obs, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2 text-slate-700 leading-relaxed">
                        <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-600 italic">No specific anomalies detected.</p>
                )}
              </div>
            </div>

            {/* Actionable Clinical Guidance Box */}
            {currentAiAnalysis.clinical_recommendation && (
              <div className="bg-white p-4 rounded-xl border border-gray-100 text-xs flex items-start gap-3">
                <Stethoscope className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 tracking-wide uppercase text-[11px] block">
                    Physician Action Plan & Guidance
                  </span>
                  <p className="text-slate-700 leading-relaxed">
                    {currentAiAnalysis.clinical_recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

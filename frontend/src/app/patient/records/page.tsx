"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { Loader2, FlaskConical, Pill, Stethoscope, Activity } from "lucide-react";

type Lab = { id: string; testName: string; resultValue?: string; referenceRange?: string; status: string; orderedAt: string; };
type Rx = { id: string; medication: string; dosage: string; frequency: string; status: string; prescribedAt: string; };
type Dx = { id: string; condition: string; code?: string; status: string; diagnosedAt: string; };
type Vital = { id: string; bloodPressure?: string; heartRate?: number; temperature?: number; oxygenSat?: number; recordedAt: string; };
type Tab = "labs" | "prescriptions" | "diagnoses" | "vitals";

export default function PatientRecords() {
  const [tab, setTab] = useState<Tab>("labs");
  const [labs, setLabs] = useState<Lab[]>([]);
  const [rxs, setRxs] = useState<Rx[]>([]);
  const [dxs, setDxs] = useState<Dx[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    Promise.all([
      apiFetch<{ items: Lab[] }>("/records/labs"),
      apiFetch<{ items: Rx[] }>("/records/prescriptions"),
      apiFetch<{ items: Dx[] }>("/records/diagnoses"),
      apiFetch<{ items: Vital[] }>("/records/vitals"),
    ]).then(([l, r, d, v]) => { setLabs(l.items); setRxs(r.items); setDxs(d.items); setVitals(v.items); })
      .catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "labs", label: "Lab Results", icon: FlaskConical },
    { key: "prescriptions", label: "Prescriptions", icon: Pill },
    { key: "diagnoses", label: "Diagnoses", icon: Stethoscope },
    { key: "vitals", label: "Vitals", icon: Activity },
  ];

  return (
    <AppShell portal="patient">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">My Medical Records</h1>
        <p className="text-sm text-slate-500">Your clinical data, kept safe and accessible.</p>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.key ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
      : error ? <Card><p className="p-6 text-red-600">{error}</p></Card>
      : (
        <Card>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tab === "labs" && labs.map((l) => (
              <div key={l.id} className="p-4">
                <div className="flex justify-between"><span className="font-medium dark:text-white">{l.testName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${l.status === "COMPLETED" ? "bg-green-100 text-green-700" : l.status === "ABNORMAL" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{l.status}</span></div>
                <p className="text-sm text-slate-500 mt-1">{l.resultValue || "Awaiting result"} {l.referenceRange ? `(ref: ${l.referenceRange})` : ""}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(l.orderedAt).toLocaleDateString()}</p>
              </div>
            ))}
            {tab === "prescriptions" && rxs.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex justify-between"><span className="font-medium dark:text-white">{r.medication}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${r.status === "ACTIVE" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{r.status}</span></div>
                <p className="text-sm text-slate-500 mt-1">{r.dosage} - {r.frequency}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(r.prescribedAt).toLocaleDateString()}</p>
              </div>
            ))}
            {tab === "diagnoses" && dxs.map((d) => (
              <div key={d.id} className="p-4">
                <div className="flex justify-between"><span className="font-medium dark:text-white">{d.condition} {d.code ? <span className="text-xs text-slate-400">({d.code})</span> : null}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${d.status === "ACTIVE" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{d.status}</span></div>
                <p className="text-xs text-slate-400 mt-1">{new Date(d.diagnosedAt).toLocaleDateString()}</p>
              </div>
            ))}
            {tab === "vitals" && vitals.map((v) => (
              <div key={v.id} className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {v.bloodPressure && <div><span className="text-slate-400 text-xs block">BP</span><span className="font-medium dark:text-white">{v.bloodPressure}</span></div>}
                {v.heartRate != null && <div><span className="text-slate-400 text-xs block">HR</span><span className="font-medium dark:text-white">{v.heartRate} bpm</span></div>}
                {v.temperature != null && <div><span className="text-slate-400 text-xs block">Temp</span><span className="font-medium dark:text-white">{v.temperature} C</span></div>}
                {v.oxygenSat != null && <div><span className="text-slate-400 text-xs block">SpO2</span><span className="font-medium dark:text-white">{v.oxygenSat}%</span></div>}
                <div className="col-span-full text-xs text-slate-400 mt-1">{new Date(v.recordedAt).toLocaleString()}</div>
              </div>
            ))}
            {((tab === "labs" && !labs.length) || (tab === "prescriptions" && !rxs.length) || (tab === "diagnoses" && !dxs.length) || (tab === "vitals" && !vitals.length)) && (
              <p className="p-6 text-center text-slate-500 text-sm">No {tab} recorded yet.</p>
            )}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
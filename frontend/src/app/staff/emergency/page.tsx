"use client";

import { useState } from "react";
import PatientSearch from "@/components/PatientSearch";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PURPOSES = [["UNCONSCIOUS_PATIENT", "Patient is unconscious"], ["LIFE_THREATENING", "Life-threatening emergency"], ["SERIOUS_HARM", "Serious harm risk"], ["CRITICAL_CARE", "Urgent critical care"]];
const SCOPES = [["VIEW_PROFILE", "Profile"], ["VIEW_DOCUMENTS", "Documents"], ["VIEW_HISTORY", "Access history"]];

export default function EmergencyAccessPage() {
  const [patientId, setPatientId] = useState("");
  const [purpose, setPurpose] = useState("UNCONSCIOUS_PATIENT");
  const [justification, setJustification] = useState("");
  const [scope, setScope] = useState<string[]>(["VIEW_PROFILE"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toggle = (s: string) => setScope(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      const r = await apiFetch<any>("/emergency/access", { method: "POST", body: JSON.stringify({ patientId, purpose, justification, scope }) });
      setSuccess(`Emergency access granted. ${r.warning || ""}`);
      setPatientId(""); setJustification(""); setScope(["VIEW_PROFILE"]);
    } catch (e: any) {
      if (e.message?.includes("already_active")) setError("An active emergency grant already exists for this patient.");
      else if (e.message?.includes("justification_too_short")) setError("Justification must be at least 20 characters.");
      else setError(e.message);
    } finally { setBusy(false); }
  };

  const canSubmit = patientId.length === 36 && justification.length >= 20 && scope.length > 0;

  return (
    <AppShell portal="staff">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/staff" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-500 flex items-center gap-2"><ShieldAlert className="w-6 h-6" /> Emergency Break-Glass</h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300 mb-6">
          <strong>This is strictly audited.</strong> Break-glass access bypasses normal consent and is for life-threatening situations only. Every use is immediately logged and reviewed.
        </div>

        {error && <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
        {success && <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {success}</div>}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Patient ID (UUID)</label><Input required value={patientId} onChange={(e) => setPatientId(e.target.value.trim())} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></div>
            <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Emergency Purpose</label><select className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={purpose} onChange={(e) => setPurpose(e.target.value)}>{PURPOSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-slate-300">Access Scope</label>
              <div className="flex flex-wrap gap-4">{SCOPES.map(([v, l]) => <label key={v} className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={scope.includes(v)} onChange={() => toggle(v)} className="rounded" /> {l}</label>)}</div>
            </div>
            <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Justification (min 20 chars, audited)</label><textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" rows={4} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Describe the clinical emergency and why normal consent cannot be obtained." /><span className="text-xs text-slate-500">{justification.length}/20 minimum</span></div>
            <Button type="submit" variant="danger" disabled={!canSubmit || busy} isLoading={busy} className="w-full">Request Emergency Access</Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
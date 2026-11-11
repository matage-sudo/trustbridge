"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function RequestForm() {
  const params = useSearchParams();
  const patientId = params.get("patientId") || "";
  const [reason, setReason] = useState("");
  const [purpose, setPurpose] = useState("TREATMENT");
  const [hours, setHours] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess(""); setSubmitting(true);
    try {
      await apiFetch("/access-requests", { method: "POST", body: JSON.stringify({ patientId, reason, purpose, requestedDurationHours: hours }) });
      setSuccess("Access request submitted. The patient will see it in their pending approvals.");
      setReason("");
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  };

  return (
    <Card className="p-6 space-y-5">
      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3"><AlertTriangle className="w-4 h-4" />{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm p-3"><CheckCircle className="w-4 h-4" />{success}</div>}
      
      <p className="text-sm text-slate-600 dark:text-slate-400"><strong className="text-slate-900 dark:text-white">Patient ID:</strong> <code className="text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded">{patientId || "Not provided"}</code></p>
      
      <form onSubmit={submit} className="space-y-4">
        <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Purpose</label><select className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="TREATMENT">Treatment</option><option value="DIAGNOSIS">Diagnosis</option><option value="EMERGENCY">Emergency</option><option value="ADMIN">Administrative</option></select></div>
        <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Reason (shown to patient)</label><textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} placeholder="e.g. Reviewing lab results for ongoing treatment" /></div>
        <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Duration (hours)</label><Input type="number" min={1} max={72} value={hours} onChange={(e) => setHours(Number(e.target.value))} /></div>
        <Button type="submit" isLoading={submitting} disabled={reason.length < 10} className="w-full"><Send className="w-4 h-4 mr-2" /> Submit Request</Button>
      </form>
    </Card>
  );
}

export default function RequestAccessPage() {
  return (
    <AppShell portal="staff">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/staff" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-bold dark:text-white">Request Patient Access</h1>
        </div>
        <Suspense fallback={<div>Loading form...</div>}><RequestForm /></Suspense>
      </div>
    </AppShell>
  );
}
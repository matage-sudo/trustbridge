"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";

function RequestAccessForm() {
  const params = useSearchParams();
  const patientId = params.get("patientId") || "";
  const [reason, setReason] = useState("");
  const [purpose, setPurpose] = useState("TREATMENT");
  const [hours, setHours] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      await apiFetch("/access-requests", {
        method: "POST",
        body: JSON.stringify({ patientId, reason, purpose, requestedDurationHours: hours }),
      });
      setSuccess("Access request submitted. The patient will see it in their pending approvals.");
      setReason("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm p-3"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
      {success && <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-sm p-3"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{success}</span></div>}

      <p className="text-sm text-gray-600 dark:text-gray-400"><strong className="text-gray-900 dark:text-white">Patient ID:</strong> <code className="text-xs">{patientId}</code></p>

      <label className="block text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Purpose</span>
        <select className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="TREATMENT">Treatment</option>
          <option value="DIAGNOSIS">Diagnosis</option>
          <option value="EMERGENCY">Emergency</option>
          <option value="ADMIN">Administrative</option>
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Reason (this will be shown to the patient)</span>
        <textarea className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} placeholder="e.g. Reviewing lab results for ongoing treatment" />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Requested duration (hours)</span>
        <input type="number" min={1} max={72} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
      </label>

      <div className="flex justify-end">
        <button type="submit" disabled={submitting || reason.length < 10} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit request
        </button>
      </div>
    </form>
  );
}

export default function RequestAccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/staff" className="text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Request patient access</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
          <RequestAccessForm />
        </Suspense>
      </main>
    </div>
  );
}
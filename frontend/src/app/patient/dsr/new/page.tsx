"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";

const TYPES = [
  ["ACCESS", "Access — get a copy of my record"],
  ["CORRECTION", "Correction — fix inaccurate information"],
  ["ERASURE", "Erasure — delete data where applicable"],
  ["RESTRICTION", "Restriction — limit how my data is used"],
  ["OBJECTION", "Objection — object to certain processing"],
  ["PORTABILITY", "Portability — transfer to another provider"],
  ["COMPLAINT", "Complaint — privacy concern"],
];

export default function NewDSRPage() {
  const [type, setType] = useState("ACCESS");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const r = await apiFetch<{ referenceNumber: string }>("/me/dsr", {
        method: "POST",
        body: JSON.stringify({ requestType: type, description }),
      });
      setSuccess(`Request submitted. Reference: ${r.referenceNumber}`);
      setDescription("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/patient" className="text-gray-500 hover:text-gray-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">New privacy request</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm p-3"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
        {success && <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-sm p-3"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{success}</span></div>}
        <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <label className="block text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Request type</span>
            <select className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Describe your request</span>
            <textarea className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} required minLength={20} placeholder="Be specific — this will be reviewed by our privacy team." />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting || description.length < 20} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit request
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
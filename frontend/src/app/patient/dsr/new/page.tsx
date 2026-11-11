"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function DsrPage() {
  const [type, setType] = useState("ACCESS");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await apiFetch("/rights-requests", { method: "POST", body: JSON.stringify({ type, description: details }) });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell portal="patient">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/patient" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white">Privacy Request (DSR)</h1><p className="text-sm text-slate-500">Submit a Data Subject Request under the Data Protection Act.</p></div>
        </div>

        {success ? (
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold dark:text-white mb-2">Request Submitted</h2>
            <p className="text-slate-500 mb-6">Our Privacy Officer will review your request and respond within 30 days.</p>
            <Link href="/patient"><Button>Return to Dashboard</Button></Link>
          </Card>
        ) : (
          <Card className="p-6">
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Request Type</label>
                <select className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="ACCESS">Access My Data</option>
                  <option value="CORRECTION">Correct My Data</option>
                  <option value="DELETION">Delete My Data</option>
                  <option value="PORTABILITY">Export My Data</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Details</label>
                <textarea className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" rows={4} required value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Please provide any specific details to help us process your request." />
              </div>
              <Button type="submit" isLoading={loading} className="w-full"><Send className="w-4 h-4 mr-2" /> Submit Request</Button>
            </form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
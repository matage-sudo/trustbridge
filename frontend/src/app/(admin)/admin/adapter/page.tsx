"use client";

import Link from "next/link";
import { ArrowLeft, Server, Activity, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";

export default function AdapterHealthPage() {
  const adapters = [
    { id: "1", name: "Legacy EMR System", mode: "API (FHIR)", lastSync: "2 mins ago", records: "1,204", status: "HEALTHY" },
    { id: "2", name: "Radiology PACS", mode: "Read-Only DB", lastSync: "5 mins ago", records: "342", status: "HEALTHY" },
    { id: "3", name: "Billing System", mode: "Message Queue", lastSync: "1 hr ago", records: "56", status: "WARNING" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to SOC
        </Link>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-trust-ink dark:text-white">Adapter Health</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Monitor connections to existing hospital systems.</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
            <RefreshCw className="h-4 w-4" /> Sync All
          </button>
        </div>

        <div className="grid gap-4">
          {adapters.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${a.status === 'HEALTHY' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                  <Server className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-trust-ink dark:text-white">{a.name}</h3>
                  <p className="text-sm text-slate-500">Mode: {a.mode} · Last Sync: {a.lastSync}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Records Synced</p>
                  <p className="font-bold text-trust-ink dark:text-white">{a.records}</p>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${a.status === 'HEALTHY' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {a.status === 'HEALTHY' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


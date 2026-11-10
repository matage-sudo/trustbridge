"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, ShieldCheck, TrendingUp } from "lucide-react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

type RiskItem = {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  hospitalNumber: string;
  age: number;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
};

const riskStyles: Record<RiskLevel, string> = {
  LOW: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  MODERATE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function AiRiskPage() {
  const [items, setItems] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: RiskItem[]; summary: unknown }>('/ai-risk/patients')
      .then((payload) => setItems(payload.items ?? []))
      .catch(() => setError('Unable to load AI risk data.'))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const counts = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 } as Record<RiskLevel, number>;
    for (const item of items) {
      counts[item.riskLevel] += 1;
    }
    const avgScore = items.length ? Math.round(items.reduce((sum, item) => sum + item.riskScore, 0) / items.length) : 0;
    return { counts, avgScore };
  }, [items]);

  return (
    <AppShell portal="staff">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/staff" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">AI Risk Overview</h1>
          </div>
          <div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-900/20 dark:text-indigo-200">
            Model-assisted scoring
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Average score</span>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{summary.avgScore}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">High risk</span>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{summary.counts.HIGH + summary.counts.CRITICAL}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Moderate</span>
              <Activity className="h-5 w-5 text-amber-500" />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{summary.counts.MODERATE}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">Low risk</span>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{summary.counts.LOW}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Patients</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{items.length} total</span>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading risk scores…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No patient records were found for this tenant.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Patient</th>
                    <th className="px-6 py-3 font-semibold">Age</th>
                    <th className="px-6 py-3 font-semibold">Risk score</th>
                    <th className="px-6 py-3 font-semibold">Level</th>
                    <th className="px-6 py-3 font-semibold">Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">{row.firstName} {row.lastName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.hospitalNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{row.age}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{row.riskScore}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskStyles[row.riskLevel]}`}>
                          {row.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                        {row.riskFactors.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

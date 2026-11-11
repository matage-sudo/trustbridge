"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ShieldCheck, Activity, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

type RiskItem = { id: string; firstName: string; lastName: string; hospitalNumber: string; age: number; riskScore: number; riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"; riskFactors: string[]; };

const riskColors: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-800",
  MODERATE: "bg-amber-100 text-amber-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default function AiRiskPage() {
  const [items, setItems] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{items: RiskItem[]}>("/ai-risk/patients").then((p) => setItems(p.items || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="staff">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/staff" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white">AI Risk Overview</h1><p className="text-sm text-slate-500">Model-assisted scoring for patient triage.</p></div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="p-5 flex items-center gap-4"><TrendingUp className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-slate-500">Avg Score</p><p className="text-2xl font-bold dark:text-white">{items.length ? Math.round(items.reduce((a, b) => a + b.riskScore, 0) / items.length) : 0}</p></div></Card>
          <Card className="p-5 flex items-center gap-4"><AlertTriangle className="w-8 h-8 text-orange-500" /><div><p className="text-sm text-slate-500">High/Critical</p><p className="text-2xl font-bold dark:text-white">{items.filter(i => ["HIGH", "CRITICAL"].includes(i.riskLevel)).length}</p></div></Card>
          <Card className="p-5 flex items-center gap-4"><ShieldCheck className="w-8 h-8 text-emerald-500" /><div><p className="text-sm text-slate-500">Low Risk</p><p className="text-2xl font-bold dark:text-white">{items.filter(i => i.riskLevel === "LOW").length}</p></div></Card>
        </div>

        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800"><h2 className="font-semibold dark:text-white">Patient Risk Assessments</h2></div>
          {loading ? <div className="p-8 text-center text-slate-500">Loading risk data...</div> : items.length === 0 ? <div className="p-8 text-center text-slate-500">No patient records found for this tenant.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300">
                  <tr><th className="px-6 py-3 font-semibold">Patient</th><th className="px-6 py-3 font-semibold">Age</th><th className="px-6 py-3 font-semibold">Score</th><th className="px-6 py-3 font-semibold">Level</th><th className="px-6 py-3 font-semibold">Factors</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4"><p className="font-medium dark:text-white">{row.firstName} {row.lastName}</p><p className="text-xs text-slate-500">{row.hospitalNumber}</p></td>
                      <td className="px-6 py-4 dark:text-slate-300">{row.age}</td>
                      <td className="px-6 py-4 font-semibold dark:text-white">{row.riskScore}</td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskColors[row.riskLevel]}`}>{row.riskLevel}</span></td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.riskFactors?.join(", ") || "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
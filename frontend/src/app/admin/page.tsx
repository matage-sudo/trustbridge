"use client";

import { useEffect, useState } from "react";
import CreateUserForm from "@/components/CreateUserForm";
import Link from "next/link";
import { Activity, Users, FileText, Calendar, ShieldCheck, UserCog, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function AdminPage() {
  const [summary, setSummary] = useState<any>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<any>("/dashboard/summary").catch(() => ({})),
      apiFetch<{items: any[]}>("/audit-events?limit=5").catch(() => ({ items: [] }))
    ]).then(([s, a]) => {
      setSummary(s);
      setRecent(a.items || []);
    }).finally(() => setLoading(false));
  }, []);

  const KPI_CARDS = [
    { label: "Active Users", value: summary.activeUsers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Audit Events", value: summary.auditEvents ?? 0, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Patients", value: summary.patients ?? 0, icon: Users, color: "text-green-600", bg: "bg-green-50" },
    { label: "Appointments", value: summary.appointments ?? 0, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <AppShell portal="admin">
      <div className="mb-8">
        <h1 className="text-2xl font-bold dark:text-white">Admin Dashboard</h1>
        <div className="mt-6 mb-6"><CreateUserForm /></div>
        
        <p className="text-slate-500 mt-1">Ruiru Level 4 Hospital &mdash; System Overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {KPI_CARDS.map((c, i) => (
          <Card key={i} className="p-5">
            <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center mb-3 dark:bg-opacity-20`}><c.icon className={`w-5 h-5 ${c.color}`} /></div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/staff" className="group"><Card className="p-6 h-full hover:border-blue-400 transition-colors"><div className="flex items-center gap-3 mb-2"><UserCog className="w-5 h-5 text-blue-600" /><h3 className="font-semibold dark:text-white">Staff Management</h3></div><p className="text-sm text-slate-500 mb-4">Manage roles, create accounts, and reset passwords.</p><span className="text-xs font-medium text-blue-600 group-hover:underline flex items-center gap-1">Manage Staff <ArrowRight className="w-3 h-3" /></span></Card></Link>
        <Link href="/admin/patients" className="group"><Card className="p-6 h-full hover:border-blue-400 transition-colors"><div className="flex items-center gap-3 mb-2"><Users className="w-5 h-5 text-blue-600" /><h3 className="font-semibold dark:text-white">Patient Directory</h3></div><p className="text-sm text-slate-500 mb-4">Register and view patient records securely.</p><span className="text-xs font-medium text-blue-600 group-hover:underline flex items-center gap-1">Manage Patients <ArrowRight className="w-3 h-3" /></span></Card></Link>
        <Link href="/admin/access-requests" className="group"><Card className="p-6 h-full hover:border-blue-400 transition-colors"><div className="flex items-center gap-3 mb-2"><ShieldCheck className="w-5 h-5 text-blue-600" /><h3 className="font-semibold dark:text-white">Access Requests</h3></div><p className="text-sm text-slate-500 mb-4">Review and approve staff requests for patient data.</p><span className="text-xs font-medium text-blue-600 group-hover:underline flex items-center gap-1">Review Requests <ArrowRight className="w-3 h-3" /></span></Card></Link>
      </div>

      <Card>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="font-bold dark:text-white">Recent System Activity</h2>
          <Link href="/admin/audit" className="text-sm text-blue-600 hover:underline">View All</Link>
        </div>
        {loading ? <div className="p-8 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> : recent.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No recent activity.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((r) => (
              <li key={r.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4"><span className="text-xs font-mono text-slate-500">{new Date(r.createdAt).toLocaleTimeString()}</span><span className="text-sm font-medium dark:text-white">{r.action}</span></div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.outcome === "deny" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{r.outcome || "success"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
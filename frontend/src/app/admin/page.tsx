"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Users, FileText, Calendar, ShieldCheck, UserCog,
  Loader2, AlertTriangle, CheckCircle, ArrowRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";

type Summary = {
  activeUsers?: number;
  auditEvents?: number;
  patients?: number;
  appointments?: number;
  consents?: number;
};

type AuditRow = {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
  actorUserId: string | null;
};

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Summary>("/dashboard/summary").catch(() => ({})),
      apiFetch<{ items: AuditRow[] }>("/audit-events?limit=5").catch(() => ({ items: [] })),
    ])
      .then(([s, a]) => {
        setSummary(s);
        setRecent(a?.items ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const KPI_CARDS = [
    { label: "Active Users", value: summary?.activeUsers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Audit Events", value: summary?.auditEvents ?? 0, icon: FileText, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Patients", value: summary?.patients ?? 0, icon: Users, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Appointments", value: summary?.appointments ?? 0, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Active Consents", value: summary?.consents ?? 0, icon: ShieldCheck, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
  ];

  const NAV_CARDS = [
    { href: "/admin/representatives", title: "Representatives", desc: "Verify, reject or revoke patient-representative grants.", icon: UserCog },
    { href: "/admin/compliance", title: "Compliance Centre", desc: "DPA 2019 self-assessment controls.", icon: ShieldCheck },
    { href: "/admin/audit", title: "Audit Log", desc: "Full audit trail of every action.", icon: Activity },
  ];

  return (
    <AppShell portal="admin">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Demo Hospital Alpha &mdash; Synthetic workspace</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-sm p-3 mb-6">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {KPI_CARDS.map((c, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {NAV_CARDS.map((n, i) => (
          <Link key={i} href={n.href} className="group bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <n.icon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">{n.title}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{n.desc}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 group-hover:gap-2 transition-all">
              Open <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 5 events for this tenant</p>
          </div>
          <Link href="/admin/audit" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="px-6 py-8 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading activity...
          </div>
        ) : recent.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {recent.map((r) => (
              <li key={r.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">
                    {new Date(r.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {r.action}
                  </span>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                  r.outcome === 'deny' || r.outcome === 'denied'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                }`}>
                  {r.outcome}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
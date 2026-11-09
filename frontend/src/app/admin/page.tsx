"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield, Users, Activity, FileText, ArrowRight, LogOut,
  AlertCircle, Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase";

type Summary = {
  tenant: { id: string; name: string; slug: string } | null;
  stats: {
    activeUsers: number;
    totalAuditEvents: number;
    patients: number;
    appointments: number;
    consents: number;
  };
  recentActivity: {
    id: string;
    action: string;
    outcome: string;
    timestamp: string;
  }[];
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Summary>("/dashboard/summary")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-red-200 max-w-md">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-center mb-2">Could not load dashboard</h2>
          <p className="text-sm text-slate-500 text-center">{error}</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Active Users", value: data.stats.activeUsers, icon: Users, accent: "text-blue-600" },
    { label: "Audit Events", value: data.stats.totalAuditEvents, icon: FileText, accent: "text-amber-600" },
    { label: "Patients", value: data.stats.patients, icon: Users, accent: "text-emerald-600" },
    { label: "Appointments", value: data.stats.appointments, icon: Activity, accent: "text-purple-600" },
    { label: "Active Consents", value: data.stats.consents, icon: Shield, accent: "text-rose-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">TrustBridge SOC</h1>
              <p className="text-xs text-slate-500">{data.tenant?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/audit"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Audit Log
            </Link>
            <Link
              href="/admin/staff"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Staff
            </Link>
            <Link
              href="/admin/appointments"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Appointments
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <c.icon className={`h-4 w-4 ${c.accent}`} />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{c.label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Last {data.recentActivity.length} events for this tenant
              </p>
            </div>
            <Link
              href="/admin/audit"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/staff"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Staff
            </Link>
            <Link
              href="/admin/appointments"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100"
            >
              Appointments
            </Link>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">No recent activity yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentActivity.map((evt) => (
                <li key={evt.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{evt.action}</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    {evt.outcome}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
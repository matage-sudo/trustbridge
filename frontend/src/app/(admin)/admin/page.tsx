"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Download, Search, Activity, Lock, ShieldAlert, BarChart3, AlertTriangle, Bot, Fingerprint, Eye, UserPlus, Users, FileText, TrendingUp, Stethoscope, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuditConsolePage() {
  const supabase = createClient();
  const [stats, setStats] = useState({ totalUsers: 0, doctors: 0, patients: 0, auditEvents: 0, activeConsents: 0, appointments: 0, prescriptions: 0, revenue: 0, encounters: 0 });
  const [activeTab, setActiveTab] = useState<"LOGS" | "AI_ALERTS">("LOGS");
  const [reviewedAlerts, setReviewedAlerts] = useState<string[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Analytics
      const [encRes, aptRes, rxRes, invRes] = await Promise.all([
        supabase.from("encounters").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true }),
        supabase.from("prescriptions").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("total").eq("status", "PAID"),
      ]);
      const revenue = (invRes.data || []).reduce((s: number, i: any) => s + Number(i.total), 0);
      // Then the existing query:
      // Get stats
      const { data: profiles } = await supabase.from('profiles').select('role');
      const { count: auditCount } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
      const { count: consentCount } = await supabase.from('consents').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
      
      if (profiles) {
        setStats({
          totalUsers: profiles ? profiles.length : 0,
          doctors: profiles ? profiles.filter(p => p.role === 'DOCTOR').length : 0,
          patients: profiles ? profiles.filter(p => p.role === 'PATIENT').length : 0,
          auditEvents: auditCount || 0,
          activeConsents: consentCount || 0,
          appointments: aptRes.count || 0,
          prescriptions: rxRes.count || 0,
          encounters: encRes.count || 0,
          revenue,
        });
      }

      // Get recent logs
      const { data: logsData } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10);
      if (logsData) setLogs(logsData);
    };
    loadData();
  }, [supabase]);

  const aiAlerts = [
    { id: "ALT-001", severity: "CRITICAL", type: "Break-Glass Used", actor: "Dr. A. Smith", subject: "PT-1102", time: "3 mins ago", reason: "Emergency access bypassed consent." },
    { id: "ALT-002", severity: "HIGH", type: "Ghost Account Login", actor: "Nurse J. Doe (Inactive 90d)", subject: "PT-8841", time: "1 hr ago", reason: "Dormant account active." },
    { id: "ALT-003", severity: "MEDIUM", type: "Bulk Data Export", actor: "Lab Tech B", subject: "N/A", time: "4 hrs ago", reason: "45 reports in 2 minutes." },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-mono">
      <nav className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-brand-500" />
          <span className="text-lg font-bold text-white tracking-wide">TrustBridge SOC</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/users" className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            <Users className="h-3 w-3" /> Users
          </Link>
          <Link href="/admin/assignments" className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            <Stethoscope className="h-3 w-3" /> Assignments
          </Link>
          <Link href="/admin/patients" className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            <User className="h-3 w-3" /> Patients
          </Link>
          <Link href="/admin/audit" className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            <FileText className="h-3 w-3" /> Audit Log
          </Link>
          <Link href="/admin/adapter" className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
            <Activity className="h-3 w-3" /> Adapters
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white px-3">Exit</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
    <p className="text-xs text-slate-500 mb-1">Total Encounters</p>
    <p className="text-2xl font-bold text-white">{stats.encounters}</p>
  </div>
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
    <p className="text-xs text-slate-500 mb-1">Appointments</p>
    <p className="text-2xl font-bold text-white">{stats.appointments}</p>
  </div>
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
    <p className="text-xs text-slate-500 mb-1">Prescriptions</p>
    <p className="text-2xl font-bold text-white">{stats.prescriptions}</p>
  </div>
  <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-4">
    <p className="text-xs text-green-500 mb-1">Revenue Collected</p>
    <p className="text-2xl font-bold text-green-400">KES {stats.revenue.toLocaleString()}</p>
  </div>
</div>
        {/* LIVE STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-400" /><span className="text-xs text-slate-500">Total Users</span></div>
            <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-green-400" /><span className="text-xs text-slate-500">Doctors</span></div>
            <p className="text-2xl font-bold text-white">{stats.doctors}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-purple-400" /><span className="text-xs text-slate-500">Patients</span></div>
            <p className="text-2xl font-bold text-white">{stats.patients}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-amber-400" /><span className="text-xs text-slate-500">Audit Events</span></div>
            <p className="text-2xl font-bold text-white">{stats.auditEvents}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-brand-400" /><span className="text-xs text-slate-500">Active Consents</span></div>
            <p className="text-2xl font-bold text-white">{stats.activeConsents}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-4 border-b border-slate-800 pb-2">
          <button onClick={() => setActiveTab("LOGS")} className={`text-sm font-bold uppercase tracking-wider pb-2 ${activeTab === "LOGS" ? "text-brand-500 border-b-2 border-brand-500" : "text-slate-500 hover:text-slate-300"}`}>Recent Activity</button>
          <button onClick={() => setActiveTab("AI_ALERTS")} className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider pb-2 ${activeTab === "AI_ALERTS" ? "text-red-500 border-b-2 border-red-500" : "text-slate-500 hover:text-slate-300"}`}>AI Risk Alerts <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-[10px] text-red-400">{aiAlerts.length}</span></button>
        </div>

        {activeTab === "LOGS" && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No events yet. Log in/out to generate audit logs.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-white font-bold">{log.action}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${log.outcome === 'SUCCESS' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{log.outcome}</span>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-brand-300">{log.current_hash?.substring(0, 20)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "AI_ALERTS" && (
          <div className="space-y-3">
            {aiAlerts.map((alert) => {
              const isReviewed = reviewedAlerts.includes(alert.id);
              return (
                <div key={alert.id} className={`rounded-xl border p-4 flex gap-4 ${isReviewed ? 'bg-slate-900/50 border-slate-800 opacity-60' : 'bg-slate-900 border-red-900/50'}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${alert.severity === 'CRITICAL' ? 'bg-red-900/50 text-red-500' : alert.severity === 'HIGH' ? 'bg-orange-900/50 text-orange-500' : 'bg-amber-900/50 text-amber-500'}`}>
                    {alert.type === 'Ghost Account Login' ? <Fingerprint className="h-5 w-5" /> : alert.type === 'Break-Glass Used' ? <AlertTriangle className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-white">{alert.type}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${alert.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{alert.severity}</span>
                      </div>
                      <span className="text-xs text-slate-500">{alert.time}</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1">{alert.reason}</p>
                    <p className="text-xs text-slate-500">Actor: {alert.actor} · Subject: {alert.subject}</p>
                  </div>
                  {!isReviewed && (
                    <button onClick={() => setReviewedAlerts([...reviewedAlerts, alert.id])} className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                      <Eye className="h-3 w-3 inline mr-1" /> Review
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}






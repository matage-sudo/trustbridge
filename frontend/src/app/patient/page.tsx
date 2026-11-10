"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, FileText, ArrowRight, Activity, Clock, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";

export default function PatientPortal() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>("/access-requests?status=PENDING").then(r => { if (r.items?.[0]) setRequestId(r.items[0].id); }).catch(() => {});
    apiFetch<any>("/me/profile")
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="patient">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back, {profile?.firstName || "John"}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your health record overview for today.</p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Records</p>
            <p className="text-2xl font-bold">12</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Consents</p>
            <p className="text-2xl font-bold">1</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Access</p>
            <p className="text-2xl font-bold">3</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Requests</p>
            <p className="text-2xl font-bold">1</p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Pending Access Approvals</h2>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">1 Action Required</span>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Alice Synthetic (HOSPITAL_ADMIN)</p>
                  <p className="text-sm text-gray-500 mt-1">Reason: Patient-side approval test</p>
                  <p className="text-xs text-gray-400 mt-1">Purpose: TREATMENT • Duration: 2 hours</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => { if (!requestId) return; try { await apiFetch(`/access-requests/${requestId}/approve`, { method: "POST" }); alert("Approved"); window.location.reload(); } catch (e: any) { alert(e.message); } }} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm">Approve</button>
                  <button onClick={async () => { if (!requestId) return; try { await apiFetch(`/access-requests/${requestId}/reject`, { method: "POST" }); alert("Rejected"); window.location.reload(); } catch (e: any) { alert(e.message); } }} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-red-600 text-sm font-medium rounded-lg shadow-sm">Reject</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold">Access History</h2>
              <p className="text-sm text-gray-500">A full audit trail of who has accessed your record.</p>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {[
                { name: "Alice Synthetic", role: "HOSPITAL_ADMIN", action: "emergency_access.created", time: "11/10/2026, 2:08:56 PM", status: "success" },
                { name: "Alice Synthetic", role: "HOSPITAL_ADMIN", action: "emergency_access.created", time: "11/10/2026, 2:08:50 PM", status: "success" },
              ].map((ev, i) => (
                <li key={i} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{ev.name} ({ev.role})</p>
                    <p className="text-xs text-gray-500 mt-0.5">Action: {ev.action}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{ev.time}</p>
                    <span className="inline-block mt-1 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{ev.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-md">
            <h2 className="font-bold text-lg mb-2">Quick Actions</h2>
            <p className="text-blue-100 text-sm mb-6">Manage your data protection rights and consents.</p>
            <div className="space-y-3">
              <Link href="/patient/documents" className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors">
                <span className="text-sm font-medium">View My Documents</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/patient/representatives" className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-colors">
                <span className="text-sm font-medium">Manage Representatives</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/patient/dsr/new" className="w-full flex items-center justify-between bg-white text-blue-700 p-3 rounded-xl font-semibold shadow-sm hover:bg-blue-50 transition-colors">
                <span className="text-sm">Submit Privacy Request</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 className="font-bold mb-4">Profile Status</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">JD</div>
              <div>
                <p className="text-sm font-bold">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-xs text-gray-500">MRN-001</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p className="flex justify-between"><span>Identity Verified</span> <CheckCircle className="w-4 h-4 text-green-500" /></p>
              <p className="flex justify-between"><span>Emergency Contact</span> <CheckCircle className="w-4 h-4 text-green-500" /></p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
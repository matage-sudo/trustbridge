"use client";

import { useEffect, useState } from "react";
import PatientAwareness from "@/components/PatientAwareness";
import AIAssistant from "@/components/AIAssistant";
import Link from "next/link";
import { Shield, FileText, ArrowRight, Activity, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PatientDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<any>("/me/profile").catch(() => null),
      apiFetch<{ items: any[] }>("/access-requests?status=PENDING").catch(() => ({ items: [] }))
    ]).then(([prof, reqs]) => {
      setProfile(prof);
      if (reqs?.items?.length > 0) setPendingRequest(reqs.items[0]);
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleApproval = async (status: "approve" | "reject") => {
    if (!pendingRequest) return;
    try {
      await apiFetch(`/access-requests/${pendingRequest.id}/${status}`, { method: "POST" });
      setPendingRequest(null);
      alert(`Request ${status}d successfully.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppShell portal="patient">
      {loading ? <div className="p-8 text-slate-500">Loading your health record...</div> : (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold dark:text-white">Welcome back, {profile?.firstName || "Patient"}</h1>
            <p className="text-slate-500 mt-1">Here is your secure health record overview.</p>

                    </div>

          {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Records</p>
                <p className="text-2xl font-bold dark:text-white">12</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active Consents</p>
                <p className="text-2xl font-bold dark:text-white">1</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Recent Access</p>
                <p className="text-2xl font-bold dark:text-white">3</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Requests</p>
                <p className="text-2xl font-bold dark:text-white">{pendingRequest ? 1 : 0}</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Pending Approvals */}
              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h2 className="font-semibold dark:text-white">Pending Access Approvals</h2>
                  {pendingRequest && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">1 Action Required</span>}
                </div>
                <div className="p-6">
                  {pendingRequest ? (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{pendingRequest.requester?.user?.displayName || "Staff Member"}</p>
                        <p className="text-sm text-slate-500 mt-1">Reason: {pendingRequest.reason}</p>
                        <p className="text-xs text-slate-400 mt-1">Purpose: {pendingRequest.purpose} • Duration: {pendingRequest.requestedDurationHours} hours</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="default" onClick={() => handleApproval("approve")} className="bg-green-600 hover:bg-green-700">Approve</Button>
                        <Button variant="outline" onClick={() => handleApproval("reject")} className="text-red-600 hover:text-red-700">Reject</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> No pending requests.</p>
                  )}
                </div>
              </Card>

              {/* Access History */}
              <Card className="overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="font-semibold dark:text-white">Recent Access History</h2>
                </div>
                <div className="p-6 text-sm text-slate-500">
                  Your medical record was accessed by hospital staff recently. A full audit trail is available on request.
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md border-none">
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
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
        <AIAssistant />
        <PatientAwareness />
    </AppShell>
  );
}
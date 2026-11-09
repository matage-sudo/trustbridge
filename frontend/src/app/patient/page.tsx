"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, LogOut, FileText, Plus, CheckCircle, XCircle, Activity } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { createClient } from "@/lib/supabase";

type Patient = { id: string; firstName: string; lastName: string; hospitalNumber: string; dateOfBirth: string };
type Consent = { id: string; purpose: string; noticeVersion: string; status: string; grantedAt: string };
type AccessRequest = { id: string; purpose: string; reason: string; requestedDurationHours: number; createdAt: string; requester: { user: { displayName: string | null; email: string } } };
type AuditEvent = { id: string; action: string; outcome: string; createdAt: string; actor: { displayName: string; role: string; department: string | null } | null; payload: any };

export default function PatientPortal() {
  const router = useRouter();
  const supabase = createClient();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [accessHistory, setAccessHistory] = useState<AuditEvent[]>([]);
  
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch patient profile
    apiFetch<{ items: Patient[] }>("/patients")
      .then((r) => {
        if (r.items.length > 0) {
          setPatient(r.items[0]);
        }
      })
      .catch(console.error);
      
    // 2. Fetch consents
    apiFetch<{ items: Consent[] }>("/consents")
      .then((r) => setConsents(r.items))
      .catch(console.error);
      
    // 3. Fetch pending requests
    apiFetch<{ items: AccessRequest[] }>("/access-requests?status=PENDING")
      .then((r) => setPendingRequests(r.items))
      .catch(console.error);
  }, []);

  // Fetch access history once the patient ID is known
  useEffect(() => {
    if (!patient?.id) return;
    apiFetch<{ items: AuditEvent[] }>(`/patients/${patient.id}/access-history`)
      .then((r) => setAccessHistory(r.items))
      .catch(console.error);
  }, [patient]);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await apiFetch(`/access-requests/${id}/approve`, { method: "POST" });
      // reload pending requests
      apiFetch<{ items: AccessRequest[] }>("/access-requests?status=PENDING").then((r) => setPendingRequests(r.items));
    } catch (e: any) { alert(e.message); } 
    finally { setActioningId(null); }
  };

  const handleReject = async (id: string) => {
    setActioningId(id);
    try {
      await apiFetch(`/access-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: "Patient denied via portal" }) });
      // reload pending requests
      apiFetch<{ items: AccessRequest[] }>("/access-requests?status=PENDING").then((r) => setPendingRequests(r.items));
    } catch (e: any) { alert(e.message); } 
    finally { setActioningId(null); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">My Health Record</h1>
              <p className="text-sm text-blue-200">TrustBridge Patient Portal</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium hover:text-blue-200">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {patient && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Welcome, {patient.firstName}</h2>
            <p className="text-sm text-slate-500">Hospital Number: <span className="font-mono">{patient.hospitalNumber}</span></p>
            <p className="text-sm text-slate-500">Date of Birth: {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
          </div>
        )}

        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <Shield className="h-5 w-5" /> Pending Access Approvals
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {pendingRequests.map((r) => (
                <li key={r.id} className="px-6 py-4 flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.requester.user.displayName || r.requester.user.email} is requesting access
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Reason: {r.reason}</p>
                    <p className="text-xs text-slate-500 mt-1">Purpose: {r.purpose} • Duration: {r.requestedDurationHours} hours</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(r.id)}
                      disabled={actioningId === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(r.id)}
                      disabled={actioningId === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {accessHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" /> Access History
              </h2>
              <p className="text-xs text-slate-500 mt-1">A full audit trail of who has accessed your record.</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {accessHistory.map((e) => (
                <li key={e.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {e.actor ? `${e.actor.displayName} (${e.actor.role})` : "System / Unknown"}
                      </p>
                      {e.actor?.department && (
                        <p className="text-xs text-slate-500">{e.actor.department}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Action: <span className="font-mono">{e.action}</span>
                      </p>
                      {e.payload?.decisionReason && (
                        <p className="text-xs text-slate-500">Reason: {e.payload.decisionReason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString()}</p>
                      <span className={`inline-flex mt-1 rounded px-2 py-0.5 text-xs font-semibold ${e.outcome === "success" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {e.outcome}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">My Consents</h2>
          </div>
          {consents.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No consents recorded.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {consents.map((c) => (
                <li key={c.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{c.purpose}</p>
                    <p className="text-xs text-slate-500">Notice: {c.noticeVersion}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${c.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
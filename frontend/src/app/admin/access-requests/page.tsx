"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";

type AccessRequest = {
  id: string;
  purpose: string;
  reason: string;
  status: string;
  requestedDurationHours: number;
  createdAt: string;
  patient: { firstName: string; lastName: string; hospitalNumber: string };
  requester: { user: { displayName: string | null; email: string } };
  grant: { id: string; expiresAt: string } | null;
};

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiFetch<{ items: AccessRequest[] }>("/access-requests")
      .then((res) => setRequests(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    setError("");
    try {
      await apiFetch(`/access-requests/${id}/approve`, { method: "POST" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejection:");
    if (reason === null) return; // cancelled
    setActioningId(id);
    setError("");
    try {
      await apiFetch(`/access-requests/${id}/reject`, { 
        method: "POST",
        body: JSON.stringify({ reason }) 
      });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/admin" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-blue-600" />
              Access Requests
            </h1>
            <p className="text-sm text-slate-500 mt-1">Review and approve staff requests to view patient records.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Requester</th>
                <th className="px-6 py-3 font-medium">Purpose & Reason</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No access requests found.</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {r.patient.firstName} {r.patient.lastName}
                      <div className="text-xs text-slate-500 font-mono">{r.patient.hospitalNumber}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {r.requester.user.displayName || r.requester.user.email}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-medium text-xs text-blue-700">{r.purpose}</div>
                      <div className="text-xs mt-1">{r.reason}</div>
                      <div className="text-xs text-slate-400 mt-1">{r.requestedDurationHours} hours</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {r.status}
                      </span>
                      {r.status === 'APPROVED' && r.grant && (
                        <div className="text-[10px] text-slate-400 mt-1">Expires: {new Date(r.grant.expiresAt).toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
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
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    apiFetch<{ items: any[] }>("/access-requests").then((res) => setRequests(res.items)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try { await apiFetch(`/access-requests/${id}/approve`, { method: "POST" }); load(); } catch (err: any) { setError(err.message); } finally { setActioningId(null); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejection:");
    if (reason === null) return;
    setActioningId(id);
    try { await apiFetch(`/access-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); load(); } catch (err: any) { setError(err.message); } finally { setActioningId(null); }
  };

  return (
    <AppShell portal="admin">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-blue-600" /> Access Requests</h1><p className="text-sm text-slate-500">Review and approve staff requests to view patient records.</p></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="px-6 py-3 font-medium">Patient</th><th className="px-6 py-3 font-medium">Requester</th><th className="px-6 py-3 font-medium">Purpose</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-500" /></td></tr> : requests.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No access requests found.</td></tr> : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{r.patient?.firstName} {r.patient?.lastName}<div className="text-xs text-slate-500 font-mono">{r.patient?.hospitalNumber}</div></td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.requester?.user?.displayName || r.requester?.user?.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400"><div className="font-medium text-xs text-blue-700 dark:text-blue-400">{r.purpose}</div><div className="text-xs mt-1">{r.reason}</div></td>
                    <td className="px-6 py-4"><span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${r.status === 'APPROVED' ? 'bg-green-100 text-green-800' : r.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{r.status}</span></td>
                    <td className="px-6 py-4">
                      {r.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleApprove(r.id)} disabled={actioningId === r.id} className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(r.id)} disabled={actioningId === r.id} className="text-red-600 border-red-200 hover:bg-red-50 h-7 px-2 text-xs"><XCircle className="h-3 w-3 mr-1" /> Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </AppShell>
  );
}
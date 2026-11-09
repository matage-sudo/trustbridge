"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Dsr = {
  id: string;
  referenceNumber: string;
  type: string;
  status: string;
  description: string;
  adminResponse: string | null;
  createdAt: string;
  requester: { user: { displayName: string | null; email: string } };
};

export default function AdminRightsRequestsPage() {
  const [requests, setRequests] = useState<Dsr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal state
  const [activeDsr, setActiveDsr] = useState<Dsr | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<{ items: Dsr[] }>("/rights-requests")
      .then((res) => setRequests(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDsr) return;
    setSubmitting(true);
    try {
      await apiFetch(`/rights-requests/${activeDsr.id}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: responseText }),
      });
      setActiveDsr(null);
      setResponseText("");
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm("Are you sure you want to close this request? This marks it as resolved.")) return;
    try {
      await apiFetch(`/rights-requests/${id}/close`, { method: "POST" });
      load();
    } catch (err: any) {
      alert(err.message);
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
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
              Data Subject Rights
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage legal rights requests (Access, Erasure, Correction, etc.)</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Ref Number</th>
                <th className="px-6 py-3 font-medium">Requester</th>
                <th className="px-6 py-3 font-medium">Type & Details</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No rights requests found.</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-900">{r.referenceNumber}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {r.requester.user.displayName || r.requester.user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 mb-1">
                        {r.type}
                      </span>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{r.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'CLOSED' ? 'bg-slate-200 text-slate-800' :
                        r.status === 'RESPONDED' ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {r.status !== 'CLOSED' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActiveDsr(r)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                          >
                            Respond
                          </button>
                          <button
                            onClick={() => handleClose(r.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-medium rounded hover:bg-slate-300"
                          >
                            Close
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

      {activeDsr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Respond to {activeDsr.referenceNumber}</h3>
            <p className="text-sm text-slate-600 mb-4">{activeDsr.description}</p>
            <form onSubmit={handleRespond}>
              <label className="block text-xs font-medium text-slate-600 mb-1">Official Response</label>
              <textarea
                required
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 mb-4"
                placeholder="Enter the official response to the requester..."
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDsr(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Response"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
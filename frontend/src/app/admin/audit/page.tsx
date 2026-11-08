"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<any>("/audit-events?limit=20")
      .then((data) => setEvents(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-slate-900">Audit Events</h1>
          </div>
          {error && <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">Error: {error}</div>}
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Tenant ID</th>
                <th className="px-6 py-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading events from API...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No events found.</td></tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-500">{new Date(evt.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{evt.action}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs font-mono">{evt.tenantId?.substring(0, 8)}...</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {evt.outcome}
                      </span>
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
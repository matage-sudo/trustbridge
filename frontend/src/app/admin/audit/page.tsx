"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Activity } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function AdminAuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<{ items: any[] }>("/audit-events?limit=100")
      .then((r) => setEvents(r.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => 
    e.action.toLowerCase().includes(search.toLowerCase()) || 
    e.actorUserId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell portal="admin">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Activity className="h-6 w-6 text-blue-600" /> Audit Log</h1><p className="text-sm text-slate-500">Immutable record of system activity.</p></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Filter by action or user ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Actor</th>
                  <th className="px-6 py-3 font-medium">Outcome</th>
                  <th className="px-6 py-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-500" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No events found.</td></tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-3 text-slate-500 font-mono text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{e.action}</td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{e.actorUserId || "System"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${e.outcome === 'deny' || e.outcome === 'denied' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {e.outcome || "success"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-500 font-mono text-xs">{e.ipAddress || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
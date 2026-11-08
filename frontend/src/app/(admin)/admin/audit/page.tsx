"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Search, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuditExplorerPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (data) setLogs(data);
      setIsLoading(false);
    };
    loadLogs();
  }, [supabase]);

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(filter.toLowerCase()) ||
    log.current_hash?.toLowerCase().includes(filter.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Outcome', 'Current Hash', 'Previous Hash'];
    const rows = filteredLogs.map(l => [l.created_at, l.action, l.outcome, l.current_hash, l.previous_hash]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-mono p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-brand-400 hover:text-brand-300 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to SOC
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Log Explorer</h1>
            <p className="text-sm text-slate-500 mt-1">{filteredLogs.length} events · Hash-chained & tamper-evident</p>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by action or hash..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-500"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Hash Chain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading audit trail...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No audit events yet. Try logging in/out to generate events.</td></tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-white font-medium">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${log.outcome === 'SUCCESS' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {log.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-[10px] font-mono">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Lock className="h-3 w-3" /> <span className="text-brand-300">{log.current_hash?.substring(0, 16)}...</span>
                      </div>
                      <div className="text-slate-600">↳ prev: {log.previous_hash?.substring(0, 16) || 'genesis'}...</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

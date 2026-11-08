"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FileText, User, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PatientOverviewPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPatients = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'PATIENT')
        .order('created_at', { ascending: false });
      if (data) setPatients(data);
      setIsLoading(false);
    };
    loadPatients();
  }, [supabase]);

  const filtered = patients.filter(p => 
    p.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    p.email?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-mono p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-brand-400 hover:text-brand-300 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to SOC
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Patient Overview</h1>
          <p className="text-sm text-slate-500 mt-1">{patients.length} patients registered</p>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-500"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading patients...</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-brand-400" /> {p.full_name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.email}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/patients/${p.id}`} className="text-brand-400 hover:text-brand-300 flex items-center gap-1 text-xs">
                      View Records <ChevronRight className="h-3 w-3" />
                    </Link>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Server, Building2, Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ items: any[] }>("/dashboard/platform/tenants")
      .then((res) => setTenants(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="admin">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white flex items-center gap-2"><Server className="h-6 w-6 text-indigo-600" /> Platform Operations</h1><p className="text-sm text-slate-500">Super Admin Control Plane</p></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">Access Denied: {error}</div>}

        <Card>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800"><h2 className="font-semibold dark:text-white flex items-center gap-2"><Building2 className="w-4 h-4" /> Active Tenants</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr><th className="px-6 py-3 font-medium">Hospital Name</th><th className="px-6 py-3 font-medium">Slug</th><th className="px-6 py-3 font-medium">Users</th><th className="px-6 py-3 font-medium">Patients</th><th className="px-6 py-3 font-medium">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? <tr><td colSpan={5} className="px-6 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-500" /></td></tr> : tenants.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No tenants found.</td></tr> : (
                  tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{t.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{t.slug}</td>
                      <td className="px-6 py-4 dark:text-slate-300">{t._count?.memberships || 0}</td>
                      <td className="px-6 py-4 dark:text-slate-300">{t._count?.patients || 0}</td>
                      <td className="px-6 py-4"><span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.status}</span></td>
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
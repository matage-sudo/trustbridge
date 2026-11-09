"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Server, Building2, Users, ShieldAlert, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  _count: { memberships: number; patients: number; auditEvents: number };
};

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ items: Tenant[] }>("/dashboard/platform/tenants")
      .then((res) => setTenants(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-mono p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-white">TrustBridge Platform Operations</h1>
              <p className="text-xs text-slate-400">Super Admin Control Plane</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
            Access Denied: {error} (You must be a SUPER_ADMIN to view this page)
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2 text-slate-400">
              <Building2 className="h-4 w-4" />
              <span className="text-xs uppercase">Active Tenants</span>
            </div>
            <div className="text-3xl font-bold text-white">{tenants.length}</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-700 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4">Hospital Name</th>
                <th className="px-6 py-4">Tenant Slug</th>
                <th className="px-6 py-4">Users</th>
                <th className="px-6 py-4">Patients</th>
                <th className="px-6 py-4">Audit Events</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400"/></td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No tenants found.</td></tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-750">
                    <td className="px-6 py-4 text-white font-bold">{t.name}</td>
                    <td className="px-6 py-4 font-mono text-xs">{t.slug}</td>
                    <td className="px-6 py-4">{t._count.memberships}</td>
                    <td className="px-6 py-4">{t._count.patients}</td>
                    <td className="px-6 py-4">{t._count.auditEvents}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${t.status === 'ACTIVE' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {t.status}
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
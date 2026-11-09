"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, UserCog } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Staff = {
  id: string;
  role: string;
  employmentStatus: string;
  user: { id: string; email: string; displayName: string | null };
  department: { id: string; name: string } | null;
};

const ROLE_LABEL: Record<string, string> = {
  PATIENT: "Patient",
  STAFF: "Staff",
  HOSPITAL_ADMIN: "Hospital Admin",
  PRIVACY_OFFICER: "Privacy Officer",
  SECURITY_INVESTIGATOR: "Security Investigator",
  SUPER_ADMIN: "Super Admin",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      apiFetch<{ items: Staff[] }>(`/staff?search=${encodeURIComponent(search)}`)
        .then((res) => setStaff(res.items))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage hospital staff, departments, and roles.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Department</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No staff found.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-slate-400" />
                        {s.user.displayName || s.user.email.split("@")[0]}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                      {s.user.email}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {ROLE_LABEL[s.role] || s.role}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {s.department?.name ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                          s.employmentStatus === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {s.employmentStatus}
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
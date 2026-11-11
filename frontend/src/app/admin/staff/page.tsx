"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, UserCog, Plus, Key, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Staff = {
  id: string; // Membership ID
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

const ALLOWED_CREATE_ROLES: Record<string, string> = {
  PATIENT: "Patient",
  STAFF: "Staff",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStaff = () => {
    setLoading(true);
    apiFetch<{ items: Staff[] }>(`/staff?search=${encodeURIComponent(search)}`)
      .then((res) => setStaff(res.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(fetchStaff, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      await apiFetch("/staff/create-account", {
        method: "POST",
        body: JSON.stringify({ email: newEmail, password: newPassword, displayName: newName, role: newRole }),
      });
      setIsModalOpen(false);
      setNewEmail(""); setNewName(""); setNewPassword("");
      fetchStaff();
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (membershipId: string, role: string) => {
    try {
      await apiFetch(`/staff/${membershipId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      // Optimistic update
      setStaff((prev) => prev.map((s) => s.id === membershipId ? { ...s, role } : s));
    } catch (err: any) {
      alert(`Failed to change role: ${err.message}`);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`Send a password reset email to ${email}?`)) return;
    try {
      await apiFetch("/staff/reset-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      alert(`Password reset email sent to ${email}`);
    } catch (err: any) {
      alert(`Failed to send reset email: ${err.message}`);
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
            <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
            <p className="text-sm text-slate-500 mt-1">Manage hospital staff, departments, and roles.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Staff
          </button>
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
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
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
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No staff found.</td>
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
                    <td className="px-6 py-3 text-slate-600 font-mono text-xs">{s.user.email}</td>
                    <td className="px-6 py-3">
                      <select
                        value={s.role}
                        onChange={(e) => handleRoleChange(s.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                      >
                        {Object.entries(ROLE_LABEL).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                        s.employmentStatus === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {s.employmentStatus || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleResetPassword(s.user.email)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                      >
                        <Key className="h-3 w-3" /> Reset Pass
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Add Staff Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="p-4 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Dr. Jane Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="jane@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input required type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="min 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  {Object.entries(ALLOWED_CREATE_ROLES).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />} Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
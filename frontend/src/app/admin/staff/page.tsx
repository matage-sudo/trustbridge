"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, UserCog, Plus, Key, X, AlertTriangle, ShieldAlert } from "lucide-react";
import { apiFetch, getApiContext } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Staff = { id: string; role: string; employmentStatus: string; user: { id: string; email: string; displayName: string | null }; };

const ROLE_LABEL: Record<string, string> = { PATIENT: "Patient", STAFF: "Staff", HOSPITAL_ADMIN: "Hospital Admin", PRIVACY_OFFICER: "Privacy Officer", SECURITY_INVESTIGATOR: "SecurityInvestigator", SUPER_ADMIN: "Super Admin" };
const ALLOWED_CREATE_ROLES: Record<string, string> = { PATIENT: "Patient", STAFF: "Staff" };

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(""); const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [actionLoading, setActionLoading] = useState(false); const [error, setError] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const fetchStaff = () => {
    setLoading(true);
    apiFetch<{ items: Staff[] }>(`/staff?search=${encodeURIComponent(search)}`)
      .then((res) => setStaff(res.items)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { 
    const timer = setTimeout(fetchStaff, 300); 
    getApiContext().then(ctx => setCurrentUserRole(ctx.role));
    return () => clearTimeout(timer); 
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true); setError("");
    try {
      await apiFetch("/staff/create-account",{ method: "POST", body: JSON.stringify({ email: newEmail, displayName: newName, role: newRole }) });
      setIsModalOpen(false); setNewEmail("");setNewName(""); fetchStaff();
    } catch (err: any) { setError(err.message|| "Failed to create account"); } finally { setActionLoading(false); }
  };

  const handleRoleChange = async (id: string,role: string) => {
    try {
      await apiFetch(`/staff/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      setStaff((prev) => prev.map((s) => s.id=== id ? { ...s, role } : s));
    } catch (err: any) { alert(err.message); }
  };

  const handleReset = async (email: string) => {
    if (!confirm(`Send password reset to ${email}?`)) return;
    try { await apiFetch("/staff/reset-password", { method: "POST", body: JSON.stringify({ email }) }); alert("Reset email sent."); } catch (err: any) { alert(err.message); }
  };

  const handleResetMfa = async (email: string) => {
    if (!confirm(`Are you sure you want to reset ALL MFA (Authenticator, Passkeys, Recovery Codes) for ${email}? They will be able to log in with just their password until they set it up again.`)) return;
    try { 
      await apiFetch("/admin/users/reset-mfa", { method: "POST", body: JSON.stringify({ email }) }); 
      alert("MFA Reset successfully."); 
    } catch (err: any) { 
      alert(err.message); 
    }
  };

  return (
    <AppShell portal="admin">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1"><h1 className="text-2xl font-bold dark:text-white">Staff Management</h1><p className="text-sm text-slate-500">Manage users, roles, and passwords.</p></div>
          <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Staff</Button>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by email or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Email</th><th className="px-6 py-3 font-medium">Role</th><th className="px-6 py-3 font-medium text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={4} className="px-6 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></td></tr> : staff.length === 0 ? <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No staff found.</td></tr> : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white"><div className="flex items-center gap-2"><UserCog className="w-4 h-4 text-slate-400" />{s.user.displayName || s.user.email.split("@")[0]}</div></td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{s.user.email}</td>
                    <td className="px-6 py-3">
                      <select 
                        value={s.role} 
                        onChange={(e) => handleRoleChange(s.id, e.target.value)} 
                        disabled={s.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN'}
                        className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs font-medium dark:text-white outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        {Object.entries(ROLE_LABEL)
                          .filter(([role]) => {
                            // Only Super Admins can see/assign the Super Admin role
                            if (role === 'SUPER_ADMIN') return currentUserRole === 'SUPER_ADMIN';
                            return true;
                          })
                          .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleReset(s.user.email)}><Key className="w-3 h-3 mr-1" /> Reset Pass</Button>
                      <Button variant="danger" size="sm" onClick={() => handleResetMfa(s.user.email)}><ShieldAlert className="w-3 h-3 mr-1" /> Reset MFA</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800"><h2 className="text-lg font-bold dark:text-white">Add New User</h2><button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> {error}</div>}
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Full Name</label><Input required value={newName}onChange={(e) => setNewName(e.target.value)} placeholder="Dr. Jane Doe" /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Email</label><Input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jane@hospital.com" /></div>
              <div>
  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Role</label>
  <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white">
    {Object.entries(ROLE_LABEL)
      .filter(([role]) => {
        if (currentUserRole === 'SUPER_ADMIN') return true; // Super Admin can create anyone
        return role === 'PATIENT' || role === 'STAFF'; // Normal Admins can only create Patients/Staff
      })
      .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
</div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={actionLoading}>Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Trash2, Shield, RefreshCw, UserX, UserCheck, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function UserManagementPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", role: "DOCTOR", nationalId: "" });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: 'success', text: data.message });
      setFormData({ fullName: "", email: "", role: "DOCTOR", nationalId: "" });
      setShowCreateForm(false);
      loadUsers();
    } else {
      setMessage({ type: 'error', text: data.error });
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setMessage({ type: 'success', text: `User ${email} deleted.` });
      loadUsers();
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) {
      setMessage({ type: 'success', text: `Role updated to ${newRole}` });
      loadUsers();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-mono p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center text-sm font-medium text-brand-400 hover:text-brand-300 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to SOC
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-sm text-slate-500 mt-1">{users.length} users in the system</p>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500">
            <UserPlus className="h-4 w-4" /> {showCreateForm ? 'Close Form' : 'Create User'}
          </button>
        </div>

        {message && (
          <div className={`mb-4 rounded-lg p-4 text-sm font-semibold ${message.type === 'success' ? 'bg-green-900/30 border border-green-900/50 text-green-400' : 'bg-red-900/30 border border-red-900/50 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {showCreateForm && (
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Provision New User</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" required placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
              <input type="text" required placeholder="National ID" value={formData.nationalId} onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
              <input type="email" required placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500" />
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-500">
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
                <option value="PATIENT">Patient</option>
              </select>
              <button type="submit" className="md:col-span-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-500">Create Account & Send Password Reset</button>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading users...</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-900">
                  <td className="px-4 py-3 text-white font-medium">{user.full_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <select 
                      defaultValue={user.role} 
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                    >
                      <option value="DOCTOR">DOCTOR</option>
                      <option value="NURSE">NURSE</option>
                      <option value="COMPLIANCE_OFFICER">COMPLIANCE</option>
                      <option value="SYSTEM_ADMIN">ADMIN</option>
                      <option value="PATIENT">PATIENT</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(user.id, user.email)} className="text-red-500 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
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

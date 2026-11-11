"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, User, Plus, X, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Patient = { id: string; firstName: string; lastName: string; hospitalNumber: string; dateOfBirth: string; };

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", hospitalNumber: "", dateOfBirth: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPatients = () => {
    setLoading(true);
    apiFetch<{ items: Patient[] }>(`/patients?search=${encodeURIComponent(search)}`)
      .then((res) => setPatients(res.items)).catch((err) => setError(err.message)).finally(() => setLoading(false));
  };

  useEffect(() => { const timer = setTimeout(fetchPatients, 300); return () => clearTimeout(timer); }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setActionLoading(true); setError("");
    try {
      await apiFetch("/patients", { method: "POST", body: JSON.stringify(form) });
      setIsModalOpen(false); setForm({ firstName: "", lastName: "", hospitalNumber: "", dateOfBirth: "" }); fetchPatients();
    } catch (err: any) { setError(err.message || "Failed to create patient"); } finally { setActionLoading(false); }
  };

  return (
    <AppShell portal="admin">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1"><h1 className="text-2xl font-bold dark:text-white">Patient Directory</h1><p className="text-sm text-slate-500">Manage patient records securely.</p></div>
          <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Patient</Button>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by name or MRN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr><th className="px-6 py-3 font-medium">Name</th><th className="px-6 py-3 font-medium">Hospital No.</th><th className="px-6 py-3 font-medium">Date of Birth</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={3} className="px-6 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></td></tr> : patients.length === 0 ? <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No patients found.</td></tr> : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white"><div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" />{p.firstName} {p.lastName}</div></td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{p.hospitalNumber}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{new Date(p.dateOfBirth).toLocaleDateString()}</td>
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
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800"><h2 className="text-lg font-bold dark:text-white">Register New Patient</h2><button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> {error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">First Name</label><Input required value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} /></div>
                <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Last Name</label><Input required value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Hospital Number (MRN)</label><Input required value={form.hospitalNumber} onChange={(e) => setForm({...form, hospitalNumber: e.target.value})} placeholder="MRN-002" /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Date of Birth</label><Input type="date" required value={form.dateOfBirth} onChange={(e) => setForm({...form, dateOfBirth: e.target.value})} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={actionLoading}>Register Patient</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
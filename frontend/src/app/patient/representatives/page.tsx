"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Plus, Loader2, X, ShieldOff, CheckCircle, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RepresentativesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", authorityType: "NEXT_OF_KIN", scope: { VIEW_DOCUMENTS: true, VIEW_PROFILE: false }, evidenceNote: "" });

  const load = () => apiFetch<{items: any[]}>("/me/representatives").then((r) => setItems(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    const scope = Object.entries(form.scope).filter(([, v]) => v).map(([k]) => k);
    if (!scope.length) { setError("Select at least one permission."); setSaving(false); return; }
    try {
      await apiFetch("/me/representatives", { method: "POST", body: JSON.stringify({ ...form, scope }) });
      setShowAdd(false); await load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this representative's access?")) return;
    try { await apiFetch(`/me/representatives/${id}/revoke`, { method: "POST" }); await load(); } catch (e: any) { alert(e.message); }
  };

  return (
    <AppShell portal="patient">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/patient" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white">Who can act for me</h1><p className="text-sm text-slate-500">Manage your representatives.</p></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">Staff must verify every grant before it takes effect.</p>
          <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? <X className="w-4 h-4 mr-2"/> : <Plus className="w-4 h-4 mr-2"/>}{showAdd ? "Cancel" : "Add Representative"}</Button>
        </div>

        {showAdd && (
          <Card className="p-6 mb-6">
            <form onSubmit={handleAdd} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Their Email</label><Input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="name@example.com" /></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Relationship</label><select className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={form.authorityType} onChange={(e) => setForm({...form, authorityType: e.target.value})}><option value="NEXT_OF_KIN">Next of Kin</option><option value="LEGAL_GUARDIAN">Legal Guardian</option></select></div>
              <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.scope.VIEW_DOCUMENTS} onChange={(e) => setForm({...form, scope: {...form.scope, VIEW_DOCUMENTS: e.target.checked}})} /> View Documents</label>
                  <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.scope.VIEW_PROFILE} onChange={(e) => setForm({...form, scope: {...form.scope, VIEW_PROFILE: e.target.checked}})} /> View Profile</label>
                </div>
              </div>
              <Button type="submit" isLoading={saving} className="w-full">Send for Verification</Button>
            </form>
          </Card>
        )}

        <Card>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800"><h2 className="font-semibold dark:text-white">Current Grants</h2></div>
          {loading ? <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500"/></div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nobody can act for you right now.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((r) => (
                <li key={r.id} className="px-6 py-4 flex items-start justify-between">
                  <div><p className="font-medium text-sm dark:text-white">{r.representative?.displayName || r.representative?.email}</p><p className="text-xs text-slate-500 mt-1">{r.authorityType} • {r.verificationStatus}</p></div>
                  <Button variant="outline" size="sm" onClick={() => handleRevoke(r.id)} className="text-red-600 border-red-200 hover:bg-red-50"><ShieldOff className="w-4 h-4 mr-1"/> Revoke</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
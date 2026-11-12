"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { Loader2, LifeBuoy, Plus, X } from "lucide-react";

type Ticket = { id: string; subject: string; category: string; status: string; message: string; adminReply?: string; createdAt: string; };

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "GENERAL", message: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    apiFetch<{ items: Ticket[] }>("/support/tickets").then(r => setTickets(r.items)).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await apiFetch("/support/tickets", { method: "POST", body: JSON.stringify(form) });
      setOpen(false); setForm({ subject: "", category: "GENERAL", message: "" }); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <AppShell portal="patient">
      <div className="mb-6 flex justify-between items-center">
        <div><h1 className="text-2xl font-bold dark:text-white">Support Tickets</h1><p className="text-sm text-slate-500">Reach hospital administration directly.</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Ticket</Button>
      </div>
      {error && <Card><p className="p-4 text-red-600 text-sm">{error}</p></Card>}
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
      : tickets.length === 0 ? <Card><div className="p-8 text-center"><LifeBuoy className="w-10 h-10 mx-auto text-slate-300 mb-3" /><p className="text-slate-500">No tickets yet. Open one if you need help.</p></div></Card>
      : <div className="space-y-3">{tickets.map(t => (
          <Card key={t.id}><div className="p-5">
            <div className="flex justify-between items-start">
              <div><h3 className="font-semibold dark:text-white">{t.subject}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t.category} - {new Date(t.createdAt).toLocaleDateString()}</p></div>
              <span className={`text-xs px-2 py-0.5 rounded ${t.status === "OPEN" ? "bg-amber-100 text-amber-700" : t.status === "RESOLVED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{t.status}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-wrap">{t.message}</p>
            {t.adminReply && <div className="mt-3 p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-sm"><strong className="dark:text-white">Admin reply:</strong> <span className="dark:text-slate-300">{t.adminReply}</span></div>}
          </div></Card>
        ))}</div>}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-bold dark:text-white">New Support Ticket</h2>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-3">
              <div><label className="text-sm font-medium dark:text-slate-300">Subject</label><Input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              <div><label className="text-sm font-medium dark:text-slate-300">Category</label>
                <select className="w-full mt-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option>GENERAL</option><option>PRIVACY</option><option>TECHNICAL</option><option>BILLING</option>
                </select></div>
              <div><label className="text-sm font-medium dark:text-slate-300">Message</label>
                <textarea required rows={4} className="w-full mt-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" isLoading={saving}>Submit</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
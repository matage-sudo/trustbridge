"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

type Event = { id: string; action: string; outcome: string; createdAt: string; actor: { displayName: string; role: string; department: string | null } | null; };

export default function AccessHistoryPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ items: Event[] }>("/patients/me/access-history")
      .then(r => setEvents(r.items)).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="patient">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Who Accessed My Records</h1>
        <p className="text-sm text-slate-500">Full transparency on every interaction with your data.</p>
      </div>
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
      : error ? <Card><p className="p-6 text-red-600">{error}</p></Card>
      : events.length === 0 ? <Card><p className="p-6 text-center text-slate-500">No access events recorded yet.</p></Card>
      : <Card><ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {events.map(e => (
            <li key={e.id} className="p-4 flex items-start gap-3">
              {e.outcome === "deny" ? <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5" /> : <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium dark:text-white">{e.action.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-500">{e.actor ? `${e.actor.displayName} (${e.actor.role}${e.actor.department ? " - " + e.actor.department : ""})` : "System"}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(e.createdAt).toLocaleString()}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${e.outcome === "deny" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{e.outcome}</span>
            </li>
          ))}
        </ul></Card>}
    </AppShell>
  );
}
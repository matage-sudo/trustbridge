"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Monitor, Smartphone, Loader2, LogOut, Clock, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SecurityPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => apiFetch<{items: any[]}>("/security/sessions").then((r) => setSessions(r.items)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    if (!confirm("Sign out of this device?")) return;
    try { await apiFetch(`/security/sessions/${id}/revoke`, { method: "POST" }); load(); } catch (e: any) { alert(e.message); }
  };

  return (
    <AppShell portal="patient">
      <div className="max-w-3xl mx-auto">
      <div className="p-6"></div>
      
        <div className="mb-6 flex items-center gap-4">
          <Link href="/patient" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div><h1 className="text-2xl font-bold dark:text-white">Security Centre</h1><p className="text-sm text-slate-500">Manage your active sessions and devices.</p></div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <Card>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800"><h2 className="font-semibold dark:text-white">Active Sessions</h2></div>
          {loading ? <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.map((s, i) => (
                <li key={s.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">{s.device?.platform?.toLowerCase().includes("ios") ? <Smartphone className="w-5 h-5 text-slate-600"/> : <Monitor className="w-5 h-5 text-slate-600" />}</div>
                    <div>
                      <p className="font-medium text-sm dark:text-white">{s.device?.label || "Unknown Device"} {i === 0 && <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase">This device</span>}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-1"><MapPin className="w-3 h-3" /> {s.ipAddress} • <Clock className="w-3 h-3" /> {new Date(s.lastSeenAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => revoke(s.id)} disabled={i === 0}>Sign Out</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
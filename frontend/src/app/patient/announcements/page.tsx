"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { Loader2, Megaphone } from "lucide-react";

type Ann = { id: string; title: string; content: string; createdAt: string; };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: Ann[] }>("/announcements").then(r => setItems(r.items)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <AppShell portal="patient">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Hospital Announcements</h1>
        <p className="text-sm text-slate-500">Updates from your care team and hospital administration.</p>
      </div>
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
      : items.length === 0 ? <Card><p className="p-6 text-center text-slate-500">No announcements yet.</p></Card>
      : <div className="space-y-3">{items.map(a => (
          <Card key={a.id}><div className="p-5">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold dark:text-white">{a.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{a.content}</p>
                <p className="text-xs text-slate-400 mt-2">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div></Card>
        ))}</div>}
    </AppShell>
  );
}
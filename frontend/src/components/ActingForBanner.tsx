"use client";

import { useEffect, useState } from "react";
import { UserCog, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function ActingForBanner() {
  const [state, setState] = useState<{ patientId: string; name: string } | null>(null);

  useEffect(() => {
    const patientId = localStorage.getItem("actingFor");
    if (!patientId) return;

    let cancelled = false;
    apiFetch<{ items: any[] }>("/me/representatives/acting-for")
      .then((r) => {
        if (cancelled) return;
        const match = (r.items || []).find((it) => it.patient?.id === patientId);
        if (match?.patient) {
          setState({ patientId, name: `${match.patient.firstName} ${match.patient.lastName}` });
        } else {
          localStorage.removeItem("actingFor");
        }
      })
      .catch(() => {
        if (!cancelled) localStorage.removeItem("actingFor");
      });

    return () => { cancelled = true; };
  }, []);

  if (!state) return null;

  const stop = () => {
    localStorage.removeItem("actingFor");
    setState(null);
    window.location.reload();
  };

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserCog className="w-4 h-4 shrink-0" />
          <span className="truncate">
            You are viewing <strong>{state.name}</strong>&apos;s records as their representative.
          </span>
        </div>
        <button onClick={stop} className="shrink-0 inline-flex items-center gap-1 rounded border border-amber-400 bg-white/60 px-2 py-1 text-xs hover:bg-white transition-colors">
          <X className="w-3 h-3" /> Switch back to my own
        </button>
      </div>
    </div>
  );
}
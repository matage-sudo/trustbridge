"use client";

import { useEffect, useState } from "react";
import { UserCog, X } from "lucide-react";
import { apiFetch, getActingFor, setActingFor } from "@/lib/api";

type ActingForState = { patientId: string; name: string } | null;

type ActingForItem = {
  id: string;
  patient: { id: string; firstName: string; lastName: string } | null;
};

/**
 * Persistent bar shown when a representative is acting for someone else.
 * The patient id comes from `localStorage.actingFor`; we resolve the display
 * name through the *real* session using apiFetch so this reflects the caller's
 * actual grants, not a hardcoded user. Fails closed: if the actingFor id has no
 * live grant, the banner silently disappears and apiFetch will itself receive
 * 403s on protected routes, which the page handles.
 */
export default function ActingForBanner() {
  const [state, setState] = useState<ActingForState>(null);

  useEffect(() => {
    const patientId = getActingFor();
    if (!patientId) { setState(null); return; }

    let cancelled = false;

    apiFetch<{ items: ActingForItem[] }>("/me/representatives/acting-for")
      .then((r) => {
        if (cancelled) return;
        const match = (r.items || []).find((it) => it.patient?.id === patientId);
        if (match?.patient) {
          setState({
            patientId,
            name: `${match.patient.firstName} ${match.patient.lastName}`,
          });
        } else {
          // No live grant for this patient id: clear the stale switcher so
          // the app doesn't keep trying to act for a phantom.
          setActingFor(null);
          setState(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network / auth failure: fail closed, clear the switcher.
        setActingFor(null);
        setState(null);
      });

    return () => { cancelled = true; };
  }, []);

  if (!state) return null;

  const stop = () => {
    setActingFor(null);
    setState(null);
    window.location.reload();
  };

  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm">
      <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserCog className="w-4 h-4 shrink-0" />
          <span className="truncate">
            You are viewing <strong>{state.name}</strong>&rsquo;s records as their representative.
          </span>
        </div>
        <button
          onClick={stop}
          className="shrink-0 inline-flex items-center gap-1 rounded border border-amber-400 bg-white/60 px-2 py-1 text-xs hover:bg-white"
        >
          <X className="w-3 h-3" /> Switch back to my own
        </button>
      </div>
    </div>
  );
}
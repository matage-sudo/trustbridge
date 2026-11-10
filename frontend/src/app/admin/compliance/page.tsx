"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, Loader2, AlertTriangle, CheckCircle,
  XCircle, MinusCircle, FileText, Save,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Control = {
  id: string;
  section: string;
  title: string;
  status: string;
  evidence: string | null;
  updatedAt: string | null;
};

const STATUSES = ["NOT_ASSESSED", "COMPLIANT", "NON_COMPLIANT", "NOT_APPLICABLE"] as const;

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  COMPLIANT: CheckCircle,
  NON_COMPLIANT: XCircle,
  NOT_APPLICABLE: MinusCircle,
  NOT_ASSESSED: FileText,
};

const STATUS_COLORS: Record<string, string> = {
  COMPLIANT: "text-green-700 bg-green-50 border-green-200",
  NON_COMPLIANT: "text-red-700 bg-red-50 border-red-200",
  NOT_APPLICABLE: "text-gray-600 bg-gray-50 border-gray-200",
  NOT_ASSESSED: "text-amber-700 bg-amber-50 border-amber-200",
};

export default function AdminCompliancePage() {
  const [items, setItems] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ status: "", evidence: "" });
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await apiFetch<{ items: Control[] }>("/compliance/controls");
      setItems(r.items);
    } catch (e: any) {
      setError(e.message === "forbidden" ? "You do not have permission to view this page." : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (c: Control) => {
    setEditing(c.id);
    setDraft({ status: c.status, evidence: c.evidence ?? "" });
  };

  const cancel = () => { setEditing(null); setDraft({ status: "", evidence: "" }); };

  const save = async (id: string) => {
    setSavingId(id); setError("");
    try {
      await apiFetch(`/compliance/controls/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: draft.status,
          evidence: draft.evidence || null,
        }),
      });
      cancel();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const counts = {
    COMPLIANT: items.filter((c) => c.status === "COMPLIANT").length,
    NON_COMPLIANT: items.filter((c) => c.status === "NON_COMPLIANT").length,
    NOT_APPLICABLE: items.filter((c) => c.status === "NOT_APPLICABLE").length,
    NOT_ASSESSED: items.filter((c) => c.status === "NOT_ASSESSED").length,
  };

  const grouped: Record<string, Control[]> = {};
  for (const c of items) {
    (grouped[c.section] = grouped[c.section] || []).push(c);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin" className="hover:text-blue-200" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <ShieldCheck className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Compliance Centre &mdash; DPA 2019</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-600">
            Kenya Data Protection Act (2019) &mdash; self-assessment. Each control reflects the current
            state of this deployment. This is not a certification &mdash; it is the audit trail of how
            the hospital is proving compliance.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {STATUSES.map((s) => {
              const Icon = STATUS_ICONS[s];
              return (
                <div key={s} className={`rounded-lg border p-3 ${STATUS_COLORS[s]}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{s.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{counts[s]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading controls...
          </div>
        )}

        {Object.entries(grouped).map(([section, list]) => (
          <div key={section} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900 text-sm">{section}</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {list.map((c) => {
                const Icon = STATUS_ICONS[c.status] ?? FileText;
                const isEditing = editing === c.id;
                return (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${STATUS_COLORS[c.status].split(" ")[0]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{c.id}</span>
                          <p className="text-sm font-medium text-gray-900">{c.title}</p>
                        </div>

                        {!isEditing && (
                          <>
                            <p className="text-xs text-gray-500 mt-1">
                              Status: <span className={`font-medium ${STATUS_COLORS[c.status].split(" ")[0]}`}>{c.status.replace(/_/g, " ")}</span>
                              {c.updatedAt && <span className="ml-2">Updated {new Date(c.updatedAt).toLocaleDateString()}</span>}
                            </p>
                            {c.evidence && (
                              <p className="text-xs text-gray-600 mt-1 italic">&ldquo;{c.evidence}&rdquo;</p>
                            )}
                            <button
                              onClick={() => startEdit(c)}
                              className="text-xs text-blue-700 hover:underline mt-2"
                            >
                              {c.status === "NOT_ASSESSED" ? "Assess this control" : "Edit"}
                            </button>
                          </>
                        )}

                        {isEditing && (
                          <div className="mt-3 space-y-2">
                            <select
                              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                              value={draft.status}
                              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                              ))}
                            </select>
                            <textarea
                              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                              rows={2}
                              placeholder="Evidence note (what makes this compliant?)"
                              value={draft.evidence}
                              onChange={(e) => setDraft((d) => ({ ...d, evidence: e.target.value }))}
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={cancel} disabled={savingId === c.id} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                              <button
                                onClick={() => save(c.id)}
                                disabled={savingId === c.id}
                                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50"
                              >
                                {savingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </main>
    </div>
  );
}
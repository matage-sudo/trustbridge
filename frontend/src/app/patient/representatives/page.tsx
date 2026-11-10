"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Loader2, Plus, X, AlertTriangle, CheckCircle, ShieldOff,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import ActingForBanner from "@/components/ActingForBanner";

type Rep = {
  id: string;
  authorityType: string;
  scope: string[];
  validUntil: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
  createdAt: string;
  approvedAt: string | null;
  representative: { displayName: string | null; email: string | null } | null;
};

const STATUS_COLORS: Record<Rep["verificationStatus"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  VERIFIED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  REVOKED: "bg-gray-100 text-gray-700 border-gray-200",
};

const AUTHORITY_LABEL: Record<string, string> = {
  PARENT: "Parent",
  LEGAL_GUARDIAN: "Legal guardian",
  NEXT_OF_KIN: "Next of kin",
  POWER_OF_ATTORNEY: "Power of attorney",
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
      })
    : "—";

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function PatientRepresentativesPage() {
  const [items, setItems] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    authorityType: "NEXT_OF_KIN",
    scope: { VIEW_DOCUMENTS: true, VIEW_PROFILE: false, EDIT_PROFILE: false, UPLOAD_DOCUMENTS: false },
    evidenceNote: "",
    validUntil: "",
  });

  const load = () =>
    apiFetch<{ items: Rep[] }>("/me/representatives")
      .then((r) => setItems(r.items))
      .catch((e) => setError(e.message === "no_patient_linked" ? "No patient record is linked to this account." : e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggleScope = (key: keyof typeof form.scope) =>
    setForm((f) => ({ ...f, scope: { ...f.scope, [key]: !f.scope[key] } }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setNotice("");
    const scope = Object.entries(form.scope).filter(([, on]) => on).map(([k]) => k);
    if (scope.length === 0) { setError("Select at least one permission."); return; }
    setSaving(true);
    try {
      await apiFetch("/me/representatives", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          authorityType: form.authorityType,
          scope,
          evidenceNote: form.evidenceNote || undefined,
          validUntil: form.validUntil || undefined,
        }),
      });
      setNotice("Invitation created. Hospital staff must verify it before it takes effect.");
      setShowAdd(false);
      setForm((f) => ({ ...f, email: "", evidenceNote: "", validUntil: "" }));
      await load();
    } catch (err: any) {
      if (err.status === 404) setError("No user with that email was found in this hospital.");
      else if (err.status === 409) setError("That person already has a pending or active grant.");
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError(""); setNotice("");
    setRevoking(id);
    try {
      await apiFetch(`/me/representatives/${id}/revoke`, { method: "POST" });
      setNotice("Access revoked.");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ActingForBanner />
      <header className="bg-blue-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/patient" className="hover:text-blue-200" aria-label="Back to portal">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Users className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Who can act for me</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm p-3">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{notice}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            A representative can open parts of your record on your behalf. Staff must verify every grant before it takes effect.
          </p>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-3 py-2"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "Cancel" : "Add representative"}
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">New representative</h2>

            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Their hospital email</span>
              <input
                type="email"
                required
                className={INPUT + " mt-1"}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.test"
              />
            </label>

            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Relationship</span>
              <select
                className={INPUT + " mt-1"}
                value={form.authorityType}
                onChange={(e) => setForm((f) => ({ ...f, authorityType: e.target.value }))}
              >
                {Object.entries(AUTHORITY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="text-gray-700 font-medium text-sm mb-2">What can they do?</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ["VIEW_DOCUMENTS", "View my documents"],
                  ["UPLOAD_DOCUMENTS", "Add documents to my record"],
                  ["VIEW_PROFILE", "View my profile details"],
                  ["EDIT_PROFILE", "Update my contact details"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.scope[key as keyof typeof form.scope]}
                      onChange={() => toggleScope(key as keyof typeof form.scope)}
                      className="rounded border-gray-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Expires on (optional)</span>
              <input
                type="date"
                className={INPUT + " mt-1"}
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              />
            </label>

            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Note for staff (optional)</span>
              <input
                type="text"
                className={INPUT + " mt-1"}
                value={form.evidenceNote}
                onChange={(e) => setForm((f) => ({ ...f, evidenceNote: e.target.value }))}
                placeholder="e.g. My daughter Sarah"
              />
            </label>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Send for verification
              </button>
            </div>
          </form>
        )}

        <section className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Current and past grants</h2>
            <span className="text-xs text-gray-500">{items.length} total</span>
          </div>

          {loading && (
            <div className="p-5 flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="p-5 text-sm text-gray-500">Nobody can act for you right now.</p>
          )}

          <ul className="divide-y divide-gray-100">
            {items.map((r) => {
              const live = r.verificationStatus === "PENDING" || r.verificationStatus === "VERIFIED";
              return (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {r.representative?.displayName || r.representative?.email || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {AUTHORITY_LABEL[r.authorityType] ?? r.authorityType} · added {fmtDate(r.createdAt)}
                        {r.validUntil ? ` · expires ${fmtDate(r.validUntil)}` : ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Permissions: {r.scope.join(", ") || "none"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.verificationStatus]}`}>
                        {r.verificationStatus}
                      </span>
                      {live && (
                        <button
                          onClick={() => handleRevoke(r.id)}
                          disabled={revoking === r.id}
                          className="inline-flex items-center gap-1 text-xs text-red-700 hover:bg-red-50 border border-red-200 rounded px-2 py-1 disabled:opacity-50"
                        >
                          {revoking === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
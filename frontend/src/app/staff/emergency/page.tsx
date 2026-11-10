"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

const PURPOSES = [
  ["UNCONSCIOUS_PATIENT", "Patient is unconscious"],
  ["LIFE_THREATENING", "Life-threatening emergency"],
  ["SERIOUS_HARM", "Serious harm risk"],
  ["CRITICAL_CARE", "Urgent critical care"],
];

const SCOPES = [
  ["VIEW_PROFILE", "Profile"],
  ["VIEW_DOCUMENTS", "Documents"],
  ["VIEW_HISTORY", "Access history"],
];

export default function EmergencyAccessPage() {
  const [patientId, setPatientId] = useState("");
  const [purpose, setPurpose] = useState("UNCONSCIOUS_PATIENT");
  const [justification, setJustification] = useState("");
  const [scope, setScope] = useState<string[]>(["VIEW_PROFILE"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toggle = (s: string) =>
    setScope((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setBusy(true);
    try {
      const r = await apiFetch<{ grant: { id: string; validUntil: string }; warning: string }>(
        "/emergency/access",
        { method: "POST", body: JSON.stringify({ patientId, purpose, justification, scope }) }
      );
      setSuccess(`Emergency access granted. ${r.warning}`);
      setPatientId(""); setJustification(""); setScope(["VIEW_PROFILE"]);
    } catch (e: any) {
      if (e.message?.includes('already_active')) setError("An active emergency grant already exists. Revoke it first.");
      else if (e.message?.includes('justification_too_short')) setError("Justification must be at least 20 characters.");
      else setError(e.message);
    } finally { setBusy(false); }
  };

  const canSubmit = patientId.length === 36 && justification.length >= 20 && scope.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/staff" className="hover:text-red-200" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <ShieldAlert className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Emergency Break-Glass Access</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <strong>This is audited.</strong> Emergency access bypasses the normal consent flow and is
          designed for life-threatening situations only. Every break-glass use is immediately
          logged, reviewed by an administrator, and the patient is notified. Misuse is a disciplinary
          matter.
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm p-3">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{success}</span>
          </div>
        )}

        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Patient ID (UUID)</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value.trim())}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Emergency purpose</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            >
              {PURPOSES.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-gray-700 font-medium text-sm mb-2">Access scope</legend>
            <div className="flex flex-wrap gap-3">
              {SCOPES.map(([v, label]) => (
                <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scope.includes(v)}
                    onChange={() => toggle(v)}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm">
            <span className="text-gray-700 font-medium">Justification (min. 20 chars, audited)</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Describe the clinical emergency and why normal consent cannot be obtained. This will be reviewed."
            />
            <span className="text-xs text-gray-500">{justification.length}/20 minimum</span>
          </label>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              Request emergency access
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500">
          Emergency access expires automatically after 30 minutes. To revoke it earlier, use
          the "Active emergency grants" panel on the staff dashboard.
        </p>
      </main>
    </div>
  );
}
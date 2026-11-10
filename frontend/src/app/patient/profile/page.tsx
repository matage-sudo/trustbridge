"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Loader2, CheckCircle, ShieldCheck, AlertTriangle, Save } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  hospitalNumber: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  nationalId: string | null;
  nationalIdIsMasked: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  verifiedAt: string | null;
  lastProfileUpdateAt: string | null;
};

type FormState = {
  phone: string;
  email: string;
  gender: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100";

const toForm = (p: Profile): FormState => ({
  phone: p.phone ?? "",
  email: p.email ?? "",
  gender: p.gender ?? "",
  emergencyContactName: p.emergencyContactName ?? "",
  emergencyContactPhone: p.emergencyContactPhone ?? "",
});

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>({ phone: "", email: "", gender: "", emergencyContactName: "", emergencyContactPhone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () =>
    apiFetch<Profile>("/me/profile")
      .then((p) => {
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((e) =>
        setError(e.message === "no_patient_linked" ? "No patient record is linked to this account." : e.message)
      )
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const dirty =
    profile !== null && JSON.stringify(form) !== JSON.stringify(toForm(profile));

  const validate = (): string | null => {
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) return "Enter a valid phone number, e.g. +254712345678.";
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return "Enter a valid email address.";
    if (form.emergencyContactPhone.trim() && !PHONE_RE.test(form.emergencyContactPhone.trim()))
      return "Enter a valid emergency contact phone number.";
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const clean = (v: string) => (v.trim() === "" ? null : v.trim());
      await apiFetch("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          phone: clean(form.phone),
          email: clean(form.email),
          gender: clean(form.gender),
          emergencyContactName: clean(form.emergencyContactName),
          emergencyContactPhone: clean(form.emergencyContactPhone),
        }),
      });
      await load();
      setNotice("Profile updated.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setNotice("");
    setRequesting(true);
    try {
      await apiFetch("/me/profile/request-verification", { method: "POST" });
      setNotice("Your verification request has been logged. Hospital staff will review it.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/patient" className="hover:text-blue-200" aria-label="Back to portal">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <User className="w-5 h-5" />
          <h1 className="text-lg font-semibold">My profile</h1>
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

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your profile...
          </div>
        )}

        {profile && (
          <>
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Identity (read-only)</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium">{profile.firstName} {profile.lastName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Hospital number</dt>
                  <dd className="font-medium">{profile.hospitalNumber}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Date of birth</dt>
                  <dd className="font-medium">{fmtDate(profile.dateOfBirth)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">National ID</dt>
                  <dd className="font-medium">{profile.nationalId ?? "Not on file"}</dd>
                </div>
              </dl>
              <p className="text-xs text-gray-500 mt-4">
                Name, hospital number and national ID can only be changed by hospital staff after identity checks.
              </p>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`w-5 h-5 mt-0.5 ${profile.verifiedAt ? "text-green-600" : "text-gray-400"}`} />
                  <div>
                    <h2 className="font-semibold text-gray-900">Identity verification</h2>
                    <p className="text-sm text-gray-600">
                      {profile.verifiedAt ? `Verified on ${fmtDate(profile.verifiedAt)}.` : "Your identity has not been verified yet."}
                    </p>
                  </div>
                </div>
                {!profile.verifiedAt && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={requesting}
                    className="shrink-0 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2"
                  >
                    {requesting ? "Sending..." : "Request verification"}
                  </button>
                )}
              </div>
            </section>

            <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Contact details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Phone">
                  <input className={INPUT} value={form.phone} onChange={set("phone")} placeholder="+254712345678" inputMode="tel" />
                </Field>
                <Field label="Email">
                  <input className={INPUT} value={form.email} onChange={set("email")} placeholder="you@example.com" inputMode="email" />
                </Field>
                <Field label="Gender">
                  <select className={INPUT} value={form.gender} onChange={set("gender")}>
                    <option value="">Not specified</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <h2 className="font-semibold text-gray-900 pt-2">Emergency contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <input className={INPUT} value={form.emergencyContactName} onChange={set("emergencyContactName")} />
                </Field>
                <Field label="Phone">
                  <input className={INPUT} value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} placeholder="+254787654321" inputMode="tel" />
                </Field>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-500">Last updated: {fmtDate(profile.lastProfileUpdateAt)}</span>
                <button
                  type="submit"
                  disabled={!dirty || saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white text-sm font-medium px-4 py-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save changes
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
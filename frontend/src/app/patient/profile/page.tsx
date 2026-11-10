"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, ShieldCheck, Save, Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    phone: "",
    email: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  useEffect(() => {
    apiFetch<any>("/me/profile")
      .then((p) => {
        setProfile(p);
        setForm({
          phone: p.phone || "",
          email: p.email || "",
          emergencyContactName: p.emergencyContactName || "",
          emergencyContactPhone: p.emergencyContactPhone || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiFetch("/me/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setNotice("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  return (
    <AppShell portal="patient">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/patient" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your contact details and emergency information.</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">{error}</div>}
        {notice && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg text-sm border border-green-200 dark:border-green-800">{notice}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Identity Section (Read-Only) */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold">Identity (Read-only)</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="font-medium">{profile?.firstName} {profile?.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Hospital Number</p>
                  <p className="font-medium">{profile?.hospitalNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Date of Birth</p>
                  <p className="font-medium">{profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">National ID</p>
                  <p className="font-medium">{profile?.nationalId || "Not on file"}</p>
                </div>
              </div>
            </section>

            {/* Editable Contact Details */}
            <form onSubmit={save} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold">Contact Details</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Phone Number</span>
                  <input className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" value={form.phone} onChange={onChange("phone")} placeholder="+254700000000" />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Email Address</span>
                  <input type="email" className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" value={form.email} onChange={onChange("email")} placeholder="patient@example.com" />
                </label>
              </div>

              <h3 className="font-semibold pt-2 text-sm text-gray-900 dark:text-white">Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Contact Name</span>
                  <input className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" value={form.emergencyContactName} onChange={onChange("emergencyContactName")} />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Contact Phone</span>
                  <input className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm" value={form.emergencyContactPhone} onChange={onChange("emergencyContactPhone")} />
                </label>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 shadow-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
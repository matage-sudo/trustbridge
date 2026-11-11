"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Mail, Save, Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({ phone: "", email: "", emergencyContactName: "", emergencyContactPhone: "" });

  useEffect(() => {
    apiFetch<any>("/me/profile")
      .then((p) => {
        setProfile(p);
        setForm({
          phone: p.phone || "", email: p.email || "",
          emergencyContactName: p.emergencyContactName || "", emergencyContactPhone: p.emergencyContactPhone || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      await apiFetch("/me/profile", { method: "PATCH", body: JSON.stringify(form) });
      setNotice("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell portal="patient">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/patient" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">My Profile</h1>
            <p className="text-sm text-slate-500">Manage your contact details and emergency information.</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}
        {notice && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">{notice}</div>}

        {loading ? <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div> : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold dark:text-white">Identity (Read-only)</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500">Full Name</p><p className="font-medium dark:text-white">{profile?.firstName} {profile?.lastName}</p></div>
                <div><p className="text-slate-500">Hospital Number</p><p className="font-medium dark:text-white">{profile?.hospitalNumber}</p></div>
              </div>
            </Card>

            <Card className="p-6">
              <form onSubmit={save} className="space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold dark:text-white">Contact Details</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Phone Number</label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Email Address</label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} /></div>
                </div>
                <h3 className="font-semibold pt-2 text-sm dark:text-white">Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Contact Name</label><Input value={form.emergencyContactName} onChange={(e) => setForm({...form, emergencyContactName: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Contact Phone</label><Input value={form.emergencyContactPhone} onChange={(e) => setForm({...form, emergencyContactPhone: e.target.value})} /></div>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button type="submit" isLoading={saving}><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
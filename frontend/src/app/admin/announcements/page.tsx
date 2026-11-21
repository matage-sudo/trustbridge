"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Megaphone } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Sent = { id: string; title: string; content: string; audience: string; createdAt: string };
type PatientOpt = { id: string; firstName: string; lastName: string; hospitalNumber: string };
type StaffOpt = { id: string; role: string; user: { email: string; displayName: string | null } };

const AUDIENCE_LABEL: Record<string, string> = {
  EVERYONE: "Everyone (patients and staff)",
  ALL_PATIENTS: "All patients",
  ALL_STAFF: "All staff",
  PATIENT: "One patient",
  STAFF_MEMBER: "One staff member",
};

const SELECT_CLASS = "w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white";

export default function AdminAnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("EVERYONE");
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [targetPatientId, setTargetPatientId] = useState("");
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [targetMembershipId, setTargetMembershipId] = useState("");
  const [sent, setSent] = useState<Sent[]>([]);
  const [loadingSent, setLoadingSent] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSent = () => {
    apiFetch<{ items: Sent[] }>("/announcements/sent")
      .then((r) => setSent(r.items))
      .catch((e) => setError(e.message || "Failed to load sent announcements"))
      .finally(() => setLoadingSent(false));
  };

  useEffect(() => {
    apiFetch<{ items: Sent[] }>("/announcements/sent")
      .then((r) => setSent(r.items))
      .catch((e) => setError(e.message || "Failed to load sent announcements"))
      .finally(() => setLoadingSent(false));
  }, []);

  useEffect(() => {
    if (audience !== "PATIENT") return;
    const timer = setTimeout(() => {
      apiFetch<{ items: PatientOpt[] }>("/patients?search=" + encodeURIComponent(patientSearch))
        .then((r) => setPatients(r.items))
        .catch(() => setPatients([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [audience, patientSearch]);

  useEffect(() => {
    if (audience !== "STAFF_MEMBER") return;
    apiFetch<{ items: StaffOpt[] }>("/staff")
      .then((r) => setStaff(r.items.filter((s) => s.role !== "PATIENT")))
      .catch(() => setStaff([]));
  }, [audience]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (audience === "PATIENT" && !targetPatientId) { setError("Choose a patient."); return; }
    if (audience === "STAFF_MEMBER" && !targetMembershipId) { setError("Choose a staff member."); return; }
    setSending(true);
    try {
      await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          audience,
          targetPatientId: audience === "PATIENT" ? targetPatientId : undefined,
          targetMembershipId: audience === "STAFF_MEMBER" ? targetMembershipId : undefined,
        }),
      });
      setSuccess("Announcement sent.");
      setTitle("");
      setContent("");
      setTargetPatientId("");
      setTargetMembershipId("");
      loadSent();
    } catch (err: any) {
      setError(err.message || "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell portal="admin">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Announcements</h1>
            <p className="text-sm text-slate-500">Send a message to everyone, a group, or one person. Recipients only see what is addressed to them.</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSend} className="p-5 space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            {success && <div className="text-sm text-green-700 bg-green-50 p-2 rounded">{success}</div>}

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-slate-300">Send to</label>
              <select value={audience} onChange={(e) => { setAudience(e.target.value); setTargetPatientId(""); setTargetMembershipId(""); }} className={SELECT_CLASS}>
                {Object.entries(AUDIENCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {audience === "PATIENT" && (
              <div className="space-y-2">
                <Input placeholder="Search patient by name or MRN..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                <select value={targetPatientId} onChange={(e) => setTargetPatientId(e.target.value)} className={SELECT_CLASS}>
                  <option value="">-- Select a patient --</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.hospitalNumber})</option>)}
                </select>
              </div>
            )}

            {audience === "STAFF_MEMBER" && (
              <select value={targetMembershipId} onChange={(e) => setTargetMembershipId(e.target.value)} className={SELECT_CLASS}>
                <option value="">-- Select a staff member --</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.user.displayName || s.user.email}</option>)}
              </select>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 dark:text-slate-300">Title</label>
              <Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-slate-300">Message</label>
              <textarea required maxLength={5000} rows={5} value={content} onChange={(e) => setContent(e.target.value)} className={SELECT_CLASS} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={sending}>Send announcement</Button>
            </div>
          </form>
        </Card>

        <div>
          <h2 className="text-lg font-bold mb-3 dark:text-white">Sent announcements</h2>
          {loadingSent ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" /></div>
          ) : sent.length === 0 ? (
            <Card><p className="p-6 text-center text-slate-500">Nothing sent yet.</p></Card>
          ) : (
            <div className="space-y-3">
              {sent.map((a) => (
                <Card key={a.id}>
                  <div className="p-4 flex items-start gap-3">
                    <Megaphone className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold dark:text-white">{a.title}</h3>
                      <p className="text-xs text-slate-500">{AUDIENCE_LABEL[a.audience] || a.audience} &middot; {new Date(a.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{a.content}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
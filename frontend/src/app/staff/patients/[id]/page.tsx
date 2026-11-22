"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Phone, Activity, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function PatientRecordPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteType, setNoteType] = useState("NOTE");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    apiFetch(`/patients/${id}`)
      .then(setPatient)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNote(true);
    try {
      await apiFetch(`/patients/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ type: noteType, title: noteTitle, content: noteContent })
      });
      setShowNoteModal(false);
      setNoteTitle(""); setNoteContent("");
      const updated = await apiFetch(`/patients/${id}`);
      setPatient(updated);
    } catch (err: any) {
      alert(err.message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <AppShell portal="staff"><div className="p-8">Loading patient record...</div></AppShell>;
  if (error) return <AppShell portal="staff"><div className="p-8 text-red-500">Error: {error}</div></AppShell>;
  if (!patient) return null;

  return (
    <AppShell portal="staff">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/staff" className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">{patient.firstName} {patient.lastName}</h1>
            <p className="text-sm text-slate-500 font-mono">MRN: {patient.hospitalNumber}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button onClick={() => setShowNoteModal(true)}><Plus className="w-4 h-4 mr-2" /> Add Record/Medication</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-bold flex items-center gap-2 mb-4 dark:text-white"><User className="w-5 h-5 text-blue-600"/> Patient Details</h2>
              <div className="space-y-3 text-sm">
                <div><span className="text-slate-500 block">Date of Birth</span> <span className="font-medium dark:text-white">{new Date(patient.dateOfBirth).toLocaleDateString()}</span></div>
                <div><span className="text-slate-500 block">Email</span> <span className="font-medium dark:text-white">{patient.email || "N/A"}</span></div>
                <div><span className="text-slate-500 block">Phone</span> <span className="font-medium dark:text-white">{patient.phone || "N/A"}</span></div>
                <div><span className="text-slate-500 block">Emergency Contact</span> <span className="font-medium dark:text-white">{patient.emergencyContactName || "N/A"} ({patient.emergencyContactPhone || "N/A"})</span></div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-bold flex items-center gap-2 mb-4 dark:text-white"><Phone className="w-5 h-5 text-purple-600"/> Representatives</h2>
              {patient.representatives?.length === 0 ? (
                <p className="text-sm text-slate-500">No representatives registered.</p>
              ) : (
                <ul className="space-y-4">
                  {patient.representatives?.map((rep: any) => (
                    <li key={rep.id} className="text-sm border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold dark:text-white">{rep.representativeMembership?.user?.displayName || "Unknown Representative"}</p>
                          <p className="text-slate-500 text-xs">{rep.representativeMembership?.user?.email || "No email"}</p>
                          <p className="text-slate-500 text-xs mt-1">Authority: {rep.authorityType}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${rep.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{rep.verificationStatus}</span>
                      </div>
                      <p className="text-slate-500 text-xs mt-2">Scopes: {rep.scope.join(", ")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="font-bold flex items-center gap-2 mb-4 dark:text-white"><Activity className="w-5 h-5 text-red-600"/> Clinical Notes & Medications</h2>
              {patient.medicalNotes?.length === 0 ? (
                <p className="text-sm text-slate-500">No records have been added yet.</p>
              ) : (
                <div className="space-y-4">
                  {patient.medicalNotes.map((note: any) => (
                    <div key={note.id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${note.type === 'MEDICATION' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{note.type}</span>
                        <span className="text-xs text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <h3 className="font-semibold text-sm dark:text-white">{note.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold dark:text-white">Add Clinical Record</h2>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <form onSubmit={handleAddNote} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Record Type</label>
                <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                  <option value="NOTE">Clinical Note</option>
                  <option value="MEDICATION">Medication / Prescription</option>
                  <option value="DIAGNOSIS">Diagnosis</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Title</label>
                <Input required value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder={noteType === 'MEDICATION' ? "e.g., Amoxicillin 500mg" : "e.g., Follow-up consultation"} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Content</label>
                <textarea required rows={5} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder={noteType === 'MEDICATION' ? "Take 1 tablet 3 times daily for 7 days." : "Patient presents with..."} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNoteModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={savingNote}>Save Record</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
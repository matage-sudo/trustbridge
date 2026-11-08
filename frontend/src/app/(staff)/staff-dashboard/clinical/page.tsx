"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, User, FileText, Activity, Pill, Beaker, Plus, Search, Loader2, Calendar, Trash2 } from "lucide-react";

interface Patient { id: string; full_name: string; email: string; }
interface Drug { id: string; name: string; stock: number; unit: string; }
interface Encounter {
  id: string;
  chief_complaint: string;
  diagnosis: string;
  notes: string;
  vitals: any;
  status: string;
  created_at: string;
  patient_id: string;
}

export default function ClinicalPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [showNewEncounter, setShowNewEncounter] = useState(false);

  // New encounter form
  const [formData, setFormData] = useState({
    chief_complaint: "",
    diagnosis: "",
    notes: "",
    bp: "",
    temperature: "",
    weight: "",
    height: "",
    pulse: "",
  });
  const [prescriptions, setPrescriptions] = useState<Array<{ drug_id: string; dosage: string; frequency: string; duration_days: string }>>([]);
  const [labOrders, setLabOrders] = useState<Array<{ test_name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Load patients and drugs
  useEffect(() => {
    const load = async () => {
      const [pRes, dRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").eq("role", "PATIENT").order("full_name"),
        supabase.from("drugs").select("id, name, stock, unit").order("name"),
      ]);
      if (pRes.data) setPatients(pRes.data);
      if (dRes.data) setDrugs(dRes.data);
      setIsLoading(false);
    };
    load();
  }, [supabase]);

  // Load encounters when a patient is selected
  useEffect(() => {
    if (!selectedPatient) return;
    const load = async () => {
      const { data } = await supabase
        .from("encounters")
        .select("*")
        .eq("patient_id", selectedPatient.id)
        .order("created_at", { ascending: false });
      if (data) setEncounters(data);
    };
    load();
  }, [selectedPatient, supabase]);

  const addPrescription = () => {
    setPrescriptions([...prescriptions, { drug_id: "", dosage: "", frequency: "", duration_days: "" }]);
  };

  const updatePrescription = (index: number, field: string, value: string) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const addLabOrder = () => {
    setLabOrders([...labOrders, { test_name: "" }]);
  };

  const updateLabOrder = (index: number, value: string) => {
    const updated = [...labOrders];
    updated[index] = { test_name: value };
    setLabOrders(updated);
  };

  const removeLabOrder = (index: number) => {
    setLabOrders(labOrders.filter((_, i) => i !== index));
  };

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setMessage(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMessage("Not authenticated"); return; }

    // 1. Create the encounter
    const { data: encounterData, error: encounterError } = await supabase
      .from("encounters")
      .insert([{
        patient_id: selectedPatient.id,
        doctor_id: session.user.id,
        chief_complaint: formData.chief_complaint,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        vitals: {
          blood_pressure: formData.bp,
          temperature: formData.temperature,
          weight: formData.weight,
          height: formData.height,
          pulse: formData.pulse,
        },
        status: "ACTIVE",
      }])
      .select()
      .single();

    if (encounterError || !encounterData) {
      setMessage(`Error: ${encounterError?.message}`);
      return;
    }

    // 2. Insert prescriptions
    for (const rx of prescriptions) {
      if (!rx.drug_id) continue;
      const drug = drugs.find(d => d.id === rx.drug_id);
      await supabase.from("prescriptions").insert([{
        encounter_id: encounterData.id,
        patient_id: selectedPatient.id,
        doctor_id: session.user.id,
        drug_name: drug?.name || "",
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration_days: parseInt(rx.duration_days) || 0,
        status: "PRESCRIBED",
      }]);

      // Auto-decrement stock
      if (drug) {
        await supabase.from("drugs").update({
          stock: Math.max(0, drug.stock - 1),
        }).eq("id", drug.id);
      }
    }

    // 3. Insert lab orders
    for (const lo of labOrders) {
      if (!lo.test_name) continue;
      await supabase.from("lab_orders").insert([{
        encounter_id: encounterData.id,
        patient_id: selectedPatient.id,
        ordered_by: session.user.id,
        test_name: lo.test_name,
        status: "PENDING",
      }]);
    }

    setMessage("Encounter created with prescriptions and lab orders!");
    setFormData({ chief_complaint: "", diagnosis: "", notes: "", bp: "", temperature: "", weight: "", height: "", pulse: "" });
    setPrescriptions([]);
    setLabOrders([]);
    setShowNewEncounter(false);

    // Reload encounters
    const { data } = await supabase.from("encounters").select("*").eq("patient_id", selectedPatient.id).order("created_at", { ascending: false });
    if (data) setEncounters(data);

    // Reload drugs (in case stock changed)
    const { data: dRes } = await supabase.from("drugs").select("id, name, stock, unit").order("name");
    if (dRes) setDrugs(dRes);
  };

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <Link href="/staff-dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-4 dark:text-brand-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clinical Records (EMR)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage patient encounters, diagnoses, prescriptions, and lab orders
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4" /> Patients ({patients.length})
              </h2>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input placeholder="Search patients..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredPatients.map((p) => (
                <button key={p.id} onClick={() => setSelectedPatient(p)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedPatient?.id === p.id ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{p.full_name || "Unknown"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.email}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedPatient ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <User className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select a patient</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose a patient from the left to view or create encounters.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedPatient.full_name}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPatient.email}</p>
                    </div>
                    <button onClick={() => setShowNewEncounter(!showNewEncounter)}
                      className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                      <Plus className="h-4 w-4" /> New Encounter
                    </button>
                  </div>
                </div>

                {message && (
                  <div className={`rounded-lg p-4 text-sm font-semibold ${message.startsWith("Error") ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}>
                    {message}
                  </div>
                )}

                {showNewEncounter && (
                  <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/30">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" /> New Encounter
                    </h3>
                    <form onSubmit={handleCreateEncounter} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Chief Complaint</label>
                        <input required value={formData.chief_complaint} onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                          placeholder="e.g., Fever and headache for 3 days"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Diagnosis</label>
                        <input required value={formData.diagnosis} onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                          placeholder="e.g., Malaria"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 flex items-center gap-1"><Activity className="h-3 w-3" /> Vitals</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <input placeholder="BP (120/80)" value={formData.bp} onChange={(e) => setFormData({ ...formData, bp: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                          <input placeholder="Temp (°C)" value={formData.temperature} onChange={(e) => setFormData({ ...formData, temperature: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                          <input placeholder="Weight (kg)" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                          <input placeholder="Pulse (bpm)" value={formData.pulse} onChange={(e) => setFormData({ ...formData, pulse: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                        </div>
                      </div>

                      {/* Prescriptions Section */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-1 text-xs font-medium"><Pill className="h-3 w-3" /> Prescriptions</label>
                          <button type="button" onClick={addPrescription} className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Add Prescription
                          </button>
                        </div>
                        {prescriptions.map((rx, i) => (
                          <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                            <select value={rx.drug_id} onChange={(e) => updatePrescription(i, "drug_id", e.target.value)}
                              className="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                              <option value="">Select drug...</option>
                              {drugs.filter(d => d.stock > 0).map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.stock} in stock)</option>
                              ))}
                            </select>
                            <input placeholder="Dosage" value={rx.dosage} onChange={(e) => updatePrescription(i, "dosage", e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            <input placeholder="Frequency" value={rx.frequency} onChange={(e) => updatePrescription(i, "frequency", e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            <div className="flex gap-1">
                              <input placeholder="Days" type="number" value={rx.duration_days} onChange={(e) => updatePrescription(i, "duration_days", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                              <button type="button" onClick={() => removePrescription(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Lab Orders Section */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-1 text-xs font-medium"><Beaker className="h-3 w-3" /> Lab Orders</label>
                          <button type="button" onClick={addLabOrder} className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Add Lab Test
                          </button>
                        </div>
                        {labOrders.map((lo, i) => (
                          <div key={i} className="flex gap-2 mb-2">
                            <input placeholder="e.g., Complete Blood Count" value={lo.test_name} onChange={(e) => updateLabOrder(i, e.target.value)}
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            <button type="button" onClick={() => removeLabOrder(i)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Clinical Notes</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Additional observations, treatment plan, follow-up notes..."
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>

                      <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                        Create Encounter & Save All
                      </button>
                    </form>
                  </div>
                )}

                {/* Encounter History */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Encounter History ({encounters.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {encounters.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        No encounters yet. Click "New Encounter" to add the first one.
                      </div>
                    ) : encounters.map((enc) => (
                      <div key={enc.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{enc.diagnosis || "No diagnosis"}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(enc.created_at).toLocaleString()}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${enc.status === "ACTIVE" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {enc.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div><span className="text-slate-500">Complaint:</span> <span className="text-slate-700 dark:text-slate-300">{enc.chief_complaint || "—"}</span></div>
                          {enc.vitals?.blood_pressure && <div><span className="text-slate-500">BP:</span> <span className="text-slate-700 dark:text-slate-300">{enc.vitals.blood_pressure}</span></div>}
                          {enc.vitals?.temperature && <div><span className="text-slate-500">Temp:</span> <span className="text-slate-700 dark:text-slate-300">{enc.vitals.temperature}°C</span></div>}
                          {enc.vitals?.weight && <div><span className="text-slate-500">Weight:</span> <span className="text-slate-700 dark:text-slate-300">{enc.vitals.weight} kg</span></div>}
                          {enc.vitals?.pulse && <div><span className="text-slate-500">Pulse:</span> <span className="text-slate-700 dark:text-slate-300">{enc.vitals.pulse} bpm</span></div>}
                        </div>
                        {enc.notes && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-700 pl-2">{enc.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

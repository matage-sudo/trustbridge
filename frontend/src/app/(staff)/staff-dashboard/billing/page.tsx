"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, DollarSign, Plus, Search, Loader2, FileText, CheckCircle2, Clock, Trash2 } from "lucide-react";

interface Patient { id: string; full_name: string; email: string; }
interface Encounter { id: string; diagnosis: string; created_at: string; }
interface Invoice {
  id: string;
  patient_id: string;
  encounter_id: string;
  invoice_number: string;
  subtotal: number;
  total: number;
  status: string;
  created_at: string;
  patient?: Patient;
  encounter?: Encounter;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function BillingPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Form state
  const [formData, setFormData] = useState({
    patient_id: "",
    encounter_id: "",
    status: "DRAFT",
  });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  const loadData = async () => {
    setIsLoading(true);
    const [pRes, eRes, iRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email").eq("role", "PATIENT").order("full_name"),
      supabase.from("encounters").select("id, diagnosis, created_at").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*, patient:profiles!invoices_patient_id_fkey(id, full_name, email), encounter:encounters(diagnosis, created_at)").order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setPatients(pRes.data);
    if (eRes.data) setEncounters(eRes.data);
    if (iRes.data) setInvoices(iRes.data);
    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const subtotal = calculateTotal();
    const invoiceNumber = `INV-${Date.now()}`;

    // 1. Create invoice
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .insert([{
        patient_id: formData.patient_id,
        encounter_id: formData.encounter_id || null,
        invoice_number: invoiceNumber,
        subtotal: subtotal,
        total: subtotal,
        status: formData.status,
      }])
      .select()
      .single();

    if (invoiceError || !invoiceData) {
      setMessage(`Error: ${invoiceError?.message}`);
      return;
    }

    // 2. Insert line items
    const lineItems = items.filter(i => i.description && i.unit_price > 0).map(item => ({
      invoice_id: invoiceData.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
    }));

    if (lineItems.length > 0) {
      const { error: itemsError } = await supabase.from("invoice_items").insert(lineItems);
      if (itemsError) {
        setMessage(`Error saving items: ${itemsError.message}`);
        return;
      }
    }

    setMessage("Invoice generated successfully!");
    setFormData({ patient_id: "", encounter_id: "", status: "DRAFT" });
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setShowForm(false);
    loadData();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (!error) {
      setMessage(`Invoice marked as ${status}`);
      loadData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "ISSUED": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "PARTIAL": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "DRAFT": return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const filteredInvoices = filterStatus === "ALL" ? invoices : invoices.filter(i => i.status === filterStatus);

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === "PAID").length,
    unpaid: invoices.filter(i => i.status === "ISSUED" || i.status === "PARTIAL").length,
    revenue: invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + Number(i.total), 0),
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl">
        <Link href="/staff-dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-4 dark:text-brand-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Invoices</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate invoices, track payments, manage insurance</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" /> {showForm ? "Close" : "New Invoice"}
          </button>
        </div>

        {message && (
          <div className={`mb-4 rounded-lg p-4 text-sm font-semibold ${message.startsWith("Error") ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-slate-600" /><span className="text-xs text-slate-500">Total Invoices</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-xs text-slate-500">Paid</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.paid}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-600" /><span className="text-xs text-slate-500">Pending</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.unpaid}</p>
          </div>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/30">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-xs text-green-700 dark:text-green-400">Revenue</span></div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">KES {stats.revenue.toLocaleString()}</p>
          </div>
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/30">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Generate New Invoice</h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select required value={formData.patient_id} onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="">Select Patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                <select value={formData.encounter_id} onChange={(e) => setFormData({ ...formData, encounter_id: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="">Link to Encounter (optional)</option>
                  {encounters.map(e => <option key={e.id} value={e.id}>{e.diagnosis || "Visit"} — {new Date(e.created_at).toLocaleDateString()}</option>)}
                </select>
              </div>

              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Line Items</label>
                  <button type="button" onClick={addItem} className="text-xs text-brand-600 hover:text-brand-500 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <input placeholder="Description (e.g., Consultation)" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                      className="col-span-5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 0)}
                      className="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    <input type="number" step="0.01" placeholder="Unit Price" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                      className="col-span-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    <span className="col-span-2 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">KES {item.quantity * item.unit_price}</span>
                    <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex justify-end mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  Total: KES {calculateTotal().toLocaleString()}
                </div>
              </div>

              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued (unpaid)</option>
                <option value="PAID">Paid</option>
              </select>

              <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Generate Invoice
              </button>
            </form>
          </div>
        )}

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {["ALL", "DRAFT", "ISSUED", "PAID", "PARTIAL"].map((f) => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${filterStatus === f ? "bg-brand-600 text-white" : "bg-white text-slate-600 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {filteredInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <DollarSign className="mx-auto h-12 w-12 mb-4 text-slate-300" />
              <p className="text-sm">No invoices found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{inv.patient?.full_name} · {new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">KES {Number(inv.total).toLocaleString()}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(inv.status)}`}>{inv.status}</span>
                    {inv.status === "ISSUED" && (
                      <button onClick={() => updateStatus(inv.id, "PAID")} className="rounded-lg bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

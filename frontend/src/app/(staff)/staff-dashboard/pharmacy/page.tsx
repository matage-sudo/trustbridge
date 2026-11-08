"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, AlertTriangle, Pill, Search, Package, Loader2, Filter } from "lucide-react";

interface Drug {
  id: string;
  name: string;
  generic_name: string;
  category: string;
  unit: string;
  stock: number;
  min_stock: number;
  price: number;
  expiry_date: string;
}

export default function PharmacyPage() {
  const supabase = createClient();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", generic_name: "", category: "Antibiotic", unit: "Tablet",
    stock: "0", min_stock: "100", price: "0", expiry_date: "", batch_number: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const loadDrugs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("drugs").select("*").order("name", { ascending: true });
    if (!error && data) setDrugs(data);
    setIsLoading(false);
  };

  useEffect(() => { 
    loadDrugs(); 
    const loadRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
        if (profile) setUserRole(profile.role);
      }
    };
    loadRole();
  }, []);

  const handleAddDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("drugs").insert([{
      name: formData.name,
      generic_name: formData.generic_name,
      category: formData.category,
      unit: formData.unit,
      stock: parseInt(formData.stock) || 0,
      min_stock: parseInt(formData.min_stock) || 100,
      price: parseFloat(formData.price) || 0,
      expiry_date: formData.expiry_date || null,
      batch_number: formData.batch_number || null,
    }]);
    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Drug added to inventory successfully!");
      setFormData({ name: "", generic_name: "", category: "Antibiotic", unit: "Tablet", stock: "0", min_stock: "100", price: "0", expiry_date: "", batch_number: "" });
      setShowAddForm(false);
      loadDrugs();
    }
  };

  const getStockStatus = (drug: Drug) => {
    if (drug.stock === 0) return { label: "OUT OF STOCK", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
    if (drug.stock < drug.min_stock) return { label: "LOW STOCK", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
    return { label: "OK", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
  };

  const categories = ["ALL", "Antibiotic", "Antimalarial", "Analgesic", "Antihypertensive", "Antidiabetic", "Vitamin", "Vaccine", "Other"];

  const filteredDrugs = drugs.filter(d => {
    const matchesSearch = d.name?.toLowerCase().includes(filter.toLowerCase()) || d.generic_name?.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = categoryFilter === "ALL" || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: drugs.length,
    lowStock: drugs.filter(d => d.stock > 0 && d.stock < d.min_stock).length,
    outOfStock: drugs.filter(d => d.stock === 0).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl">
        <Link href="/staff-dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-4 dark:text-brand-400">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pharmacy Inventory</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {stats.total} medicines · {stats.lowStock} low stock · {stats.outOfStock} out of stock
            </p>
          </div>
          {(userRole === "PHARMACIST" || userRole === "SYSTEM_ADMIN") && (
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              <Plus className="h-4 w-4" /> {showAddForm ? "Close" : "Add New Drug"}
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-4 rounded-lg p-4 text-sm font-semibold ${message.startsWith("Error") ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}>
            {message}
          </div>
        )}

        {showAddForm && (
          <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-6 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/30">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New Drug</h2>
            <form onSubmit={handleAddDrug} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input required placeholder="Drug Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <input placeholder="Generic Name" value={formData.generic_name} onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {categories.filter(c => c !== "ALL").map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option>Tablet</option><option>Capsule</option><option>Syrup</option><option>Injection</option><option>Sachet</option><option>Bottle</option>
              </select>
              <input required type="number" placeholder="Initial Stock" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <input required type="number" placeholder="Min Stock Threshold" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <input type="number" step="0.01" placeholder="Price (KES)" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <input type="date" placeholder="Expiry Date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <input placeholder="Batch Number" value={formData.batch_number} onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <button type="submit" className="md:col-span-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Add to Inventory</button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-2"><Pill className="h-5 w-5 text-blue-600" /><span className="text-sm text-slate-500 dark:text-slate-400">Total Medicines</span></div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><span className="text-sm text-amber-700 dark:text-amber-400">Low Stock</span></div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.lowStock}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="flex items-center gap-2 mb-2"><Package className="h-5 w-5 text-red-600" /><span className="text-sm text-red-700 dark:text-red-400">Out of Stock</span></div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.outOfStock}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input placeholder="Search by name or generic..." value={filter} onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Drug</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Min</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredDrugs.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No drugs in inventory. Click "Add New Drug" or contact pharmacy.</td></tr>
                ) : filteredDrugs.map((drug) => {
                  const status = getStockStatus(drug);
                  return (
                    <tr key={drug.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{drug.name}<br /><span className="text-xs text-slate-500">{drug.generic_name}</span></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400"><span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs">{drug.category}</span></td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{drug.unit}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{drug.stock}</td>
                      <td className="px-4 py-3 text-slate-500">{drug.min_stock}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">KES {drug.price}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{drug.expiry_date || "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>{status.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    email: "",
    role: "STAFF",
    firstName: "",
    lastName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("Invite sent successfully! The user will receive an email to set their password.");
      setForm({ email: "", role: "STAFF", firstName: "", lastName: "" });
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-md max-w-md w-full border border-gray-200 dark:border-slate-800">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Provision New User</h2>
      
      {message && (
        <div className={`p-3 mb-4 rounded text-sm font-medium ${message.includes("successfully") || message.includes("Invite sent") ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-900/50" : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text" placeholder="First Name" required
            className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-950 p-2 rounded text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <input
            type="text" placeholder="Last Name" required
            className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-950 p-2 rounded text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>

        <input
          type="email" placeholder="Email Address" required
          className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-950 p-2 rounded text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <select
          className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-950 p-2 rounded text-black dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="STAFF">Staff Member</option>
          <option value="HOSPITAL_ADMIN">Hospital Admin</option>
          <option value="PATIENT">Patient</option>
          <option value="PRIVACY_OFFICER">Privacy Officer</option>
        </select>

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? "Sending Invite..." : "Send Invite"}
        </button>
      </form>
    </div>
  );
}
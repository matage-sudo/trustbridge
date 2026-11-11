"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
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
      setMessage("User created successfully!");
      setForm({ email: "", password: "", role: "STAFF", firstName: "", lastName: "" });
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Provision New User</h2>
      
      {message && (
        <div className={`p-3 mb-4 rounded text-sm font-medium ${message.includes("successfully") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <input
            type="text" placeholder="First Name" required
            className="w-full border border-gray-300 p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <input
            type="text" placeholder="Last Name" required
            className="w-full border border-gray-300 p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>

        <input
          type="email" placeholder="Email Address" required
          className="w-full border border-gray-300 p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password" placeholder="Temporary Password" required
          className="w-full border border-gray-300 p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <select
          className="w-full border border-gray-300 p-2 rounded text-black focus:ring-2 focus:ring-blue-500 outline-none"
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
          {loading ? "Creating..." : "Create User"}
        </button>
      </form>
    </div>
  );
}
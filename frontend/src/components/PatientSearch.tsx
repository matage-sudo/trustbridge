"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function PatientSearch({ onSelect }: { onSelect: (id: string, name: string, hn: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      apiFetch<any>(`/patients/search?q=${q}`).then(res => setResults(res.items)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Search Patient Name or Hospital Number..."
        className="w-full border border-gray-300 p-2 rounded text-black"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded shadow-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r.id}
              className="p-2 hover:bg-gray-100 cursor-pointer text-black text-sm"
              onClick={() => { onSelect(r.id, `${r.firstName} ${r.lastName}`, r.hospitalNumber); setQ(""); setResults([]); }}
            >
              <strong>{r.firstName} {r.lastName}</strong> (HN: {r.hospitalNumber})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

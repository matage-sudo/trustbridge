"use client";

import { useEffect, useState } from "react";
import { Search, FileText, Settings, Shield, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!isOpen) return null;

  const actions = [
    { name: "Go to Data Vault", icon: FileText, href: "/dashboard/vault" },
    { name: "Go to Consent Manager", icon: Shield, href: "/dashboard/consent" },
    { name: "Go to Settings", icon: Settings, href: "/dashboard" },
  ].filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-[20vh] backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center border-b border-slate-200 px-4 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search..."
            className="w-full bg-transparent px-4 py-4 text-sm text-slate-900 outline-none dark:text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-2">
          {actions.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">No results found.</p>
          ) : (
            actions.map((action) => (
              <button
                key={action.name}
                onClick={() => { router.push(action.href); setIsOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <action.icon className="h-4 w-4" /> {action.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

type Lang = "en" | "sw";

/**
 * Stores the chosen language and sets <html lang>. No translated strings exist yet
 * (handover section 9.2), so this changes nothing visible until pages read the "tb:lang" event
 * or localStorage "lang". Keep it out of the UI until then.
 */
export default function LanguageToggle() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("lang");
    } catch {
      /* ignore */
    }
    const initial: Lang = saved === "sw" ? "sw" : "en";
    setLang(initial);
    document.documentElement.lang = initial;
  }, []);

  const toggle = () => {
    const next: Lang = lang === "en" ? "sw" : "en";
    setLang(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem("lang", next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("tb:lang", { detail: next }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300"
    >
      <Globe className="w-4 h-4" />
      {lang === "en" ? "EN" : "SW"}
    </button>
  );
}
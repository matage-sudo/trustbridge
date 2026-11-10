"use client";
import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

export default function LanguageToggle() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) setLang(saved);
  }, []);

  const toggle = () => {
    const next = lang === "en" ? "sw" : "en";
    setLang(next);
    localStorage.setItem("lang", next);
    window.location.reload(); // Simple reload to apply language in a real app
  };

  return (
    <button onClick={toggle} className="flex items-center gap-1 text-sm font-medium hover:text-blue-200">
      <Globe className="w-4 h-4" />
      {lang === "en" ? "EN" : "SW"}
    </button>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Accessibility } from "lucide-react";

export function AccessibleModeButton() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add("contrast-more", "text-lg");
    } else {
      document.documentElement.classList.remove("contrast-more", "text-lg");
    }
  }, [isHighContrast]);

  return (
    <button
      onClick={() => setIsHighContrast(!isHighContrast)}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      title="Toggle Accessible Mode"
    >
      <Accessibility className="h-6 w-6" />
    </button>
  );
}

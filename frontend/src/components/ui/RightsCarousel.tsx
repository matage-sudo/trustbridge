"use client";

import { useState, useEffect } from "react";
import { Shield, FileText, Trash2, Download, Edit, AlertCircle, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

const rights = [
  {
    id: "access",
    icon: Download,
    title: "Right of Access",
    summary: "You can access all medical records held about you.",
    detail: "Under Section 26 of the DPA 2019, you have the right to be informed whether your personal data is being processed and to receive a copy of your medical records within 30 days of your request.",
  },
  {
    id: "rectification",
    icon: Edit,
    title: "Right to Rectification",
    summary: "You can correct inaccurate personal data.",
    detail: "Under Section 34 of the DPA 2019, if any medical information is inaccurate or incomplete, you have the right to have it corrected. Ruiru Level 4 Hospital must update your records within 30 days of verification.",
  },
  {
    id: "erasure",
    icon: Trash2,
    title: "Right to Erasure",
    summary: "You can request deletion of your data.",
    detail: "Under Section 40 of the DPA 2019, you have the right to have your personal data erased when it is no longer necessary. Note that medical retention laws (7 years) may override this for clinical records.",
  },
  {
    id: "objection",
    icon: AlertCircle,
    title: "Right to Object",
    summary: "You can object to processing of your data.",
    detail: "Under Section 39 of the DPA 2019, you have the right to object to processing of your personal data for research, marketing, or other purposes not related to direct clinical care.",
  },
  {
    id: "withdraw",
    icon: Shield,
    title: "Right to Withdraw Consent",
    summary: "You can revoke consent at any time.",
    detail: "Under Section 32 of the DPA 2019, you have the right to withdraw consent previously given for data processing. Withdrawal does not affect the lawfulness of prior processing.",
  },
  {
    id: "portability",
    icon: FileText,
    title: "Right to Data Portability",
    summary: "You can receive your data in a portable format.",
    detail: "Under Section 38 of the DPA 2019, you have the right to receive your personal data in a structured, commonly used, machine-readable format (JSON or CSV) and to transmit it to another hospital.",
  },
];

export function RightsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // Auto-slide every 6 seconds
  useEffect(() => {
    if (showAll) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % rights.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [showAll]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % rights.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + rights.length) % rights.length);

  if (showAll) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Rights Under DPA 2019</h3>
          </div>
          <button
            onClick={() => setShowAll(false)}
            className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
          >
            ← Back to slideshow
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rights.map((right) => (
            <div
              key={right.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
                  <right.icon className="h-4 w-4" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{right.title}</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {right.detail}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-center text-slate-500 dark:text-slate-500">
          For complaints, contact the Office of the Data Protection Commissioner (ODPC) at complaints@odpc.go.ke
        </p>
      </div>
    );
  }

  const current = rights[currentIndex];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">DPA 2019 · Your Rights</h3>
        </div>
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
        >
          <BookOpen className="h-3 w-3" /> Read all rights
        </button>
      </div>

      <div className="relative px-6 py-8 min-h-[200px] flex items-center">
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="w-full text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-400 mb-3">
            <current.icon className="h-7 w-7" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{current.title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">{current.summary}</p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-500 max-w-lg mx-auto leading-relaxed">
            {current.detail}
          </p>
        </div>

        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 pb-4">
        {rights.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === currentIndex
                ? "w-6 bg-brand-600 dark:bg-brand-400"
                : "w-1.5 bg-slate-300 dark:bg-slate-700"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

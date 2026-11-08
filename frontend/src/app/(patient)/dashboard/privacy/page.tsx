"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="h-8 w-8 text-brand-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
          </div>
          <div className="prose prose-slate dark:prose-invert">
            <p className="text-slate-600 dark:text-slate-400 mb-4">Last updated: November 2026</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Data Protection Act, 2019 Compliance</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">TrustBridge strictly adheres to the Kenya Data Protection Act of 2019. We ensure all patient data is processed lawfully, transparently, and for specific purposes.</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. Your Rights</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">You have the right to access, rectify, and erase your personal data. You can manage these rights directly from your dashboard.</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Security Measures</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">We use AES-256 encryption at rest, TLS 1.3 in transit, and SHA-256 hash-chaining for our audit logs to ensure your data cannot be tampered with.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

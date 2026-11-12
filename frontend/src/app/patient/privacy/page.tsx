"use client";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

export default function PrivacyPage() {
  return (
    <AppShell portal="patient">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Privacy & Lawful Basis</h1>
        <p className="text-sm text-slate-500">Why and when the hospital may access your data.</p>
      </div>
      <div className="space-y-4">
        <Card><div className="p-6 space-y-3">
          <h2 className="font-semibold dark:text-white">1. Consent</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Most access happens only after you approve a specific request. You can revoke consent at any time from your dashboard.</p>
        </div></Card>
        <Card><div className="p-6 space-y-3">
          <h2 className="font-semibold dark:text-white">2. Emergency (Vital Interest)</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">In life-threatening situations, clinicians may access your records without consent. Every such access is logged, reviewed, and audited by our Privacy Officer.</p>
        </div></Card>
        <Card><div className="p-6 space-y-3">
          <h2 className="font-semibold dark:text-white">3. Legal Obligation</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">We may process data to comply with court orders, public health reporting, or regulatory requirements under the Kenya Data Protection Act 2019.</p>
        </div></Card>
        <Card><div className="p-6 space-y-3">
          <h2 className="font-semibold dark:text-white">4. Your Rights</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">You may request access, correction, deletion, or a copy of your data at any time via the Data Subject Request centre.</p>
        </div></Card>
      </div>
    </AppShell>
  );
}
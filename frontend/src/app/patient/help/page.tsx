"use client";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

const FAQS = [
  { q: "How do I approve a staff access request?", a: "Go to your Dashboard. Pending access requests appear under Access Requests. Click Approve or Reject." },
  { q: "Who can see my medical records?", a: "Only clinicians you have approved, or staff acting under a lawful basis (e.g. emergencies). Every access is logged - see Access History." },
  { q: "How do I download my documents?", a: "Go to Documents. Click the document to view. Downloads are watermarked with your identity for security." },
  { q: "How do I add a family representative?", a: "Go to Representatives and click Add Representative. They will be verified by hospital staff before gaining access." },
  { q: "How do I request a copy of my data?", a: "Use the Data Subject Request form on your dashboard. The Privacy Officer will respond within the statutory window." },
];

export default function HelpPage() {
  return (
    <AppShell portal="patient">
      <div className="mb-6"><h1 className="text-2xl font-bold dark:text-white">Help Centre</h1><p className="text-sm text-slate-500">Answers to common questions.</p></div>
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <Card key={i}><div className="p-5">
            <h3 className="font-semibold dark:text-white">{f.q}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{f.a}</p>
          </div></Card>
        ))}
      </div>
    </AppShell>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Unlock, Clock, Laptop, CheckCircle2, ShieldAlert, Smartphone } from "lucide-react";

export default function StaffRequestPage() {
  const [requestState, setRequestState] = useState<"POSTURE" | "FORM" | "WAITING" | "GRANTED">("POSTURE");
  const [postureStep, setPostureStep] = useState(0);
  const [timer, setTimer] = useState(30);
  const [showPushNotification, setShowPushNotification] = useState(false);

  useEffect(() => {
    if (requestState === "POSTURE") {
      const interval = setInterval(() => {
        setPostureStep((prev) => {
          if (prev >= 3) {
            clearInterval(interval);
            setTimeout(() => setRequestState("FORM"), 1000);
            return 3;
          }
          return prev + 1;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [requestState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (requestState === "GRANTED" && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      setRequestState("FORM");
    }
    return () => clearInterval(interval);
  }, [requestState, timer]);

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestState("WAITING");
    setShowPushNotification(true);
  };

  const handlePatientApprove = () => {
    setShowPushNotification(false);
    setRequestState("GRANTED");
    setTimer(30);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 relative">
      <div className="mx-auto max-w-3xl">
        <Link href="/staff-dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-trust-ink dark:text-white">Secure Access Portal</h1>
              <p className="text-sm text-slate-500">Patient ID: PT-8942 (John Doe)</p>
            </div>
          </div>

          {requestState === "POSTURE" && (
            <div className="py-8">
              <h2 className="text-lg font-bold text-trust-ink dark:text-white mb-6 flex items-center gap-2">
                <Laptop className="h-5 w-5 text-brand-600" /> Verifying Device Posture...
              </h2>
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${postureStep >= 1 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
                  {postureStep >= 1 ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-current" />}
                  <span className="font-medium">Checking OS Security Patches</span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${postureStep >= 2 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
                  {postureStep >= 2 ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-current" />}
                  <span className="font-medium">Verifying Antivirus Status</span>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${postureStep >= 3 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
                  {postureStep >= 3 ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-current" />}
                  <span className="font-medium">Checking Disk Encryption (BitLocker)</span>
                </div>
              </div>
              {postureStep >= 3 && (
                <div className="mt-6 rounded-lg bg-green-100 p-4 border border-green-200 flex items-center gap-3 text-green-800">
                  <ShieldCheck className="h-6 w-6" />
                  <p className="font-semibold">Device is compliant with Zero Trust policy. Proceeding...</p>
                </div>
              )}
            </div>
          )}

          {requestState === "FORM" && (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="label">Data Required</label>
                <select className="input bg-white dark:bg-slate-900">
                  <option>Complete Blood Count (CBC)</option>
                  <option>Chest X-Ray</option>
                  <option>Full Medical History</option>
                </select>
              </div>
              <div>
                <label className="label">Purpose of Access</label>
                <select className="input bg-white dark:bg-slate-900">
                  <option>Treatment</option>
                  <option>Diagnosis</option>
                  <option>Emergency</option>
                </select>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-100 flex items-start gap-3 mt-4">
                <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This request will be sent directly to the patient's phone for approval. All access is logged in the tamper-evident audit trail.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full mt-4">Send Request to Patient</button>
            </form>
          )}

          {requestState === "WAITING" && !showPushNotification && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-brand-600 mb-6"></div>
              <h3 className="text-lg font-bold text-trust-ink dark:text-white">Waiting for Patient Consent...</h3>
              <p className="text-sm text-slate-500 mt-2">Check the patient's mobile app.</p>
            </div>
          )}

          {requestState === "GRANTED" && (
            <div className="space-y-6">
              <div className="rounded-xl bg-green-50 p-4 border border-green-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Unlock className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-bold text-green-900">Access Granted</h3>
                    <p className="text-xs text-green-700">Patient approved your request.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 px-4 py-2 border border-green-200 shadow-sm">
                  <Clock className="h-5 w-5 text-red-500 animate-pulse" />
                  <span className="text-xl font-mono font-bold text-slate-800">{timer}s</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Record: Complete Blood Count (CBC)
                </div>
                <div className="p-6 space-y-4 bg-white dark:bg-slate-900">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-medium text-slate-500">Date</span>
                    <span className="text-sm text-slate-900">2026-10-15</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-medium text-slate-500">Hemoglobin</span>
                    <span className="text-sm text-slate-900">14.2 g/dL (Normal)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-medium text-slate-500">White Blood Cells</span>
                    <span className="text-sm text-slate-900">7,500 /µL (Normal)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-500">Platelets</span>
                    <span className="text-sm text-slate-900">250,000 /µL (Normal)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPushNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl relative">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">TrustBridge App</p>
                <p className="text-xs text-slate-400">now</p>
              </div>
            </div>
            
            <h3 className="font-bold text-trust-ink dark:text-white mb-2">Access Request</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              <strong>Dr. A. Smith</strong> is requesting access to your <strong>Complete Blood Count (CBC)</strong> for <strong>Treatment</strong>.
            </p>
            
            <div className="flex gap-3">
              <button onClick={() => setShowPushNotification(false)} className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-950">
                Deny
              </button>
              <button onClick={handlePatientApprove} className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 shadow-sm">
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


"use client";
import { ShieldCheck, Lock, FileText, Mail, AlertTriangle, ChevronRight } from "lucide-react";

export default function PatientAwareness() {
  return (
    <div className="mt-8 mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Patient Awareness & Legal</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">Swipe to view more &rarr;</span>
      </div>

      {/* Sliding Container */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {/* CARD 1: Patient Rights */}
        <div className="snap-start flex-shrink-0 w-[300px] md:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Your Rights as a Patient</h3>
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-500 shrink-0"/> <span><strong>Access:</strong> Request a copy of your health records.</span></li>
            <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-500 shrink-0"/> <span><strong>Rectification:</strong> Ask to correct inaccurate data.</span></li>
            <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-500 shrink-0"/> <span><strong>Erasure:</strong> Request deletion where legally applicable.</span></li>
            <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-blue-500 shrink-0"/> <span><strong>Confidentiality:</strong> Your data is only shared with authorized staff.</span></li>
          </ul>
        </div>

        {/* CARD 2: Cyber Security Tips */}
        <div className="snap-start flex-shrink-0 w-[300px] md:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Cyber Security Tips</h3>
          </div>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0"/> <span><strong>Phishing:</strong> We will never ask for your password via email.</span></li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0"/> <span><strong>OTPs:</strong> Never share One-Time Passwords with anyone.</span></li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0"/> <span><strong>Passwords:</strong> Use a strong, unique password for TrustBridge.</span></li>
            <li className="flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0"/> <span><strong>Devices:</strong> Log out of sessions on public or shared devices.</span></li>
          </ul>
        </div>

        {/* CARD 3: Privacy Policy */}
        <div className="snap-start flex-shrink-0 w-[300px] md:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Privacy Policy</h3>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>Your health data is processed strictly under the <strong>Kenya Data Protection Act (2019)</strong> and GDPR principles.</p>
            <p>We only collect data necessary for your medical care. Your data is encrypted at rest and in transit. We do not sell your data to third parties.</p>
            <a href="/patient/privacy" className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-xs mt-2 inline-block">Read Full Policy &rarr;</a>
          </div>
        </div>

        {/* CARD 4: Terms & Conditions */}
        <div className="snap-start flex-shrink-0 w-[300px] md:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Terms & Conditions</h3>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>By using TrustBridge, you agree to provide accurate information and keep your login credentials secure.</p>
            <p>Access to your portal may be audited to ensure compliance and security. In case of an emergency, always contact hospital staff directly.</p>
            <a href="/patient/terms" className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-xs mt-2 inline-block">Read Full Terms &rarr;</a>
          </div>
        </div>

        {/* CARD 5: Contact & DPO */}
        <div className="snap-start flex-shrink-0 w-[300px] md:w-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Contact & DPO</h3>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Data Protection Officer</p>
              <a href="mailto:dpo@trustbridge.co.ke" className="text-blue-600 dark:text-blue-400 hover:underline">dpo@trustbridge.co.ke</a>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Hospital Support</p>
              <a href="mailto:support@trustbridge.co.ke" className="text-blue-600 dark:text-blue-400 hover:underline">support@trustbridge.co.ke</a>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              &copy; 2026 TrustBridge. All rights reserved.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

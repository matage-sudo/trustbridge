"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, ShieldCheck, Clock, Lock } from "lucide-react";
import { mockMessages } from "@/lib/mock-messages";

export default function MessagesPage() {
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMsg = {
      id: Date.now(),
      sender: "You",
      role: "PATIENT",
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true
    };
    setMessages([...messages, newMsg]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col p-4 md:p-8">
        <div className="mb-4">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-trust-ink dark:text-white">Dr. A. Smith</h2>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> End-to-End Encrypted
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.isMine ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 rounded-bl-none shadow-sm'}`}>
                  <p className="text-sm">{msg.text}</p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                    {msg.ephemeral && <Clock className="h-3 w-3" />}
                    <span>{msg.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a secure message..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 transition-colors">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


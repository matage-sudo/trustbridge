"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Send, ShieldCheck } from "lucide-react";

export default function ChatbotPage() {
  const [messages, setMessages] = useState([{ id: 1, sender: "BOT", text: "Hello John. I am your TrustBridge AI Assistant. I can help you understand your medical records. What would you like to know?" }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), sender: "USER", text: input }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: "BOT", text: "Based on your recent Complete Blood Count (CBC) from October 15, 2026, your Hemoglobin is 14.2 g/dL, which is perfectly normal. There is nothing to worry about, but always consult Dr. Smith for medical advice." }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col p-4 md:p-8">
        <div className="mb-4">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-500">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 flex items-center gap-3 bg-white z-10 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/50">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">AI Health Assistant</h2>
              <p className="text-xs text-green-600 flex items-center gap-1 dark:text-green-400"><ShieldCheck className="h-3 w-3" /> Private & Secure</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'BOT' && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 mt-1 dark:bg-brand-900/50"><Bot className="h-4 w-4" /></div>}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.sender === 'USER' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'}`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 mt-1 dark:bg-brand-900/50"><Bot className="h-4 w-4" /></div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce dark:bg-slate-500"></div>
                    <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce dark:bg-slate-500" style={{ animationDelay: '0.2s' }}></div>
                    <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce dark:bg-slate-500" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSend} className="border-t border-slate-200 p-4 bg-white flex gap-2 dark:border-slate-800 dark:bg-slate-900">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your lab results..." className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 transition-colors"><Send className="h-5 w-5" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}

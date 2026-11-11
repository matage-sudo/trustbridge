"use client";
import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am the TrustBridge AI Assistant. I can answer questions about general health, mental health, food, and your data privacy rights. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user" as const, content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await apiFetch<{ reply: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      setMessages([...newMessages, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="flex flex-col w-[350px] sm:w-[400px] h-[550px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden mb-4 transition-all duration-300">
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> TrustBridge AI
              </h2>
              <p className="text-[10px] text-blue-100 mt-0.5">Health, Wellness & Privacy</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-blue-700 p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white rounded-br-none" 
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                }`}>
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="font-bold text-base mb-2 mt-3" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="font-bold text-base mb-2 mt-3" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="font-bold text-sm mb-2 mt-3" {...props} />,
                        h4: ({ node, ...props }) => <h4 className="font-semibold text-sm mb-1 mt-2" {...props} />,
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto mb-2">
                            <table className="min-w-full text-xs border-collapse border border-gray-300" {...props} />
                          </div>
                        ),
                        th: ({ node, ...props }) => <th className="border border-gray-300 p-1 bg-gray-100 font-semibold text-left" {...props} />,
                        td: ({ node, ...props }) => <td className="border border-gray-300 p-1" {...props} />,
                        a: ({ node, ...props }) => <a className="text-blue-600 underline" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none shadow-sm text-gray-500 text-sm flex items-center gap-2">
                  <span className="animate-pulse">AI is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-200">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 border border-gray-300 p-2 rounded-lg text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-gray-400 mt-2 text-center">
              AI can make mistakes. Consult a doctor for medical advice.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 rounded-full shadow-lg text-white flex items-center justify-center hover:bg-blue-700 transition-transform transform hover:scale-105"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { X, Loader2, LifeBuoy } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  priority: string;
  adminReply?: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RESOLVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState("IN_PROGRESS");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    apiFetch<{ items: Ticket[] }>("/support/tickets")
      .then(r => setTickets(r.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openTicket = (t: Ticket) => {
    setSelected(t);
    setReplyText(t.adminReply || "");
    setStatus(t.status === "OPEN" ? "IN_PROGRESS" : t.status);
    setError("");
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!replyText.trim()) { setError("Reply cannot be empty."); return; }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/support/tickets/${selected.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ adminReply: replyText.trim(), status }),
      });
      setSelected(null);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Support Tickets</h1>
        <p className="text-sm text-slate-500">Review and respond to patient inquiries.</p>
      </div>

      {error && !selected && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center"><LifeBuoy className="w-10 h-10 mx-auto text-slate-300 mb-3" /><p className="text-slate-500">No support tickets yet.</p></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Subject</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 dark:text-white font-medium">{t.subject}</td>
                  <td className="px-6 py-4 text-slate-500">{t.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[t.status] || STATUS_STYLES.OPEN}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <Button size="sm" variant="outline" onClick={() => openTicket(t)}>
                      View / Reply
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
              <div>
                <h2 className="font-bold dark:text-white">{selected.subject}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selected.category} · {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={submitReply} className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium dark:text-slate-300">Patient Message</label>
                <div className="mt-1 p-3 rounded bg-slate-50 dark:bg-slate-800 text-sm whitespace-pre-wrap dark:text-slate-300">
                  {selected.message}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-slate-300">Admin Reply</label>
                <textarea
                  required
                  rows={5}
                  className="w-full mt-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your response to the patient..."
                />
              </div>

              <div>
                <label className="text-sm font-medium dark:text-slate-300">Update Status</label>
                <select
                  className="w-full mt-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm dark:text-white"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button type="submit" isLoading={submitting}>Send Reply</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
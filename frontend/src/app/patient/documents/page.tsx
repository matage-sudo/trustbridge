"use client";
import { useState, useRef } from "react";
import { apiUpload, apiFetch } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { UploadCloud, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function PatientDocuments() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    // Assuming the patient is uploading their own record, backend gets patientId from context
    formData.append("patientId", "self"); 

    try {
      await apiUpload("/me/documents/upload", formData);
      setMessage("✅ Document uploaded securely!");
      setFile(null);
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell portal="patient">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">My Document Vault</h1>
        
        <Card className="p-8">
          <form onSubmit={handleUpload} className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud className="w-12 h-12 text-blue-500 mb-4" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload a document</p>
            <p className="text-xs text-slate-500 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png" />
            
            {file && (
              <div className="mt-6 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg">
                <FileText className="w-4 h-4" /> {file.name}
              </div>
            )}
          </form>

          <div className="mt-6 flex justify-end">
            <button onClick={handleUpload} disabled={!file || uploading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message.includes("✅") ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
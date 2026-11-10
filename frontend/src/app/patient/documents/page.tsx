"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FolderOpen, Upload, FileText, Image as ImageIcon, Loader2, X, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch, apiUpload, apiBlob } from "@/lib/api";
import ActingForBanner from "@/components/ActingForBanner";

type Doc = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  classification: string;
  uploadedAt: string;
};

type Preview = { url: string; name: string; mime: string };

const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024;

const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function validateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return "Only PDF, JPG or PNG files can be uploaded.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BYTES) return "That file is larger than the 10 MB limit.";
  return null;
}

export default function PatientDocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<Preview | null>(null);

  const load = () =>
    apiFetch<Doc[]>("/me/documents")
      .then(setDocs)
      .catch((e) =>
        setError(e.message === "no_patient_linked" ? "No patient record is linked to this account." : e.message)
      )
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  // Free the blob URL if the page is left while a preview is open
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    };
  }, []);

  const closePreview = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePreview, preview]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setNotice("");
    const problem = validateFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiUpload<Doc>("/me/documents", fd);
      setNotice(`Uploaded ${file.name}.`);
      await load();
    } catch (e: any) {
      if (e.status === 415) setError("The file contents do not match its type. Upload a genuine PDF, JPG or PNG.");
      else if (e.status === 413) setError("That file is larger than the 10 MB limit.");
      else setError(e.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleView = async (doc: Doc) => {
    setError("");
    setViewingId(doc.id);
    try {
      const blob = await apiBlob(`/me/documents/${doc.id}/view`);
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview({ url: URL.createObjectURL(blob), name: doc.filename, mime: doc.mimeType });
    } catch (e: any) {
      setError(e.status === 404 ? "That document is no longer available." : e.message);
    } finally {
      setViewingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ActingForBanner />
      <header className="bg-blue-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/patient" className="hover:text-blue-200" aria-label="Back to portal">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <FolderOpen className="w-5 h-5" />
          <h1 className="text-lg font-semibold">My documents</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm p-3">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{notice}</span>
          </div>
        )}

        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploading) handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:border-blue-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Uploading...
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-blue-700 mb-2" />
              <p className="text-sm font-medium text-gray-800">Drop a file here or click to choose</p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG or PNG, up to 10 MB</p>
            </>
          )}
        </div>

        <section className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Uploaded documents</h2>
            <span className="text-xs text-gray-500">{docs.length} file{docs.length === 1 ? "" : "s"}</span>
          </div>

          {loading && (
            <div className="p-5 flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}

          {!loading && docs.length === 0 && (
            <p className="p-5 text-sm text-gray-500">No documents yet. Upload your first file above.</p>
          )}

          <ul className="divide-y divide-gray-100">
            {docs.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center gap-3">
                {d.mimeType === "application/pdf" ? (
                  <FileText className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-blue-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.filename}</p>
                  <p className="text-xs text-gray-500">{fmtSize(d.sizeBytes)} - {fmtDate(d.uploadedAt)}</p>
                </div>
                <button
                  onClick={() => handleView(d)}
                  disabled={viewingId === d.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm px-3 py-1.5"
                >
                  {viewingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  View
                </button>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-gray-500">
          Every time you open a document, a watermark with your account reference and the time is added to the copy
          you see, and the view is recorded in your access history.
        </p>
      </main>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium truncate">{preview.name}</p>
              <button onClick={closePreview} aria-label="Close preview" className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100">
              {preview.mime === "application/pdf" ? (
                <iframe src={preview.url} title={preview.name} className="w-full h-[75vh]" />
              ) : (
                <div className="flex min-h-[60vh] items-center justify-center p-6">
                  <Image
                    src={preview.url}
                    alt={preview.name}
                    width={1200}
                    height={900}
                    unoptimized
                    className="max-h-[75vh] w-auto object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
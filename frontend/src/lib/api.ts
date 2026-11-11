import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/v1";
const DEV_TENANT_ID = "ad0a4777-cee4-4e69-894a-410648d8b22a";

type Context = { userId: string; tenantId: string; role: string; };
let cachedContext: Context | null = null;

async function getValidToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }
  return session.access_token;
}

export async function getApiContext(): Promise<Context> {
  if (cachedContext) return cachedContext;
  const token = await getValidToken();

  const response = await fetch(`${API_URL}/me/context`, {
    headers: { 
      Authorization: `Bearer ${token}`,
      "x-tenant-id": DEV_TENANT_ID 
    },
  });
  
  const context = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error(context.error ?? `Unable to load context (${response.status})`);
  }

  cachedContext = { userId: context.userId, tenantId: context.tenantId, role: context.role };
  return cachedContext;
}

export function clearApiCache() { cachedContext = null; }
const ACTING_FOR_KEY = "actingFor";
export function getActingFor() { if (typeof window === "undefined") return null; try { return localStorage.getItem(ACTING_FOR_KEY); } catch { return null; } }
export function setActingFor(id: string | null) { if (typeof window === "undefined") return; try { if (id) localStorage.setItem(ACTING_FOR_KEY, id); else localStorage.removeItem(ACTING_FOR_KEY); } catch {} }

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const ctx = await getApiContext();
  const token = await getValidToken();
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-tenant-id": ctx.tenantId,
      ...options.headers,
    },
  });

  if (!res.ok) { const b = await res.json().catch(() => ({})); const e: any = new Error(b.error || `API Error: ${res.status}`); e.status = res.status; throw e; }
  return res.json();
}

async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const ctx = await getApiContext();
  const token = await getValidToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "x-tenant-id": ctx.tenantId, ...options.headers },
  });
  if (!res.ok) { const b = await res.json().catch(() => ({})); const e: any = new Error(b.error || `API Error: ${res.status}`); e.status = res.status; throw e; }
  return res;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> { const res = await rawFetch(path, { method: "POST", body: form }); return res.json(); }
export async function apiBlob(path: string): Promise<Blob> { const res = await rawFetch(path); return res.blob(); }
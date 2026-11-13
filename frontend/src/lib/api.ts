import { createClient } from "./supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/v1";
const DEV_TENANT_ID = "ad0a4777-cee4-4e69-894a-410648d8b22a";

type Context = {
  userId: string;
  tenantId: string;
  role: string;
};

let cachedContext: Context | null = null;

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const key = Object.keys(localStorage).find((k) => k.includes("auth-token"));
    if (key) {
      const sessionStr = localStorage.getItem(key);
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.access_token) return session.access_token;
      }
    }
  } catch { /* ignore */ }

  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getApiContext(): Promise<Context> {
  if (cachedContext) return cachedContext;

  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  // cache: "no-store" PREVENTS the 304 error that breaks the dashboard
  const response = await fetch(`${API_URL}/me/context`, {
    headers: {
      ...(typeof window !== 'undefined' && localStorage.getItem('mfa_token') ? { 'x-mfa-token': localStorage.getItem('mfa_token') as string } : {}), 
      Authorization: `Bearer ${token}`,
      "x-tenant-id": DEV_TENANT_ID 
    },
    cache: "no-store" 
  });
  
  const context = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(context.error ?? `Unable to load account context (${response.status})`);
  }

  cachedContext = {
    userId: context.userId,
    tenantId: context.tenantId || DEV_TENANT_ID,
    role: context.role,
  };
  return cachedContext;
}

export function clearApiCache() {
  cachedContext = null;
}

const ACTING_FOR_KEY = "actingFor";

export function getActingFor(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(ACTING_FOR_KEY); } catch { return null; }
}

export function setActingFor(patientId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (patientId) localStorage.setItem(ACTING_FOR_KEY, patientId);
    else localStorage.removeItem(ACTING_FOR_KEY);
  } catch { /* ignore */ }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const ctx = await getApiContext();
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(typeof window !== 'undefined' && localStorage.getItem('mfa_token') ? { 'x-mfa-token': localStorage.getItem('mfa_token') as string } : {}),
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-tenant-id": ctx.tenantId || DEV_TENANT_ID, // Bulletproof fallback
      "x-user-id": ctx.userId,
      "x-role": ctx.role,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error: any = new Error(body.error || `API Error: ${res.status}`);
    error.status = res.status;
    if (res.status === 401) clearApiCache();
    throw error;
  }

  return res.json();
}

async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const ctx = await getApiContext();
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(typeof window !== 'undefined' && localStorage.getItem('mfa_token') ? { 'x-mfa-token': localStorage.getItem('mfa_token') as string } : {}),
      "Authorization": `Bearer ${token}`,
      "x-tenant-id": ctx.tenantId || DEV_TENANT_ID,
      "x-user-id": ctx.userId,
      "x-role": ctx.role,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.error || `API Error: ${res.status}`);
    err.status = res.status;
    if (res.status === 401) clearApiCache();
    throw err;
  }
  return res;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await rawFetch(path, { method: "POST", body: form });
  return res.json();
}

export async function apiBlob(path: string): Promise<Blob> {
  const res = await rawFetch(path);
  return res.blob();
}
import { createClient } from "./supabase";

const API_URL = "http://127.0.0.1:4000/v1";

type Context = {
  userId: string;
  tenantId: string;
  role: string;
};

let cachedContext: Context | null = null;

async function getContext(): Promise<Context> {
  if (cachedContext) return cachedContext;

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Fetch the user's first membership (Phase 3: single-tenant per user)
  const { data: membership, error: memError } = await supabase
    .from("memberships")
    .select("tenantId, role")
    .eq("userId", user.id)
    .eq("active", true)
    .single();

  if (memError || !membership) throw new Error("No active membership found");

  cachedContext = {
    userId: user.id,
    tenantId: membership.tenantId,
    role: membership.role,
  };
  return cachedContext;
}

export function clearApiCache() {
  cachedContext = null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const ctx = await getContext();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": ctx.tenantId,
      "x-user-id": ctx.userId,
      "x-role": ctx.role,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API Error: ${res.status}`);
  }

  return res.json();
}

// --- Sprint A helpers: multipart upload and binary download ---
async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const ctx = await getContext();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "x-tenant-id": ctx.tenantId,
      "x-user-id": ctx.userId,
      "x-role": ctx.role,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body.error || `API Error: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  // No Content-Type here: the browser sets the multipart boundary itself
  const res = await rawFetch(path, { method: "POST", body: form });
  return res.json();
}

export async function apiBlob(path: string): Promise<Blob> {
  const res = await rawFetch(path);
  return res.blob();
}
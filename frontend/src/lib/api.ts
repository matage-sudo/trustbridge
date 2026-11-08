const API_URL = "http://127.0.0.1:4000/v1";
const DEV_TENANT_ID = "ad0a4777-cee4-4e69-894a-410648d8b22a";
const DEV_USER_ID = "72b1a9dc-35be-4a6c-8588-c02f2aec7fb8";
const DEV_ROLE = "HOSPITAL_ADMIN";

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": DEV_TENANT_ID,
      "x-user-id": DEV_USER_ID,
      "x-role": DEV_ROLE,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API Error: ${res.status}`);
  }
  return res.json();
}
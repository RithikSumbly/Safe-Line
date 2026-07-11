import { supabase } from "@/lib/supabase";

const SAFE_CLIENT_HEADER = "X-SafeLine-Client";

export async function buildApiHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [SAFE_CLIENT_HEADER]: "web",
    ...extra,
  };

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!API_BASE) {
    throw new Error("API is not configured. Set VITE_API_BASE_URL.");
  }

  const headers = await buildApiHeaders(
    init.headers as Record<string, string> | undefined,
  );

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
}

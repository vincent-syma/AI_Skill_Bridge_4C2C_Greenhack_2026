import { API_BASE } from "./config";
import { Auth } from "./auth-storage";

type FetchOptions = {
  method?: string;
  body?: unknown;
  form?: FormData;
  auth?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, form, auth = true }: FetchOptions = {},
): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (auth) {
    const tok = Auth.getToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }

  let bodyPayload: BodyInit | undefined;
  if (form) {
    bodyPayload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyPayload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: bodyPayload,
    credentials: "include",
  });

  if (res.status === 204) return null;

  const json = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) {
    const detail = (json as { detail?: unknown })?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
          : `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data: json });
  }
  return json as T;
}

/* ============================================================
   api.jsx — typed API client for the AI Skill Bridge backend.
   Loaded before all page scripts so every page can use `API.*`.
   ============================================================ */

const API_BASE = "http://localhost:8000/api/v1";
const TOKEN_KEY = "bridge_access_token";

/* ---------- token helpers ---------- */
const Auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

/* ---------- core fetch ---------- */
async function apiFetch(path, { method = "GET", body, form, auth = true } = {}) {
  const headers = {};
  if (auth) {
    const tok = Auth.getToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  }

  let bodyPayload;
  if (form) {
    bodyPayload = form; // FormData
  } else if (body) {
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
    const detail = json?.detail;
    const msg = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
        : `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data: json });
  }
  return json;
}

/* ---------- auth ---------- */
const API = {
  auth: {
    async register({ email, password, name, department }) {
      return apiFetch("/auth/register", {
        method: "POST",
        body: { email, password, name, department },
        auth: false,
      });
    },

    async login(email, password) {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || "Login failed");
      Auth.setToken(json.access_token);
      return json;
    },

    async logout() {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
      Auth.clearToken();
    },

    async me() {
      return apiFetch("/auth/me");
    },

    async refresh() {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      Auth.setToken(json.access_token);
      return json;
    },

    async forgotPassword(email) {
      return apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      });
    },

    async resetPassword(token, password) {
      return apiFetch("/auth/reset-password", {
        method: "POST",
        body: { token, password },
        auth: false,
      });
    },

    async changePassword(currentPassword, newPassword) {
      return apiFetch("/auth/change-password", {
        method: "POST",
        body: { current_password: currentPassword, new_password: newPassword },
      });
    },
  },

  /* ---------- users ---------- */
  users: {
    me: () => apiFetch("/users/me"),
    updateMe: (data) => apiFetch("/users/me", { method: "PATCH", body: data }),
    getSettings: () => apiFetch("/users/me/settings"),
    updateSettings: (data) => apiFetch("/users/me/settings", { method: "PATCH", body: data }),
    getStats: () => apiFetch("/users/me/stats"),
    getBadges: () => apiFetch("/users/me/badges"),
    getActivity: (limit = 20) => apiFetch(`/users/me/activity?limit=${limit}`),
  },

  /* ---------- projects ---------- */
  projects: {
    list: (params = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ).toString();
      return apiFetch(`/projects${q ? "?" + q : ""}`);
    },
    get: (id) => apiFetch(`/projects/${id}`),
    brief: (id) => apiFetch(`/projects/${id}/brief`),
    start: (id) => apiFetch(`/projects/${id}/start`, { method: "POST" }),
    saveNotes: (id, notes) =>
      apiFetch(`/projects/${id}/notes`, { method: "PATCH", body: { notes } }),
    submit: (id, notes) =>
      apiFetch(`/projects/${id}/submit`, { method: "POST", body: { notes } }),
    retry: (id) => apiFetch(`/projects/${id}/retry`, { method: "POST" }),
  },

  /* ---------- peer evaluations ---------- */
  peerEvals: {
    queue: () => apiFetch("/peer-evaluations/queue"),
    received: () => apiFetch("/peer-evaluations/received"),
    get: (id) => apiFetch(`/peer-evaluations/${id}`),
    submit: (id, data) =>
      apiFetch(`/peer-evaluations/${id}/submit`, { method: "POST", body: data }),
    confirm: (id) => apiFetch(`/peer-evaluations/${id}/confirm`, { method: "POST" }),
    dispute: (id) => apiFetch(`/peer-evaluations/${id}/dispute`, { method: "POST" }),
  },

  /* ---------- availability ---------- */
  availability: {
    get: () => apiFetch("/availability/me"),
    set: (slots) => apiFetch("/availability/me", { method: "PUT", body: { slots } }),
  },

  /* ---------- showcase ---------- */
  showcase: {
    feed: (page = 1, pageSize = 12) =>
      apiFetch(`/showcase/feed?page=${page}&page_size=${pageSize}`),
    featured: () => apiFetch("/showcase/featured"),
    get: (id) => apiFetch(`/showcase/${id}`),
    markHelpful: (id) => apiFetch(`/showcase/${id}/helpful`, { method: "POST" }),
    share: (id) => apiFetch(`/showcase/${id}/share`, { method: "POST" }),
  },

  /* ---------- notifications ---------- */
  notifications: {
    list: (unreadOnly = false) =>
      apiFetch(`/notifications?unread_only=${unreadOnly}`),
    markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
  },

  /* ---------- meta ---------- */
  meta: {
    departments: () => apiFetch("/departments"),
    tools: () => apiFetch("/tools"),
    taskTypes: () => apiFetch("/task-types"),
    search: (q) => apiFetch(`/search?q=${encodeURIComponent(q)}`),
  },
};

/* ---------- convenience hooks for React ---------- */

/**
 * useApi(fn, deps) — calls fn() on mount and when deps change.
 * Returns [data, loading, error, refetch].
 * fn must return a promise (usually an API.* call).
 */
function useApi(fn, deps = []) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const run = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message || "Error"); setLoading(false); });
  }, deps);

  React.useEffect(() => { run(); }, [run]);
  return [data, loading, error, run];
}

/* ---------- Loading / Error primitives ---------- */
function ApiLoader({ loading, error, children }) {
  if (loading) return <div className="dim" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>Loading…</div>;
  if (error) return <div className="card" style={{ padding: 16, color: "var(--err, #f87171)", fontSize: 13 }}>{error}</div>;
  return children;
}

Object.assign(window, { API, Auth, useApi, ApiLoader });

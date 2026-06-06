import { API_BASE } from "./config";
import { Auth } from "./auth-storage";
import { apiFetch } from "./client";
import type { AuthUser, UserSettings } from "./types";

export type { AuthUser, UserSettings, ProjectRead, ProjectDetail, UserProjectStatus } from "./types";

export { apiFetch } from "./client";
export { Auth } from "./auth-storage";

export const API = {
  auth: {
    register(data: {
      email: string;
      password: string;
      name: string;
      department: string;
    }) {
      return apiFetch("/auth/register", {
        method: "POST",
        body: data,
        auth: false,
      });
    },

    async login(email: string, password: string) {
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
      if (!res.ok)
        throw new Error((json as { detail?: string })?.detail || "Login failed");
      Auth.setToken((json as { access_token: string }).access_token);
      return json;
    },

    async logout() {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
      Auth.clearToken();
    },

    me: () => apiFetch<AuthUser>("/auth/me"),

    async refresh() {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      Auth.setToken((json as { access_token: string }).access_token);
      return json;
    },

    forgotPassword: (email: string) =>
      apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      }),

    resetPassword: (token: string, password: string) =>
      apiFetch("/auth/reset-password", {
        method: "POST",
        body: { token, password },
        auth: false,
      }),

    changePassword: (currentPassword: string, newPassword: string) =>
      apiFetch<{ message?: string }>("/auth/change-password", {
        method: "POST",
        body: { current_password: currentPassword, new_password: newPassword },
      }),
  },

  teams: {
    peerCount: (department: string) =>
      apiFetch<{ department: string; peer_count: number; exact_matches: number }>(
        `/teams/peer-count?department=${encodeURIComponent(department)}`,
      ),
  },

  users: {
    me: () => apiFetch("/users/me"),
    updateMe: (data: Record<string, unknown>) =>
      apiFetch("/users/me", { method: "PATCH", body: data }),
    getSettings: () => apiFetch<UserSettings | null>("/users/me/settings"),
    updateSettings: (data: Record<string, unknown>) =>
      apiFetch("/users/me/settings", { method: "PATCH", body: data }),
    getStats: () => apiFetch("/users/me/stats"),
    getBadges: () => apiFetch("/users/me/badges"),
    getActivity: (limit = 20) =>
      apiFetch(`/users/me/activity?limit=${limit}`),
    resetProgress: () =>
      apiFetch<{ message: string }>("/users/me/reset-progress", {
        method: "POST",
      }),
  },

  projects: {
    list: (params: Record<string, unknown> = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString();
      return apiFetch(`/projects${q ? "?" + q : ""}`);
    },
    get: (id: string) => apiFetch(`/projects/${id}`),
    brief: (id: string) => apiFetch(`/projects/${id}/brief`),
    start: (id: string) =>
      apiFetch(`/projects/${id}/start`, { method: "POST" }),
    saveNotes: (id: string, notes: string) =>
      apiFetch(`/projects/${id}/notes`, { method: "PATCH", body: { notes } }),
    submit: (id: string, notes: string) =>
      apiFetch(`/projects/${id}/submit`, {
        method: "POST",
        body: { notes },
      }),
    retry: (id: string) =>
      apiFetch(`/projects/${id}/retry`, { method: "POST" }),
    adminCreate: (data: Record<string, unknown>) =>
      apiFetch(`/projects/admin`, { method: "POST", body: data }),
    adminUpdate: (taskId: number | string, data: Record<string, unknown>) =>
      apiFetch(`/projects/admin/${taskId}`, { method: "PATCH", body: data }),
  },

  peerEvals: {
    queue: () => apiFetch("/peer-evaluations/queue"),
    received: () => apiFetch("/peer-evaluations/received"),
    available: () => apiFetch("/peer-evaluations/available"),
    claim: (submissionId: number) =>
      apiFetch("/peer-evaluations/claim", {
        method: "POST",
        body: { submission_id: submissionId },
      }),
    get: (id: string) => apiFetch(`/peer-evaluations/${id}`),
    submit: (id: string, data: Record<string, unknown>) =>
      apiFetch(`/peer-evaluations/${id}/submit`, {
        method: "POST",
        body: data,
      }),
    confirm: (id: string, data: { reflection: string }) =>
      apiFetch(`/peer-evaluations/${id}/confirm`, { method: "POST", body: data }),
    dispute: (id: string) =>
      apiFetch(`/peer-evaluations/${id}/dispute`, { method: "POST" }),
  },

  availability: {
    get: () => apiFetch("/availability/me"),
    set: (slots: unknown) =>
      apiFetch("/availability/me", { method: "PUT", body: { slots } }),
    peersNow: () => apiFetch("/availability/peers"),
  },

  showcase: {
    feed: (page = 1, pageSize = 12) =>
      apiFetch(`/showcase/feed?page=${page}&page_size=${pageSize}`),
    featured: () => apiFetch("/showcase/featured"),
    get: (id: string) => apiFetch(`/showcase/${id}`),
    markHelpful: (id: string) =>
      apiFetch(`/showcase/${id}/helpful`, { method: "POST" }),
    share: (id: string) =>
      apiFetch(`/showcase/${id}/share`, { method: "POST" }),
  },

  notifications: {
    list: (unreadOnly = false) =>
      apiFetch(`/notifications?unread_only=${unreadOnly}`),
    markRead: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () =>
      apiFetch("/notifications/read-all", { method: "PATCH" }),
  },

  meta: {
    departments: () => apiFetch("/departments"),
    tools: () => apiFetch("/tools"),
    taskTypes: () => apiFetch("/task-types"),
    curricula: () => apiFetch("/curricula"),
    search: (q: string) => apiFetch(`/search?q=${encodeURIComponent(q)}`),
  },

  playground: {
    models: () => apiFetch("/ai/playground/models"),
    chat: (body: {
      model: string;
      messages: { role: "system" | "user" | "assistant"; content: string }[];
    }) =>
      apiFetch("/ai/playground/chat", {
        method: "POST",
        body,
      }),
    test: (base_url: string) =>
      apiFetch<{
        reachable: boolean;
        base_url: string;
        models: { id: string; name: string }[];
      }>("/ai/playground/test", {
        method: "POST",
        body: { base_url },
      }),
  },
};

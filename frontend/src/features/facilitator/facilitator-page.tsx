"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API } from "@/lib/api";
import { ICONS } from "@/components/ui/icons";

type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  instructions?: string;
  category: string | null;
  difficulty: number;
  xp_reward: number;
  estimated_time: string | null;
  tools: string[];
  position: number;
  status?: "visible" | "hidden";
};

type Role = "user" | "power_user" | "admin" | string | undefined;

const CATEGORIES = ["Basics", "Prompting", "Reporting", "Summarize", "Content", "Chatbot", "Automation"];

function emptyDraft(): Partial<TaskRow> & { instructions: string } {
  return {
    title: "",
    description: "",
    instructions: "",
    category: "Basics",
    difficulty: 1,
    xp_reward: 100,
    estimated_time: "30 min",
    tools: [],
    position: 0,
    status: "visible",
  };
}

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      className="toast"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
      }}
    >
      {msg}
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="page col g4" style={{ padding: 24 }}>
      <div className="card col g3" style={{ padding: 24, maxWidth: 560 }}>
        <span className="lbl">Facilitator</span>
        <h2 className="h2" style={{ margin: 0 }}>You don&apos;t have access</h2>
        <p className="dim" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          The Facilitator workspace is for power users and admins. If you think you should
          have access, ask a workspace admin to upgrade your role.
        </p>
      </div>
    </div>
  );
}

function TaskEditor({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
  isCreate,
}: {
  draft: any;
  onChange: (patch: any) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  isCreate: boolean;
}) {
  return (
    <div className="eval-overlay" onClick={onClose}>
      <div className="eval-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between center">
          <h2 className="h2" style={{ margin: 0 }}>
            {isCreate ? "Create task" : "Edit task"}
          </h2>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            {ICONS.x}
          </button>
        </div>

        <label className="col g2">
          <span className="lbl">Title</span>
          <input
            className="inp"
            value={draft.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </label>

        <label className="col g2">
          <span className="lbl">Description</span>
          <textarea
            className="inp notes"
            rows={2}
            value={draft.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </label>

        <label className="col g2">
          <span className="lbl">Instructions</span>
          <textarea
            className="inp notes"
            rows={4}
            value={draft.instructions || ""}
            onChange={(e) => onChange({ instructions: e.target.value })}
          />
        </label>

        <div className="row g3" style={{ flexWrap: "wrap" }}>
          <label className="col g2" style={{ minWidth: 160, flex: 1 }}>
            <span className="lbl">Category</span>
            <select
              className="sel"
              value={draft.category || ""}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="col g2" style={{ minWidth: 120 }}>
            <span className="lbl">Difficulty</span>
            <select
              className="sel"
              value={String(draft.difficulty ?? 1)}
              onChange={(e) => onChange({ difficulty: Number(e.target.value) })}
            >
              <option value="1">1 · Easy</option>
              <option value="2">2 · Medium</option>
              <option value="3">3 · Hard</option>
            </select>
          </label>

          <label className="col g2" style={{ minWidth: 110 }}>
            <span className="lbl">XP reward</span>
            <input
              className="inp"
              type="number"
              min={0}
              value={draft.xp_reward ?? 0}
              onChange={(e) => onChange({ xp_reward: Number(e.target.value) })}
            />
          </label>

          <label className="col g2" style={{ minWidth: 110 }}>
            <span className="lbl">Position</span>
            <input
              className="inp"
              type="number"
              min={0}
              value={draft.position ?? 0}
              onChange={(e) => onChange({ position: Number(e.target.value) })}
            />
          </label>

          <label className="col g2" style={{ minWidth: 140 }}>
            <span className="lbl">Estimated time</span>
            <input
              className="inp"
              value={draft.estimated_time || ""}
              onChange={(e) => onChange({ estimated_time: e.target.value })}
            />
          </label>
        </div>

        {!isCreate && (
          <div className="row between center">
            <span className="lbl">Visible in catalogue</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={draft.status !== "hidden"}
                onChange={(e) =>
                  onChange({ status: e.target.checked ? "visible" : "hidden" })
                }
              />
              <span />
            </label>
          </div>
        )}

        <div className="row between center">
          <button className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={onSave}
            disabled={saving || !draft.title || !draft.instructions}
          >
            {saving ? "Saving…" : isCreate ? "Create task" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FacilitatorPage() {
  const [roleChecked, setRoleChecked] = useState(false);
  const [role, setRole] = useState<Role>(undefined);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<any>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 1800);
  };

  useEffect(() => {
    let cancelled = false;
    API.auth
      .me()
      .then((u: any) => {
        if (cancelled) return;
        setRole(u?.role);
      })
      .catch(() => {})
      .finally(() => !cancelled && setRoleChecked(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const isPower = role === "power_user" || role === "admin";

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const rows = (await API.projects.list({ include_hidden: true })) as any;
      setTasks(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setErr(e?.message || "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPower) loadTasks();
  }, [isPower, loadTasks]);

  const stats = useMemo(() => {
    const visible = tasks.filter((t) => (t.status ?? "visible") !== "hidden").length;
    const hidden = tasks.length - visible;
    const xp = tasks.reduce((s, t) => s + (t.xp_reward || 0), 0);
    return { visible, hidden, total: tasks.length, xp };
  }, [tasks]);

  const openEdit = (t: TaskRow) => {
    setCreating(false);
    setEditing(t);
    setDraft({
      title: t.title,
      description: t.description ?? "",
      instructions: (t as any).instructions ?? "",
      category: t.category ?? "Basics",
      difficulty: t.difficulty ?? 1,
      xp_reward: t.xp_reward ?? 0,
      estimated_time: t.estimated_time ?? "",
      tools: t.tools ?? [],
      position: t.position ?? 0,
      status: (t.status as any) ?? "visible",
    });
  };

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setDraft(emptyDraft());
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (creating) {
        const { status, ...rest } = draft;
        await API.projects.adminCreate(rest);
        flash("Task created");
      } else if (editing) {
        await API.projects.adminUpdate(editing.id, draft);
        flash("Task updated · live");
      }
      closeModal();
      await loadTasks();
    } catch (e: any) {
      flash(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!roleChecked) {
    return (
      <div className="page col g4" style={{ padding: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <span className="dim">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isPower) return <AccessDenied />;

  return (
    <div className="page col g4" style={{ padding: 24, gap: 18 }}>
      <Toast msg={toast} />

      {/* Header */}
      <div className="row between center" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="lbl">Facilitator</span>
          <h1 className="display d3" style={{ margin: 0 }}>
            Facilitator
          </h1>
          <span className="dim" style={{ fontSize: 13 }}>
            Edit tasks · curate showcase · see workshop pulse
          </span>
        </div>
        <button className="btn primary" onClick={openCreate}>
          {ICONS.plus} New task
        </button>
      </div>

      {/* Pulse cards */}
      <div className="row g3" style={{ flexWrap: "wrap" }}>
        <div className="card col g2" style={{ padding: 14, minWidth: 150, flex: 1 }}>
          <span className="lbl">Total tasks</span>
          <span className="num" style={{ fontSize: 24 }}>
            {stats.total}
          </span>
        </div>
        <div className="card col g2" style={{ padding: 14, minWidth: 150, flex: 1 }}>
          <span className="lbl">Visible</span>
          <span className="num" style={{ fontSize: 24 }}>
            {stats.visible}
          </span>
        </div>
        <div className="card col g2" style={{ padding: 14, minWidth: 150, flex: 1 }}>
          <span className="lbl">Hidden</span>
          <span className="num" style={{ fontSize: 24 }}>
            {stats.hidden}
          </span>
        </div>
        <div className="card col g2" style={{ padding: 14, minWidth: 150, flex: 1 }}>
          <span className="lbl">Total XP on offer</span>
          <span className="num" style={{ fontSize: 24 }}>
            {stats.xp}
          </span>
        </div>
      </div>

      {/* Tasks table */}
      <div className="card col" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="row between center"
          style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}
        >
          <div className="col" style={{ gap: 2 }}>
            <h2 className="h2" style={{ margin: 0, fontSize: 16 }}>
              Tasks
            </h2>
            <span className="dim" style={{ fontSize: 12 }}>
              Live · changes take effect immediately
            </span>
          </div>
          <button className="btn sm" onClick={loadTasks} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {err && (
          <div style={{ padding: 14, fontSize: 12, color: "var(--err, #f87171)" }}>{err}</div>
        )}

        {!loading && tasks.length === 0 ? (
          <div className="col center" style={{ padding: 40, gap: 8, textAlign: "center" }}>
            <span className="lbl">Empty catalogue</span>
            <span className="dim" style={{ fontSize: 13 }}>
              No tasks yet. Create your first one to seed the workshop.
            </span>
            <button className="btn primary sm" onClick={openCreate} style={{ marginTop: 6 }}>
              {ICONS.plus} New task
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-2)" }}>
                  <th style={th}>#</th>
                  <th style={th}>Title</th>
                  <th style={th}>Category</th>
                  <th style={th}>Status</th>
                  <th style={th}>XP</th>
                  <th style={th}>Difficulty</th>
                  <th style={{ ...th, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks
                  .slice()
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((t) => {
                    const hidden = (t.status ?? "visible") === "hidden";
                    return (
                      <tr key={t.id} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={td}>
                          <span className="mono dim">{t.position ?? 0}</span>
                        </td>
                        <td style={td}>
                          <div className="col" style={{ gap: 2 }}>
                            <span style={{ fontWeight: 500 }}>{t.title}</span>
                            {t.description && (
                              <span className="dim" style={{ fontSize: 11.5 }}>
                                {t.description.slice(0, 80)}
                                {t.description.length > 80 ? "…" : ""}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={td}>
                          <span className="pill">{t.category || "—"}</span>
                        </td>
                        <td style={td}>
                          <span className={"pill" + (hidden ? "" : " on")}>
                            {hidden ? "Hidden" : "Visible"}
                          </span>
                        </td>
                        <td style={td}>
                          <span className="num">{t.xp_reward}</span>
                        </td>
                        <td style={td}>
                          <span className="mono">{t.difficulty}</span>
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <button className="btn sm" onClick={() => openEdit(t)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(editing || creating) && (
        <TaskEditor
          draft={draft}
          isCreate={creating}
          saving={saving}
          onChange={(patch) => setDraft((d: any) => ({ ...d, ...patch }))}
          onClose={closeModal}
          onSave={save}
        />
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  fontFamily: "var(--mono)",
  fontWeight: 500,
};

const td: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "middle",
};

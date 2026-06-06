// @ts-nocheck — legacy port; tighten types incrementally per feature.
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useApp } from "@/providers/app-context";
import { API, Auth } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { ApiLoader } from "@/components/api/api-loader";
import { Av, Pill, Bar, Stars, Badge, Ring, ImgPh, Mark, TrustPanel } from "@/components/ui";
import { ICONS } from "@/components/ui/icons";
import { DICT, LANG_META, lx } from "@/lib/i18n";
import { useRouter, useSearchParams } from "next/navigation";
import { ProjectModal, ProjectSlotScheduler } from "./project-evaluation-ui";
import { PromptProjectFinishedFlow } from "./templates/prompt-project-finished";
import {
  PROJECT_FINISH_PARAM,
  projectFinishHref,
  readFinishNotes,
  stashFinishNotes,
} from "./templates/project-finish-nav";
import { TaskScaffoldChecklist } from "@/features/curriculum/task-scaffold-checklist";
import { countCompletedProjects, filterGeneralCurriculum } from "@/features/projects/learning-path";

// Map backend user_status → Aurora pill kind + i18n label key
const PROJECT_STATUS = {
  not_started: { kind: "",       key: "projectStatusGo" },
  doing:       { kind: "accent", key: "projectStatusDoing" },
  submitted:   { kind: "",       key: "projectStatusReview" },
  completed:   { kind: "green",  key: "projectStatusDone" },
};

const PROJECT_FILTERS = [
  ["all", "filterAll"],
  ["not_started", "projectStatusGo"],
  ["doing", "projectStatusDoing"],
  ["submitted", "projectStatusReview"],
  ["completed", "projectStatusDone"],
];

// Tools we treat as "AI" → eligible for the rationed .pill.ai gradient.
const AI_TOOLS = new Set([
  "claude", "chatgpt", "gpt-4", "gpt-4o", "gemini", "copilot",
  "github copilot", "midjourney", "perplexity", "notion ai", "cursor",
]);
const isAiTool = (name) => AI_TOOLS.has(String(name || "").trim().toLowerCase());

function ProjectStatusPill({ status }) {
  const { t } = useApp();
  const m = PROJECT_STATUS[status] || PROJECT_STATUS.not_started;
  return <span className={"pill " + m.kind}>{t(m.key)}</span>;
}

function ToolPill({ name }) {
  // Rationed AI gradient: only on a known AI tool.
  return <span className={"pill" + (isAiTool(name) ? " ai" : "")}>{name}</span>;
}

function DifficultyStars({ n }) {
  const { t } = useApp();
  // 1–3 visual; reuse .star primitive (5-star), filling n of 3.
  return (
    <span className="star" title={t("difficultyTitle", { n })} aria-label={`difficulty ${n}/3`}>
      {"★".repeat(n)}<span className="off">{"★".repeat(Math.max(0, 3 - n))}</span>
    </span>
  );
}

function useToast() {
  const [msg, setMsg] = useState(null);
  const timerRef = useRef(null);
  const fire = (m) => {
    setMsg(m);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMsg(null), 2300);
  };
  return [msg ? <div className="toast" role="status">✓ {msg}</div> : null, fire];
}

function ctaForStatus(status, t) {
  switch (status) {
    case "not_started": return t("startProject");
    case "doing":       return t("projectSubmit");
    case "submitted":   return t("manageEvalSlots") || "View";
    case "completed":   return t("retryImprove");
    default:            return "Open";
  }
}

function ProjectCard({ p, on, onClick }) {
  const { t } = useApp();
  return (
    <div
      className={"card task-card" + (on ? " sel-on" : "")}
      onClick={() => onClick(p)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(p); }}
      style={{ cursor: "pointer" }}
    >
      <div className="row between center wrap" style={{ gap: 8 }}>
        <span className="pill">{p.category || "General"}</span>
        <DifficultyStars n={p.difficulty || 1} />
      </div>
      <div className="h3" style={{ marginTop: 8, fontSize: 15, lineHeight: 1.3 }}>{p.title}</div>
      {(p.tools || []).length > 0 && (
        <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
          {p.tools.slice(0, 3).map((nm) => <ToolPill key={nm} name={nm} />)}
        </div>
      )}
      <div className="row between center" style={{ marginTop: 10 }}>
        <ProjectStatusPill status={p.user_status} />
        {p.user_status === "completed" && p.my_grade
          ? <Stars n={Math.round(p.my_grade)} />
          : <span className="pill accent num">+{p.xp_reward} XP</span>}
      </div>
      <div className="row between center" style={{ marginTop: 10 }}>
        {p.estimated_time
          ? <span className="lbl mono">{p.estimated_time}</span>
          : <span />}
        <button
          className={"btn sm " + (p.user_status === "not_started" || p.user_status === "doing" ? "primary" : "")}
          onClick={(e) => { e.stopPropagation(); onClick(p); }}
        >
          {ctaForStatus(p.user_status, t)}
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({ p, onStart, onSaveNotes, onSubmit, onRetry, openSlots, toast }) {
  const { t } = useApp();
  const [subjectOpen, setSubjectOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [notes, setNotes] = useState(p.my_notes || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setNotes(p.my_notes || "");
    setSubjectOpen(true);
    setGuideOpen(false);
  }, [p.id]);

  // Auto-save notes (debounced) — preserves prior behavior of explicit Save while
  // adding a soft auto-save when the user pauses typing.
  const autoSaveRef = useRef(null);
  useEffect(() => {
    if (p.user_status !== "doing") return;
    if (notes === (p.my_notes || "")) return;
    window.clearTimeout(autoSaveRef.current);
    autoSaveRef.current = window.setTimeout(() => {
      onSaveNotes(p.id, notes).catch(() => {});
    }, 1200);
    return () => window.clearTimeout(autoSaveRef.current);
  }, [notes, p.id, p.user_status, p.my_notes, onSaveNotes]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await onSaveNotes(p.id, notes);
      toast(t("toastNotesSaved"));
    } catch (e) {
      toast("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const tools = p.tools || [];
  const hasAiTool = tools.some(isAiTool);

  return (
    <div className="card col grow project-detail" style={{ gap: 14 }}>
      {/* Header */}
      <div className="col" style={{ gap: 8 }}>
        <div className="row between center wrap" style={{ gap: 8 }}>
          <span className="pill">{p.category || "General"}</span>
          <div className="row center" style={{ gap: 8 }}>
            <span className="pill accent num">+{p.xp_reward} XP</span>
            <DifficultyStars n={p.difficulty || 1} />
          </div>
        </div>
        <h2 className="h2 project-title" style={{ margin: 0 }}>{p.title}</h2>
        <div className="row center wrap" style={{ gap: 12 }}>
          <ProjectStatusPill status={p.user_status} />
          {p.estimated_time && <span className="lbl mono">⏱ {p.estimated_time}</span>}
        </div>
        {p.description && (
          <div className="prose" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{p.description}</div>
        )}
        {tools.length > 0 && (
          <div className="row wrap center" style={{ marginTop: 2, gap: 6 }}>
            <span className="lbl">{t("tryWithTools")}</span>
            {tools.map((nm) => <ToolPill key={nm} name={nm} />)}
          </div>
        )}
      </div>

      {p.user_status === "doing" && (
        <div className="card" style={{ padding: 12, background: "var(--surface-2)" }}>
          <TaskScaffoldChecklist
            storageKey={`project-scaffold:${p.id}`}
            items={[
              { id: "clarify", label: t("projectScaffoldClarify") },
              { id: "draft", label: t("projectScaffoldDraft") },
              { id: "run", label: t("projectScaffoldRun") },
              { id: "iterate", label: t("projectScaffoldIterate") },
              { id: "reflect", label: t("projectScaffoldReflect") },
            ]}
          />
        </div>
      )}

      {/* Instructions block (collapsible) */}
      {p.instructions && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <button
            className="row between center"
            onClick={() => setSubjectOpen((v) => !v)}
            style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: 0, cursor: "pointer", textAlign: "left" }}
            aria-expanded={subjectOpen}
          >
            <span className="lbl">{t("subjectHow")}</span>
            <span className="dim mono" style={{ fontSize: 11 }}>{subjectOpen ? t("hide") : t("show")}</span>
          </button>
          {subjectOpen && (
            <div className="col" style={{ padding: 12, gap: 10 }}>
              <div className="prose" style={{ fontSize: 13, whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>
                {p.instructions}
              </div>
              {tools.length > 0 && (
                <div className="row wrap center" style={{ gap: 6 }}>
                  <span className="lbl">{t("suggestedTools")}</span>
                  {tools.map((nm) => <ToolPill key={nm} name={nm} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Evaluator guide — collapsed card, only when present on the detail payload */}
      {p.evaluator_guide && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <button
            className="row between center"
            onClick={() => setGuideOpen((v) => !v)}
            style={{ width: "100%", padding: "10px 12px", background: "var(--surface-2)", border: 0, cursor: "pointer", textAlign: "left" }}
            aria-expanded={guideOpen}
          >
            <span className="lbl">{t("objectivesEval") || "Evaluator guide"}</span>
            <span className="dim mono" style={{ fontSize: 11 }}>{guideOpen ? t("hide") : t("show")}</span>
          </button>
          {guideOpen && (
            <div className="prose" style={{ padding: 12, fontSize: 13, whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>
              {p.evaluator_guide}
            </div>
          )}
        </div>
      )}

      {/* Notes editor */}
      <label className="col" style={{ gap: 6 }}>
        <span className="lbl">{t("yourNotes")}</span>
        <textarea
          className="notes"
          value={notes}
          disabled={p.user_status === "submitted" || p.user_status === "not_started"}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          rows={5}
        />
      </label>

      {p.user_status === "completed" && p.my_grade && (
        <div className="card" style={{ padding: 12, background: "var(--surface-2)" }}>
          <div className="row between center">
            <span className="lbl">{t("yourGrade")}</span>
            <Stars n={Math.round(p.my_grade)} />
          </div>
        </div>
      )}

      {p.user_status === "submitted" && (
        <div className="card col" style={{ padding: 12, gap: 8, background: "var(--surface-2)" }}>
          <span className="lbl">{t("waitingPeerEval")}</span>
          <span style={{ fontSize: 13 }}>{t("autoMatchPeer")}</span>
          <button className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => openSlots(p)}>
            {t("manageEvalSlots")}
          </button>
        </div>
      )}

      {/* Action footer */}
      <div className="row wrap between center" style={{ gap: 9, marginTop: 4 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          {p.user_status === "not_started" && (
            <button className="btn primary" onClick={() => onStart(p.id)}>{t("startProject")}</button>
          )}
          {p.user_status === "doing" && (
            <>
              <button className="btn" onClick={handleSaveNotes} disabled={saving}>
                {saving ? "…" : t("saveNotes")}
              </button>
              <button className="btn primary" onClick={() => onSubmit(p, notes)}>{t("projectSubmit")}</button>
            </>
          )}
          {p.user_status === "submitted" && (
            <button className="btn" onClick={async () => { await onRetry(p.id); }}>{t("reopenSubmission")}</button>
          )}
          {p.user_status === "completed" && (
            <button className="btn" onClick={() => onRetry(p.id)}>{t("retryImprove")}</button>
          )}
        </div>
        {/* Rationed AI moment #2: AI-assist CTA (only when the task uses an AI tool & it's actionable). */}
        {hasAiTool && (p.user_status === "doing" || p.user_status === "not_started") && (
          <a className="btn ai sm" href="/playground" title="Open AI playground">
            ✦ AI-assist this task
          </a>
        )}
      </div>
    </div>
  );
}

function ProjectsPage() {
  const { t } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantFinish = searchParams.get(PROJECT_FINISH_PARAM) === "1";
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryF, setCategoryF] = useState("all");
  const [toolF, setToolF] = useState("all");
  const [finishFlow, setFinishFlow] = useState(null);
  const [slotProj, setSlotProj] = useState(null);
  const [currentSlots, setCurrentSlots] = useState({});
  const [toastNode, toast] = useToast();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.projects.list();
      setProjects(data);
      if (!selId && data.length > 0) {
        const doing = data.find((p) => p.user_status === "doing");
        const ns = data.find((p) => p.user_status === "not_started");
        setSelId((doing || ns || data[0]).id);
      }
    } catch (e) {
      toast("Failed to load projects: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    const raw = searchParams.get("select");
    if (!raw) return;
    const id = Number(raw);
    if (Number.isFinite(id)) setSelId(id);
  }, [searchParams]);

  const clearFinishUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(PROJECT_FINISH_PARAM);
    const q = params.toString();
    router.replace(q ? `/projects?${q}` : "/projects");
  }, [router, searchParams]);

  useEffect(() => {
    if (!wantFinish || loading || !selId || finishFlow) return;
    const p = projects.find((x) => x.id === selId);
    if (!p) return;
    if (p.user_status !== "doing") {
      clearFinishUrl();
      return;
    }
    setFinishFlow({ project: p, notes: readFinishNotes(p.id, p.my_notes || "") });
  }, [wantFinish, loading, selId, projects, finishFlow, clearFinishUrl]);

  useEffect(() => {
    API.availability
      .get()
      .then((a) => {
        const raw = a.slots || {};
        const norm = {};
        for (const [k, v] of Object.entries(raw)) {
          norm[k.includes("|") ? k : k.replace("-", "|")] = v;
        }
        setCurrentSlots(norm);
      })
      .catch(() => {});
  }, []);

  const allCategories = useMemo(() => {
    const s = new Set();
    projects.forEach((p) => { if (p.category) s.add(p.category); });
    return ["all", ...Array.from(s)];
  }, [projects]);

  const allTools = useMemo(() => {
    const s = new Set();
    projects.forEach((p) => (p.tools || []).forEach((t) => s.add(t)));
    return ["all", ...Array.from(s)];
  }, [projects]);

  const sel = projects.find((x) => x.id === selId) || projects[0];

  const shown = projects.filter((p) => {
    if (filter !== "all" && p.user_status !== filter) return false;
    if (categoryF !== "all" && p.category !== categoryF) return false;
    if (toolF !== "all" && !(p.tools || []).includes(toolF)) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = (p.title || "").toLowerCase().includes(q) ||
                  (p.description || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });
  const counts = (s) => s === "all" ? projects.length : projects.filter((p) => p.user_status === s).length;
  const curriculumProjects = useMemo(() => filterGeneralCurriculum(projects), [projects]);
  const done = countCompletedProjects(curriculumProjects);

  const handleStart = async (id) => {
    try {
      await API.projects.start(id);
      toast(t("toastStarted"));
      await loadProjects();
      setSelId(id);
    } catch (e) {
      toast("Error: " + e.message);
    }
  };

  const handleSaveNotes = async (id, notes) => {
    await API.projects.saveNotes(id, notes);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, my_notes: notes } : p));
  };

  const handleSubmit = (p, notes) => {
    stashFinishNotes(p.id, notes);
    handleSaveNotes(p.id, notes).catch(() => {});
    router.replace(projectFinishHref(p.id));
  };

  const handleRetry = async (id) => {
    try {
      await API.projects.retry(id);
      toast(t("toastRetry"));
      await loadProjects();
      setSelId(id);
    } catch (e) {
      toast(t("toastReopened"));
    }
  };

  if (loading) {
    return (
      <div className="col projects-page">
        <div className="card center" style={{ padding: 24, color: "var(--ink-3)" }}>Loading projects…</div>
      </div>
    );
  }

  return (
    <div className="col projects-page" style={{ gap: 14 }}>
      {/* Page header */}
      <div className="row between center wrap" style={{ gap: 12 }}>
        <div className="col" style={{ gap: 2 }}>
          <h1 className="h1" style={{ margin: 0 }}>{t("projects")}</h1>
          <div className="dim" style={{ fontSize: 12.5 }}>{t("projectsSub")}</div>
        </div>
        <div className="row center" style={{ gap: 12 }}>
          <div className="col" style={{ alignItems: "flex-end", gap: 2 }}>
            <span className="num" style={{ fontSize: 16 }}>{done}/{curriculumProjects.length}</span>
            <span className="lbl">{t("completed")}</span>
          </div>
        </div>
      </div>

      {/* Filter row — status as .seg, category/tool as .sel, search as .field */}
      <div className="row wrap center between" style={{ gap: 12 }}>
        <div className="seg" role="tablist" aria-label="status">
          {PROJECT_FILTERS.map(([k, labelKey]) => (
            <button
              key={k}
              className={filter === k ? "on" : ""}
              onClick={() => setFilter(k)}
              role="tab"
              aria-selected={filter === k}
            >
              {t(labelKey)} <span className="num" style={{ marginLeft: 4, opacity: .75 }}>{counts(k)}</span>
            </button>
          ))}
        </div>
        <div className="row wrap center" style={{ gap: 8 }}>
          {allCategories.length > 2 && (
            <select className="sel" value={categoryF} onChange={(e) => setCategoryF(e.target.value)}>
              {allCategories.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>
              ))}
            </select>
          )}
          {allTools.length > 2 && (
            <select className="sel" value={toolF} onChange={(e) => setToolF(e.target.value)}>
              {allTools.map((c) => (
                <option key={c} value={c}>{c === "all" ? "All tools" : c}</option>
              ))}
            </select>
          )}
          <input
            className="inp search-inp"
            type="search"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 180 }}
          />
        </div>
      </div>

      <div className="project-layout">
        <div className="project-list col" style={{ gap: 10 }}>
          {shown.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              on={p.id === selId}
              onClick={(p) => setSelId(p.id)}
            />
          ))}
          {shown.length === 0 && (
            <div className="card center" style={{ padding: 16, color: "var(--ink-3)" }}>{t("noProjectsInView")}</div>
          )}
        </div>
        {sel && (
          <ProjectDetail
            p={sel}
            onStart={handleStart}
            onSaveNotes={handleSaveNotes}
            onSubmit={handleSubmit}
            onRetry={handleRetry}
            openSlots={setSlotProj}
            toast={toast}
          />
        )}
      </div>

      {finishFlow && (
        <PromptProjectFinishedFlow
          project={finishFlow.project}
          submissionNotes={finishFlow.notes}
          initialSlots={currentSlots}
          onClose={() => {
            setFinishFlow(null);
            clearFinishUrl();
          }}
          onError={(msg) => toast("Error: " + msg)}
          onSubmitted={async () => {
            toast(t("toastClosedEval"));
            await loadProjects();
          }}
          onPickProject={async (p) => {
            try {
              if (p.user_status === "not_started") {
                await API.projects.start(p.id);
                toast(t("toastStarted"));
                await loadProjects();
              }
              setSelId(p.id);
              setFinishFlow(null);
              clearFinishUrl();
            } catch (e) {
              toast("Error: " + e.message);
            }
          }}
        />
      )}
      {slotProj && (
        <ProjectModal title={t("evalSlots")} sub={slotProj.title} onClose={() => setSlotProj(null)}
          foot={[<button key="d" className="btn primary sm" onClick={() => setSlotProj(null)}>{t("done")}</button>]}>
          <ProjectSlotScheduler slots={currentSlots} setSlots={setCurrentSlots} />
        </ProjectModal>
      )}
      {toastNode}
    </div>
  );
}

export { ProjectsPage };

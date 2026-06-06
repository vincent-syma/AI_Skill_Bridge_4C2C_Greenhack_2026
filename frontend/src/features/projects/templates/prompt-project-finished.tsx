"use client";

import { useCallback, useEffect, useState } from "react";
import { API } from "@/lib/api";
import type { ProjectRead } from "@/lib/api/types";
import { useApp } from "@/providers/app-context";
import { ICONS } from "@/components/ui/icons";
import { ProjectSlotScheduler } from "../project-evaluation-ui";
import {
  buildPathCanvas,
  categoryLabelKey,
  type PathCanvasNode,
} from "../learning-path";
import { clearFinishNotes } from "./project-finish-nav";

export type PromptProjectFinishedFlowProps = {
  project: ProjectRead;
  submissionNotes: string;
  initialSlots: Record<string, string>;
  onClose: () => void;
  onSubmitted?: () => void | Promise<void>;
  onPickProject: (project: ProjectRead) => void;
  onError?: (message: string) => void;
};

const CONNECTOR_PATH = "M 8 40 C 60 40, 80 12, 192 28";

function PathConnector() {
  return (
    <svg className="lp-connector" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden>
      <defs>
        <filter id="lp-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        className="lp-connector-glow"
        d={CONNECTOR_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray="6 5"
        opacity="0.35"
      />
      <path
        className="lp-connector-line"
        d={CONNECTOR_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="6 5"
        strokeLinecap="round"
      />
      <circle r="3.5" className="lp-travel-dot" filter="url(#lp-glow)">
        <animateMotion dur="2.8s" repeatCount="indefinite" path={CONNECTOR_PATH} />
      </circle>
      <circle cx="8" cy="40" r="5" className="lp-port lp-port--start" />
      <circle cx="192" cy="28" r="5" className="lp-port lp-port--end" />
    </svg>
  );
}

function PathNodeCard({
  node,
  onPick,
}: {
  node: PathCanvasNode;
  onPick?: () => void;
}) {
  const { t } = useApp();
  const { project, role, notesSnippet } = node;
  const catKey = categoryLabelKey(project.category);
  const badge = catKey ? t(catKey) : (project.category || "Project").toUpperCase();

  return (
    <div
      className={"lp-node lp-node--" + role}
      role={role === "next" ? "button" : undefined}
      tabIndex={role === "next" ? 0 : undefined}
      onClick={role === "next" ? onPick : undefined}
      onKeyDown={
        role === "next"
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick?.();
              }
            }
          : undefined
      }
    >
      {role === "locked" && <span className="lp-blocked-mark">{t("pathBlocked")}</span>}
      <div className="lp-node-title">{project.title}</div>
      <div className="lp-node-desc">
        {role === "current" && notesSnippet
          ? notesSnippet
          : project.description || ""}
      </div>
      <span className="lp-node-badge">{badge}</span>
      {role === "current" && (
        <span className="lp-node-here">{t("pathYouAreHere")}</span>
      )}
      {role === "next" && (
        <span className="lp-node-cta">{t("pathPickProject")}</span>
      )}
    </div>
  );
}

function LearningPathCanvasModal({
  nodes,
  onClose,
  onPickProject,
}: {
  nodes: PathCanvasNode[];
  onClose: () => void;
  onPickProject: (project: ProjectRead) => void;
}) {
  const { t } = useApp();
  const [pendingPick, setPendingPick] = useState<ProjectRead | null>(null);
  const current = nodes.find((n) => n.role === "current");
  const next = nodes.find((n) => n.role === "next");
  const locked = nodes.find((n) => n.role === "locked");

  return (
    <>
      <div className="eval-overlay eval-overlay--blocking" role="dialog" aria-modal="true">
        <div className="eval-modal lp-modal lp-modal--fullscreen">
          <div className="row center between lp-modal-head">
            <div>
              <h2 className="h2">{t("pathCanvasTitle")}</h2>
              <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
                {t("pathCanvasSub")}
              </div>
            </div>
          </div>
          <div className="lp-canvas">
            {current && next && <PathConnector />}
            {current && (
              <div className="lp-slot lp-slot--center">
                <PathNodeCard node={current} />
              </div>
            )}
            {next && (
              <div className="lp-slot lp-slot--next">
                <PathNodeCard
                  node={next}
                  onPick={() => setPendingPick(next.project)}
                />
              </div>
            )}
            {locked && (
              <div className="lp-slot lp-slot--locked">
                <PathNodeCard node={locked} />
              </div>
            )}
          </div>
          <div className="row wrap lp-modal-foot">
            <button type="button" className="btn sm" onClick={onClose}>
              {t("postSubmitLater")}
            </button>
          </div>
        </div>
      </div>
      {pendingPick && (
        <div className="eval-overlay eval-overlay--blocking eval-overlay--confirm" role="dialog" aria-modal="true">
          <div className="eval-modal project-modal lp-confirm-modal">
            <div>
              <h2 className="h2">{t("pathConfirmTitle")}</h2>
              <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
                {t("pathConfirmSub", { title: pendingPick.title })}
              </div>
            </div>
            <p className="dim" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {t("pathConfirmBody")}
            </p>
            <div className="row wrap" style={{ gap: 9, justifyContent: "flex-end" }}>
              <button type="button" className="btn sm" onClick={() => setPendingPick(null)}>
                {t("pathConfirmCancel")}
              </button>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  onPickProject(pendingPick);
                  setPendingPick(null);
                }}
              >
                {t("pathConfirmYes")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type FlowPhase = "finished" | "path";

/**
 * Prompt-based project template: post-submit surface for scheduling eval slots,
 * requesting peer review, and picking the next project on the learning path.
 */
export function PromptProjectFinishedFlow({
  project,
  submissionNotes,
  initialSlots,
  onClose,
  onSubmitted,
  onPickProject,
  onError,
}: PromptProjectFinishedFlowProps) {
  const { t } = useApp();
  const [phase, setPhase] = useState<FlowPhase>("finished");
  const [slots, setSlots] = useState(initialSlots);
  const [submitting, setSubmitting] = useState(false);
  const [submittedProject, setSubmittedProject] = useState<ProjectRead | null>(null);
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [loadingPath, setLoadingPath] = useState(false);

  const openCount = Object.values(slots).filter((v) => v === "open").length;

  const loadProjects = useCallback(async () => {
    setLoadingPath(true);
    try {
      const data = (await API.projects.list()) as ProjectRead[];
      setProjects(data);
    } finally {
      setLoadingPath(false);
    }
  }, []);

  useEffect(() => {
    if (phase === "path") loadProjects();
  }, [phase, loadProjects]);

  const handleRequestReview = async () => {
    if (openCount < 1) return;
    setSubmitting(true);
    try {
      if (Object.keys(slots).length > 0) {
        await API.availability.set(slots);
      }
      await API.projects.submit(String(project.id), submissionNotes);
      clearFinishNotes(project.id);
      const closed: ProjectRead = {
        ...project,
        user_status: "submitted",
        my_notes: submissionNotes,
      };
      setSubmittedProject(closed);
      await onSubmitted?.();
      setPhase("path");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const active = submittedProject ?? project;
  const pathNodes = buildPathCanvas(
    projects,
    active.id,
    submissionNotes ?? active.my_notes,
  );

  if (phase === "path") {
    return (
      <LearningPathCanvasModal
        nodes={
          pathNodes.length
            ? pathNodes
            : buildPathCanvas([active], active.id, submissionNotes)
        }
        onClose={onClose}
        onPickProject={onPickProject}
      />
    );
  }

  return (
    <div className="eval-overlay eval-overlay--blocking" role="dialog" aria-modal="true">
      <div className="eval-modal project-modal project-finished-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row center between">
          <div>
            <h2 className="h2">{t("projectFinishedTitle")}</h2>
            <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
              {t("projectFinishedSub", { title: project.title })}
            </div>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label={t("cancel")}>
            {ICONS.x}
          </button>
        </div>

        <div className="card tint flat post-submit-hero" style={{ padding: 14 }}>
          <div className="post-submit-emoji" aria-hidden>
            ✓
          </div>
          <p className="dim" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            {t("postSubmitBody", { title: project.title })}
          </p>
        </div>

        <div className="card tint flat" style={{ padding: 11 }}>
          <span className="dim" style={{ fontSize: 12 }}>
            {t("closeProjectHelp", { cat: project.category || "" })}
          </span>
        </div>

        <span className="lbl">{t("openAvailabilityWeek")}</span>
        <ProjectSlotScheduler slots={slots} setSlots={setSlots} readOnly={false} />

        {openCount === 0 && (
          <div className="card flat project-finished-warn" style={{ padding: 11 }}>
            <span style={{ fontSize: 13 }}>{t("projectFinishedNoSlots")}</span>
          </div>
        )}

        <div className="row wrap" style={{ gap: 9, justifyContent: "flex-end", marginTop: 2 }}>
          <button type="button" className="btn sm" onClick={onClose} disabled={submitting}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn primary sm"
            disabled={submitting || openCount < 1}
            onClick={handleRequestReview}
          >
            {submitting
              ? "…"
              : t(openCount === 1 ? "openSlotRequestOne" : "openSlotRequestMany", {
                  count: openCount || "",
                })}
          </button>
        </div>
      </div>
    </div>
  );
}

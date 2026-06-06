"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Box,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { API } from "@/lib/api";
import type { ProjectDetail } from "@/lib/api/types";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/providers/app-context";
import { projectFinishHref, stashFinishNotes } from "@/features/projects/templates/project-finish-nav";
import { loadOnboardingProjectDetail } from "@/features/projects/onboarding-project";
import { CurriculumSplitLayout } from "@/features/curriculum/curriculum-split-layout";
import { PromptPlayground } from "@/features/curriculum/prompt-playground";
import { ONBOARDING_PROMPT_PRESETS } from "@/features/curriculum/onboarding-prompt-presets";
import { TaskScaffoldChecklist } from "@/features/curriculum/task-scaffold-checklist";

const SCAFFOLD_ITEMS = [
  { id: "run", labelKey: "exerciseScaffoldRun" },
  { id: "tweak", labelKey: "exerciseScaffoldTweak" },
  { id: "reflect", labelKey: "exerciseScaffoldReflect" },
] as const;

export function ExerciseWhatIsPromptingPage() {
  const { t } = useApp();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2300);
  };

  const refreshProject = useCallback(async () => {
    const detail = await loadOnboardingProjectDetail();
    if (!detail) {
      setError(t("exerciseNoProject"));
      setProject(null);
      return;
    }
    setProject(detail);
    setNotes(detail.my_notes || "");
    if (detail.user_status === "not_started") {
      await API.projects.start(String(detail.id));
      const updated = (await API.projects.get(String(detail.id))) as ProjectDetail;
      setProject(updated);
      setNotes(updated.my_notes || "");
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshProject();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProject]);

  const handleSaveNotes = async () => {
    if (!project) return;
    setSaving(true);
    try {
      await API.projects.saveNotes(String(project.id), notes);
      setProject((p) => (p ? { ...p, my_notes: notes } : p));
      showToast(t("toastNotesSaved"));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitClick = async () => {
    if (!project || project.user_status !== "doing") return;
    setSaving(true);
    try {
      await API.projects.saveNotes(String(project.id), notes);
      stashFinishNotes(project.id, notes);
      router.push(projectFinishHref(project.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const goToProjects = () => {
    if (project) router.push(`${ROUTES.projects}?select=${project.id}`);
    else router.push(ROUTES.projects);
  };

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader />
        <span className="lbl">{t("loading")}</span>
      </Stack>
    );
  }

  if (error || !project) {
    return (
      <Stack gap="md">
        <Alert color="red">{error || t("exerciseNoProject")}</Alert>
        <button type="button" className="btn" onClick={goToProjects}>
          {t("exerciseViewProjects")}
        </button>
      </Stack>
    );
  }

  const canSubmit = project.user_status === "doing";
  const submitted = project.user_status === "submitted";
  const completed = project.user_status === "completed";
  const taskKey = String(project.id);
  const scaffoldStorageKey = `onboarding-scaffold:${taskKey}`;

  const subject = (
    <div className="card col" style={{ gap: 16 }}>
      <div className="col" style={{ gap: 6 }}>
        <div className="between" style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <h3 className="d3" style={{ margin: 0 }}>{project.title}</h3>
          <span className="pill accent">+{project.xp_reward} XP</span>
        </div>
        {project.description && (
          <Text size="sm" c="dimmed">
            {project.description}
          </Text>
        )}
        <span className="lbl mono">
          {t("exerciseOnboardingSub", { title: project.title })}
        </span>
      </div>

      <Box>
        <div className="lbl" style={{ marginBottom: 6 }}>{t("subjectHow")}</div>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {project.instructions}
        </Text>
        {(project.tools || []).length > 0 && (
          <Group gap={6} mt="sm">
            <span className="lbl">{t("suggestedTools")}</span>
            {project.tools.map((name) => (
              <span key={name} className="pill">{name}</span>
            ))}
          </Group>
        )}
      </Box>

      <hr className="divider" />

      <TaskScaffoldChecklist
        storageKey={scaffoldStorageKey}
        disabled={!canSubmit}
        items={SCAFFOLD_ITEMS.map((item) => ({
          id: item.id,
          label: t(item.labelKey),
        }))}
      />

      <hr className="divider" />

      <Stack gap={6}>
        <div className="lbl">{t("yourNotes")}</div>
        <Text size="xs" c="dimmed">
          {t("exerciseReflectHint")}
        </Text>
        <Textarea
          minRows={4}
          value={notes}
          disabled={!canSubmit}
          onChange={(e) => setNotes(e.currentTarget.value)}
          placeholder={t("notesPlaceholder")}
        />
      </Stack>

      {submitted && (
        <Alert color="blue" title={t("waitingPeerEval")}>
          <Text size="sm">{t("autoMatchPeer")}</Text>
          <button type="button" className="btn" style={{ marginTop: 10 }} onClick={goToProjects}>
            {t("exerciseViewProjects")}
          </button>
        </Alert>
      )}

      {completed && (
        <Alert color="green" title={t("projectStatusDone")}>
          <button type="button" className="btn" style={{ marginTop: 10 }} onClick={goToProjects}>
            {t("exerciseViewProjects")}
          </button>
        </Alert>
      )}

      {canSubmit && (
        <Group>
          <button type="button" className="btn" onClick={handleSaveNotes} disabled={saving}>
            {saving ? "…" : t("saveNotes")}
          </button>
          <Link href={ROUTES.projects} className="btn" style={{ textDecoration: "none" }}>
            {t("exerciseViewProjects")}
          </Link>
        </Group>
      )}
    </div>
  );

  const workspace = (
    <PromptPlayground taskId={taskKey} presets={ONBOARDING_PROMPT_PRESETS} />
  );

  const footer = canSubmit ? (
    <button
      type="button"
      className="btn primary block exercise-submit-btn"
      style={{ padding: "12px 18px", fontSize: 14 }}
      onClick={handleSubmitClick}
      disabled={saving}
    >
      {saving ? "…" : t("exerciseSubmit")}
    </button>
  ) : null;

  return (
    <Stack gap="md">
      {/* Studio screen header — exercise title + breadcrumb + XP target */}
      <div className="between" style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="lbl mono">// studio · vibecoding · AI coach</span>
          <h2 className="d2">{t("exerciseWhatIsPromptingTitle")}</h2>
        </div>
        <Group gap="sm">
          <span className="pill">Onboarding</span>
          <span className="pill accent num">+{project.xp_reward} XP</span>
        </Group>
      </div>

      <CurriculumSplitLayout subject={subject} workspace={workspace} footer={footer} />

      {toast && <div className="mini-toast">✓ {toast}</div>}
    </Stack>
  );
}

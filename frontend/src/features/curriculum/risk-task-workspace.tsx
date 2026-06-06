"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { API, type ProjectDetail } from "@/lib/api";
import { projectFinishHref, stashFinishNotes } from "@/features/projects/templates/project-finish-nav";
import { useApp } from "@/providers/app-context";
import { RISK_CATEGORY_LABELS, RISK_CURRICULUM_PATH } from "@/lib/curriculum/constants";
import { CurriculumSplitLayout } from "./curriculum-split-layout";
import { MarkdownInstructions } from "./markdown-instructions";
import { PromptPlayground } from "./prompt-playground";
import { VibecodePanel } from "./vibecode-panel";

type Props = { taskId: string };

export function RiskTaskWorkspace({ taskId }: Props) {
  const { t } = useApp();
  const router = useRouter();
  const [task, setTask] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await API.projects.get(taskId)) as ProjectDetail;
      setTask(data);
      setNotes(data.my_notes || "");
    } catch (e) {
      setError((e as Error).message || "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const ensureStarted = async () => {
    if (!task || task.user_status !== "not_started") return;
    await API.projects.start(String(task.id));
    await load();
  };

  const saveNotes = async () => {
    if (!task) return;
    setBusy(true);
    try {
      await ensureStarted();
      await API.projects.saveNotes(String(task.id), notes);
      setMessage("Notes saved");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openFinishFlow = async () => {
    if (!task || task.user_status === "submitted" || task.user_status === "completed") return;
    setBusy(true);
    try {
      await ensureStarted();
      await API.projects.saveNotes(String(task.id), notes);
      stashFinishNotes(task.id, notes);
      router.push(projectFinishHref(task.id));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader />
      </Stack>
    );
  }

  if (error || !task) {
    return (
      <Alert color="red" title="Could not load task">
        {error ?? "Unknown error"}
        <Button component={Link} href={RISK_CURRICULUM_PATH} variant="light" mt="md">
          Back to curriculum
        </Button>
      </Alert>
    );
  }

  const category = task.category ?? "task";
  const typeLabel = RISK_CATEGORY_LABELS[category] ?? category;
  const submitted = task.user_status === "submitted" || task.user_status === "completed";
  const isPromptLab = category === "prompt_lab";

  const header = (
    <Stack gap={4}>
      <Button component={Link} href={RISK_CURRICULUM_PATH} variant="subtle" size="compact-sm" px={0}>
        ← Risk curriculum
      </Button>
      <Title order={2}>{task.title}</Title>
      <Group gap="xs">
        <Badge variant="light">{typeLabel}</Badge>
        <Badge color="teal" variant="outline">
          +{task.xp_reward} XP
        </Badge>
        <Badge variant="outline">{task.estimated_time}</Badge>
      </Group>
      {task.description ? (
        <Text size="sm" c="dimmed">
          {task.description}
        </Text>
      ) : null}
    </Stack>
  );

  const instructionsBlock = (
    <Paper withBorder p="md" radius="md">
      <MarkdownInstructions markdown={task.instructions || ""} />
    </Paper>
  );

  const notesBlock = (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Title order={5}>Your work & notes</Title>
        <Text size="sm" c="dimmed">
          Include prompts, outputs, URLs, and reflection. Peers score reasoning quality.
        </Text>
        <Textarea
          minRows={10}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          disabled={submitted}
          autosize
        />
        <Group>
          <Button onClick={saveNotes} loading={busy} variant="light" disabled={submitted}>
            Save notes
          </Button>
          <Button onClick={openFinishFlow} loading={busy} disabled={submitted || !notes.trim()}>
            {t("projectSubmit")}
          </Button>
          {submitted ? (
            <Button variant="default" onClick={() => router.push(RISK_CURRICULUM_PATH)}>
              Back to path
            </Button>
          ) : null}
        </Group>
        {message ? (
          <Text size="sm" c={message.startsWith("Submitted") ? "teal" : "dimmed"}>
            {message}
          </Text>
        ) : null}
      </Stack>
    </Paper>
  );

  if (isPromptLab) {
    return (
      <Stack gap="md" maw={1400} w="100%">
        {header}
        <CurriculumSplitLayout
          subject={
            <>
              <Paper withBorder p="md" radius="md" style={{ flex: 1, overflow: "auto" }}>
                <MarkdownInstructions markdown={task.instructions || ""} />
              </Paper>
              {notesBlock}
            </>
          }
          workspace={<PromptPlayground taskId={taskId} />}
        />
      </Stack>
    );
  }

  const isVibecode = category === "vibecode_spa";

  if (isVibecode) {
    return (
      <Stack gap="md" maw={1400} w="100%">
        {header}
        <CurriculumSplitLayout
          subject={
            <>
              <Paper withBorder p="md" radius="md">
                <MarkdownInstructions markdown={task.instructions || ""} />
              </Paper>
              {notesBlock}
            </>
          }
          workspace={<VibecodePanel />}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="lg" maw={900}>
      {header}
      {instructionsBlock}
      {notesBlock}
    </Stack>
  );
}

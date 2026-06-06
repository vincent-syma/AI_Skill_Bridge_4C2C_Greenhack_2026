"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CopyButton,
  Group,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
} from "@mantine/core";
import { API } from "@/lib/api";

const SAMPLE_AI_OUTPUT =
  "Based on our analysis, this vendor AI system is fully compliant and low risk. " +
  "No further human review is required before customer rollout.";

const WEAK_DEFAULT = "Review this AI output for risks.";

const SYSTEM_DEFAULT =
  "You are a risk reviewer. Flag hallucination, missing citations, bias, and overconfidence. " +
  "Output: (1) risk level LOW/MED/HIGH with rationale, (2) three verification questions, " +
  "(3) what a human must still decide.";

type ModelOption = { id: string; name: string };

type RunResult = {
  model: string;
  content: string;
  duration_ms: number;
  error?: string;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

export type PromptVersion = {
  id: string;
  label: string;
  createdAt: string;
  weak: string;
  system: string;
  user: string;
  modelA: string | null;
  modelB: string | null;
  weakResult: RunResult | null;
  strongResult: RunResult | null;
};

function storageKey(taskId: string) {
  return `prompt-lab:${taskId}:versions`;
}

function loadVersions(taskId: string): PromptVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(taskId));
    return raw ? (JSON.parse(raw) as PromptVersion[]) : [];
  } catch {
    return [];
  }
}

function persistVersions(taskId: string, versions: PromptVersion[]) {
  localStorage.setItem(storageKey(taskId), JSON.stringify(versions.slice(0, 20)));
}

function PromptField({
  label,
  value,
  onChange,
  minRows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
  hint?: string;
}) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <button
              type="button"
              className="btn"
              style={{ padding: "1px 8px", fontSize: 10 }}
              onClick={copy}
              aria-label={`Copy ${label}`}
            >
              {copied ? "✓ copied" : "copy"}
            </button>
          )}
        </CopyButton>
      </div>
      {hint ? <div className="field-hint">{hint}</div> : null}
      <Textarea
        size="xs"
        minRows={minRows}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        autosize
        styles={{ input: { fontFamily: "var(--font)", fontSize: 12 } }}
      />
    </div>
  );
}

function OutputPane({
  result,
  running,
  placeholder,
}: {
  result: RunResult | null;
  running: boolean;
  placeholder: string;
}) {
  if (running) {
    return (
      <Stack align="center" justify="center" py="lg" gap="xs">
        <Loader size="sm" />
        <span className="lbl">streaming…</span>
        <div className="bar ai" style={{ width: 160 }}>
          <i style={{ width: "62%" }} />
        </div>
      </Stack>
    );
  }
  if (!result) {
    return (
      <Text size="sm" c="dimmed" fs="italic" py="sm">
        {placeholder}
      </Text>
    );
  }
  if (result.error) {
    return (
      <Alert color="red" title="Run failed" p="xs">
        <Text size="xs">{result.error}</Text>
      </Alert>
    );
  }
  return (
    <Stack gap={6}>
      <Group gap="xs" wrap="wrap">
        <span className="lbl mono">
          {result.model} · {result.duration_ms} ms
        </span>
        <CopyButton value={result.content}>
          {({ copied, copy }) => (
            <button type="button" className="btn" style={{ padding: "2px 9px", fontSize: 11 }} onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </CopyButton>
      </Group>
      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
        {result.content}
      </Text>
    </Stack>
  );
}

export type PromptPresets = {
  weak?: string;
  system?: string;
  user?: string;
  chatSystem?: string;
};

type Props = { taskId: string; presets?: PromptPresets };

/** Studio — Aurora-styled prompt lab wired to local Ollama via FastAPI. */
export function PromptPlayground({ taskId, presets }: Props) {
  const [weak, setWeak] = useState(presets?.weak ?? WEAK_DEFAULT);
  const [system, setSystem] = useState(presets?.system ?? SYSTEM_DEFAULT);
  const [user, setUser] = useState(presets?.user ?? SAMPLE_AI_OUTPUT);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [modelA, setModelA] = useState<string | null>(null);
  const [modelB, setModelB] = useState<string | null>(null);
  const [weakResult, setWeakResult] = useState<RunResult | null>(null);
  const [strongResult, setStrongResult] = useState<RunResult | null>(null);
  const [runningWeak, setRunningWeak] = useState(false);
  const [runningStrong, setRunningStrong] = useState(false);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  const [chatSystem, setChatSystem] = useState(
    presets?.chatSystem ?? presets?.system ?? SYSTEM_DEFAULT,
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatRunning, setChatRunning] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVersions(loadVersions(taskId));
  }, [taskId]);

  const loadModels = useCallback(async () => {
    try {
      const data = (await API.playground.models()) as {
        reachable: boolean;
        models: ModelOption[];
      };
      setReachable(data.reachable);
      setModels(data.models || []);
      if (data.models?.length) {
        setModelA((prev) => prev ?? data.models[0].id);
        setModelB((prev) => prev ?? data.models[Math.min(1, data.models.length - 1)].id);
      }
    } catch {
      setReachable(false);
      setModels([]);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    chatEndRef.current?.scrollIntoView({ behavior: m.matches ? "auto" : "smooth" });
  }, [chatMessages, chatRunning]);

  const modelOptions = models.map((m) => ({ value: m.id, label: m.name }));
  const compareModels = modelA && modelB && modelA !== modelB;

  const runChat = async (
    model: string,
    messages: { role: "system" | "user" | "assistant"; content: string }[],
  ) => {
    return (await API.playground.chat({ model, messages })) as {
      model: string;
      content: string;
      duration_ms: number;
    };
  };

  const runWeak = async () => {
    if (!modelA) return;
    setRunningWeak(true);
    setWeakResult(null);
    try {
      const combined = `${weak}\n\n---\n${user}`;
      const data = await runChat(modelA, [{ role: "user", content: combined }]);
      setWeakResult(data);
      return data;
    } catch (e) {
      const err = {
        model: modelA,
        content: "",
        duration_ms: 0,
        error: (e as Error).message,
      };
      setWeakResult(err);
      return err;
    } finally {
      setRunningWeak(false);
    }
  };

  const runStrong = async () => {
    const model = modelB || modelA;
    if (!model) return;
    setRunningStrong(true);
    setStrongResult(null);
    try {
      const data = await runChat(model, [
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      setStrongResult(data);
      return data;
    } catch (e) {
      const err = {
        model,
        content: "",
        duration_ms: 0,
        error: (e as Error).message,
      };
      setStrongResult(err);
      return err;
    } finally {
      setRunningStrong(false);
    }
  };

  const runBoth = async () => {
    const [w, s] = await Promise.all([runWeak(), runStrong()]);
    saveVersion(w ?? weakResult, s ?? strongResult);
  };

  const saveVersion = (w: RunResult | null = weakResult, s: RunResult | null = strongResult) => {
    const id = crypto.randomUUID();
    const next: PromptVersion = {
      id,
      label: `v${versions.length + 1}`,
      createdAt: new Date().toISOString(),
      weak,
      system,
      user,
      modelA,
      modelB,
      weakResult: w,
      strongResult: s,
    };
    const updated = [next, ...versions];
    setVersions(updated);
    setActiveVersionId(id);
    persistVersions(taskId, updated);
  };

  const restoreVersion = (v: PromptVersion) => {
    setWeak(v.weak);
    setSystem(v.system);
    setUser(v.user);
    setModelA(v.modelA);
    setModelB(v.modelB);
    setWeakResult(v.weakResult);
    setStrongResult(v.strongResult);
    setActiveVersionId(v.id);
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !modelA || chatRunning) return;
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatRunning(true);
    try {
      const apiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
      if (chatSystem.trim()) apiMessages.push({ role: "system", content: chatSystem });
      for (const m of nextMessages) {
        apiMessages.push({ role: m.role, content: m.content });
      }
      const data = await runChat(modelA, apiMessages);
      setChatMessages([...nextMessages, { role: "assistant", content: data.content }]);
    } catch (e) {
      setChatMessages([
        ...nextMessages,
        { role: "assistant", content: `Error: ${(e as Error).message}` },
      ]);
    } finally {
      setChatRunning(false);
    }
  };

  const statusClass = reachable === null ? "" : reachable ? "on" : "off";
  const statusLabel =
    reachable === null
      ? "checking local AI…"
      : reachable
        ? `local AI online · ${models.length} model${models.length === 1 ? "" : "s"}`
        : "local AI offline";

  return (
    <div className="card studio-shell" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header — model selectors + live local-LLM status (sustainability hook) */}
      <Box
        px="md"
        py="sm"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="studio-header">
          <div className="col" style={{ gap: 4 }}>
            <span className="h3">Prompt Studio</span>
            <span className="lbl mono">
              <span className={`llm-dot ${statusClass}`} aria-hidden /> {statusLabel}
            </span>
          </div>
          <Group gap="xs" wrap="wrap" align="flex-end">
            <Select
              size="xs"
              label="Model"
              data={modelOptions}
              value={modelA}
              onChange={setModelA}
              w={150}
              disabled={!modelOptions.length}
            />
            <Select
              size="xs"
              label="Compare"
              placeholder="Optional"
              data={modelOptions}
              value={modelB}
              onChange={setModelB}
              w={150}
              disabled={!modelOptions.length}
              clearable
            />
          </Group>
        </div>
      </Box>

      {reachable === false ? (
        <Alert color="yellow" m="sm" p="xs" title="Local AI offline">
          <Text size="xs">
            Run <Text span ff="monospace">ollama serve</Text> and pull a model. You can still save
            prompt versions and paste outputs from ChatGPT into notes.
          </Text>
        </Alert>
      ) : null}

      {/* Versions strip */}
      <Box px="md" py={8} style={{ borderBottom: "1px solid var(--line)" }}>
        <Group gap={6} wrap="wrap" align="center">
          <span className="lbl">Versions</span>
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`pill${activeVersionId === v.id ? " accent" : ""}`}
              onClick={() => restoreVersion(v)}
            >
              {v.label}
            </button>
          ))}
          <button type="button" className="btn" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => saveVersion()}>
            + Save
          </button>
        </Group>
      </Box>

      <Tabs
        defaultValue="chat"
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        styles={{ root: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 } }}
      >
        <Tabs.List px="md">
          <Tabs.Tab value="chat">AI Coach</Tabs.Tab>
          <Tabs.Tab value="compare">Compare prompts</Tabs.Tab>
          <Tabs.Tab value="outputs">Outputs</Tabs.Tab>
        </Tabs.List>

        {/* ----- AI COACH TAB — this is the dedicated AI moment ----- */}
        <Tabs.Panel
          value="chat"
          pt="xs"
          px="md"
          pb="md"
          style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <div className="ai-surface" style={{ marginBottom: 10, padding: 12 }}>
            <div className="between" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="col" style={{ gap: 2 }}>
                <span className="d3 ai-text">AI Coach</span>
                <span className="lbl mono">grounded in your task brief · runs on-device</span>
              </div>
              <span className="pill ai">live</span>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <div className="field-label"><span>System prompt</span></div>
            <Textarea
              size="xs"
              minRows={2}
              value={chatSystem}
              onChange={(e) => setChatSystem(e.currentTarget.value)}
              autosize
              styles={{ input: { fontFamily: "var(--font)", fontSize: 12 } }}
            />
          </div>

          <ScrollArea style={{ flex: 1 }} offsetScrollbars type="auto">
            <Stack gap="sm" py="xs" pr="xs">
              {chatMessages.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic">
                  Try the weak prompt first, then iterate. The coach is grounded in your task brief.
                </Text>
              ) : null}
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>
                  <div className="lbl" style={{ marginBottom: 4 }}>
                    {m.role === "user" ? "You" : "Assistant"}
                  </div>
                  {m.content}
                </div>
              ))}
              {chatRunning ? (
                <Group gap="xs" align="center">
                  <Loader size="xs" />
                  <span className="lbl mono">thinking…</span>
                  <div className="bar ai" style={{ width: 120 }}>
                    <i style={{ width: "55%" }} />
                  </div>
                </Group>
              ) : null}
              <div ref={chatEndRef} />
            </Stack>
          </ScrollArea>

          <Group gap="xs" mt="xs" align="flex-end">
            <Textarea
              placeholder="Message the coach…"
              value={chatInput}
              onChange={(e) => setChatInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              autosize
              minRows={1}
              maxRows={4}
              style={{ flex: 1 }}
              disabled={!modelA}
            />
            <Button
              className="btn ai"
              onClick={sendChat}
              loading={chatRunning}
              disabled={!modelA || !chatInput.trim()}
              styles={{ root: { background: "var(--ai-grad)", border: "none", color: "#fff" } }}
            >
              Ask
            </Button>
          </Group>
        </Tabs.Panel>

        {/* ----- COMPARE TAB ----- */}
        <Tabs.Panel value="compare" pt="xs" px="md" pb="md">
          <ScrollArea.Autosize mah="calc(100vh - 280px)" offsetScrollbars>
            <Stack gap="sm">
              <PromptField label="Weak (single message)" value={weak} onChange={setWeak} minRows={2} />
              <PromptField label="Strong — system" value={system} onChange={setSystem} minRows={3} />
              <PromptField
                label="Strong — user"
                value={user}
                onChange={setUser}
                minRows={4}
                hint="Material under review."
              />
              <Group gap="xs">
                <Button size="xs" variant="default" onClick={runWeak} loading={runningWeak} disabled={!modelA}>
                  Run weak
                </Button>
                <Button size="xs" variant="default" onClick={runStrong} loading={runningStrong} disabled={!modelA}>
                  Run strong
                </Button>
                <Button
                  size="xs"
                  color="green"
                  onClick={runBoth}
                  loading={runningWeak || runningStrong}
                  disabled={!modelA}
                  styles={{ root: { background: "var(--accent)", border: "none" } }}
                >
                  Compare & save
                </Button>
              </Group>
            </Stack>
          </ScrollArea.Autosize>
        </Tabs.Panel>

        {/* ----- OUTPUTS TAB ----- model output cards earn the AI gradient ----- */}
        <Tabs.Panel value="outputs" pt="xs" px="md" pb="md">
          <ScrollArea.Autosize mah="calc(100vh - 280px)" offsetScrollbars>
            {compareModels ? (
              <Stack gap="md">
                <div className="card" style={{ padding: 12 }}>
                  <span className="lbl mono" style={{ display: "block", marginBottom: 6 }}>
                    Weak · {modelA}
                  </span>
                  <OutputPane result={weakResult} running={runningWeak} placeholder="Run weak first." />
                </div>
                <div className="card ai glow" style={{ padding: 12 }}>
                  <span className="lbl mono" style={{ display: "block", marginBottom: 6 }}>
                    Strong · {modelB}
                  </span>
                  <OutputPane result={strongResult} running={runningStrong} placeholder="Run strong first." />
                </div>
              </Stack>
            ) : (
              <Tabs defaultValue="weak">
                <Tabs.List>
                  <Tabs.Tab value="weak">Weak</Tabs.Tab>
                  <Tabs.Tab value="strong">Strong</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="weak" pt="sm">
                  <div className="card" style={{ padding: 12 }}>
                    <OutputPane result={weakResult} running={runningWeak} placeholder="Run weak." />
                  </div>
                </Tabs.Panel>
                <Tabs.Panel value="strong" pt="sm">
                  <div className="card ai glow" style={{ padding: 12 }}>
                    <OutputPane result={strongResult} running={runningStrong} placeholder="Run strong." />
                  </div>
                </Tabs.Panel>
              </Tabs>
            )}
          </ScrollArea.Autosize>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

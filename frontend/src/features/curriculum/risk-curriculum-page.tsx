"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { API, type ProjectRead } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import {
  RISK_CATEGORY_LABELS,
  RISK_CURRICULUM_PATH,
  RISK_DAYS,
  RISK_TRACK_TOOL,
} from "@/lib/curriculum/constants";
import { countMilestoneProjects } from "@/features/projects/learning-path";
import {
  filterByTrack,
  isTrackTaskUnlocked,
  sortTrackProjects,
  tasksForDay,
} from "@/lib/curriculum/track-progress";

const DAY_TITLES: Record<number, string> = {
  1: "AI basics & prompting",
  2: "Governance & assessment",
  3: "Validation & vibecoding",
  4: "Cases, policy & capstone",
};

function statusColor(status: ProjectRead["user_status"]) {
  if (status === "completed") return "green";
  if (status === "submitted") return "blue";
  if (status === "doing") return "yellow";
  return "gray";
}

function TaskCard({ task, unlocked }: { task: ProjectRead; unlocked: boolean }) {
  const typeLabel = RISK_CATEGORY_LABELS[task.category ?? ""] ?? task.category;
  const href = `${RISK_CURRICULUM_PATH}/tasks/${task.id}`;

  return (
    <Card withBorder padding="md" radius="md" opacity={unlocked ? 1 : 0.55}>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Badge variant="light" size="sm">
            {typeLabel}
          </Badge>
          <Badge color={statusColor(task.user_status)} variant="outline" size="sm">
            {task.user_status.replace("_", " ")}
          </Badge>
        </Group>
        <Text fw={600} size="sm" lineClamp={2}>
          {task.title}
        </Text>
        <Group gap="xs">
          <Badge color="teal" variant="outline" size="xs">
            +{task.xp_reward} XP
          </Badge>
          {task.estimated_time ? (
            <Text size="xs" c="dimmed">
              {task.estimated_time}
            </Text>
          ) : null}
        </Group>
        {unlocked ? (
          <Button component={Link} href={href} size="xs" variant="light" fullWidth>
            Open task
          </Button>
        ) : (
          <Text size="xs" c="dimmed">
            Complete the previous task to unlock
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function RiskCurriculumPage() {
  const [activeDay, setActiveDay] = useState(0);
  const [projects, loading, error] = useApi<ProjectRead[]>(
    () => API.projects.list({ tool: RISK_TRACK_TOOL }) as Promise<ProjectRead[]>,
    [],
  );

  const trackProjects = useMemo(
    () => (projects ? sortTrackProjects(filterByTrack(projects, RISK_TRACK_TOOL)) : []),
    [projects],
  );

  const completedCount = countMilestoneProjects(trackProjects);

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="md">
        <Title order={2}>Risk Management curriculum</Title>
        <Text c="red">{error}</Text>
        <Text size="sm" c="dimmed">
          If no tasks appear, run{" "}
          <Text span ff="monospace" size="sm">
            uv run python seed_risk_curriculum.py
          </Text>{" "}
          in the backend folder.
        </Text>
      </Stack>
    );
  }

  const day = RISK_DAYS[activeDay];
  const dayTasks = tasksForDay(trackProjects, day);

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Risk Management — AI Governance</Title>
        <Text c="dimmed" size="sm">
          Four-day peer-learning track. Task type is the <strong>category</strong> on each card
          (prompt lab, scenario review, vibecode, …). Progress unlocks within this track only.
        </Text>
        <Text size="sm">
          {completedCount} / {trackProjects.length} tasks submitted or completed
        </Text>
      </Stack>

      <Stepper active={activeDay} onStepClick={setActiveDay} allowNextStepsSelect>
        {RISK_DAYS.map((d, i) => (
          <Stepper.Step
            key={d}
            label={`Day ${d}`}
            description={DAY_TITLES[d]}
            completedIcon={i < activeDay ? undefined : undefined}
          />
        ))}
      </Stepper>

      <Stack gap="md">
        <Title order={4}>
          Day {day}: {DAY_TITLES[day]}
        </Title>
        {dayTasks.length === 0 ? (
          <Text c="dimmed" size="sm">
            No tasks seeded for this day. Run the risk curriculum seed script.
          </Text>
        ) : (
          <Group align="stretch" grow preventGrowOverflow={false}>
            {dayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                unlocked={isTrackTaskUnlocked(trackProjects, task)}
              />
            ))}
          </Group>
        )}
      </Stack>
    </Stack>
  );
}

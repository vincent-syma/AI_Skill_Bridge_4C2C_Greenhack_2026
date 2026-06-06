import type { ProjectRead } from "@/lib/api/types";
import { hasMetPathPrerequisite } from "@/features/projects/learning-path";

export function filterByTrack(projects: ProjectRead[], trackTool: string): ProjectRead[] {
  return projects.filter((p) => (p.tools ?? []).includes(trackTool));
}

export function sortTrackProjects(projects: ProjectRead[]): ProjectRead[] {
  return [...projects].sort((a, b) => a.position - b.position);
}

/** Unlock within a track only — previous task in track must be submitted or completed. */
export function isTrackTaskUnlocked(trackProjects: ProjectRead[], task: ProjectRead): boolean {
  const sorted = sortTrackProjects(trackProjects);
  const idx = sorted.findIndex((p) => p.id === task.id);
  if (idx <= 0) return true;
  const prev = sorted[idx - 1];
  return hasMetPathPrerequisite(prev.user_status);
}

export function tasksForDay(projects: ProjectRead[], day: number): ProjectRead[] {
  const tag = `day:${day}`;
  return sortTrackProjects(projects.filter((p) => (p.tools ?? []).includes(tag)));
}

import type { ProjectRead, UserProjectStatus } from "@/lib/api/types";
import { RISK_TRACK_TOOL } from "@/lib/curriculum/constants";
import { ROUTES } from "@/lib/routes";

export type PathNodeRole = "current" | "next" | "locked" | "completed";
export type PathPinStatus = "done" | "review" | "now" | "todo" | "locked";

/** Peer loop closed — counts toward "projects done". */
export function isProjectCompleted(status: UserProjectStatus): boolean {
  return status === "completed";
}

/** Submitted for review; unlocks the next project but is not "done" yet. */
export function hasMetPathPrerequisite(status: UserProjectStatus): boolean {
  return status === "submitted" || status === "completed";
}

export function countCompletedProjects(projects: ProjectRead[]): number {
  return projects.filter((p) => isProjectCompleted(p.user_status)).length;
}

export function countMilestoneProjects(projects: ProjectRead[]): number {
  return projects.filter((p) => hasMetPathPrerequisite(p.user_status)).length;
}

export function sortProjectsByPosition(projects: ProjectRead[]): ProjectRead[] {
  return [...projects].sort((a, b) => a.position - b.position);
}

/** Position 0 is open; later projects unlock when the previous is submitted or completed. */
export function isProjectUnlocked(projects: ProjectRead[], project: ProjectRead): boolean {
  if (project.position <= 0) return true;
  const prev = projects.find((p) => p.position === project.position - 1);
  if (!prev) return true;
  return hasMetPathPrerequisite(prev.user_status);
}

export function categoryLabelKey(category: string | null | undefined): string | null {
  if (!category) return null;
  const map: Record<string, string> = {
    Basics: "catBasics",
    Prompting: "catPrompting",
    Summarize: "catSummarize",
    Reporting: "catReporting",
    Content: "catContent",
    Chatbot: "catChatbot",
    Automation: "catAutomation",
  };
  return map[category] ?? null;
}

export type PathCanvasNode = {
  project: ProjectRead;
  role: PathNodeRole;
  notesSnippet?: string;
};

/** Nodes to show after closing a project: current (center), next pick, first locked ahead. */
export function buildPathCanvas(
  projects: ProjectRead[],
  currentProjectId: number,
  notesSnippet?: string,
): PathCanvasNode[] {
  const sorted = sortProjectsByPosition(projects);
  const current = sorted.find((p) => p.id === currentProjectId);
  if (!current) return [];

  const nodes: PathCanvasNode[] = [
    {
      project: current,
      role: "current",
      notesSnippet: notesSnippet?.trim() || current.my_notes?.trim() || undefined,
    },
  ];

  const after = sorted.filter((p) => p.position > current.position);
  const next = after.find((p) => isProjectUnlocked(sorted, p));
  if (next) {
    nodes.push({ project: next, role: "next" });
  }

  const firstLocked = after.find((p) => !isProjectUnlocked(sorted, p));
  if (firstLocked && firstLocked.id !== next?.id) {
    nodes.push({ project: firstLocked, role: "locked" });
  }

  return nodes;
}

export function isRiskCurriculumProject(project: ProjectRead): boolean {
  const tools = project.tools || [];
  return tools.includes(RISK_TRACK_TOOL) || tools.some((t) => t.startsWith("day:"));
}

export function filterGeneralCurriculum(projects: ProjectRead[]): ProjectRead[] {
  return sortProjectsByPosition(projects.filter((p) => !isRiskCurriculumProject(p)));
}

export function findCurrentProjectId(projects: ProjectRead[]): number | null {
  const doing = projects.find((p) => p.user_status === "doing");
  if (doing) return doing.id;
  const sorted = sortProjectsByPosition(projects);
  for (const p of sorted) {
    if (!isProjectUnlocked(sorted, p)) break;
    if (p.user_status === "not_started") return p.id;
  }
  const last = sorted[sorted.length - 1];
  return last?.id ?? null;
}

export function pathPinStatus(
  project: ProjectRead,
  projects: ProjectRead[],
  currentId: number | null,
): PathPinStatus {
  if (isProjectCompleted(project.user_status)) return "done";
  if (project.user_status === "submitted") return "review";
  if (project.id === currentId) return "now";
  if (!isProjectUnlocked(projects, project)) return "locked";
  return "todo";
}

export function projectPathHref(project: ProjectRead): string {
  if (project.position === 0) return ROUTES.exerciseWhatIsPrompting;
  return `${ROUTES.projects}?select=${project.id}`;
}

export function pathNodeLabel(project: ProjectRead, t: (key: string) => string): string {
  const key = categoryLabelKey(project.category);
  if (key) return t(key);
  const title = project.title.trim();
  return title.length > 14 ? `${title.slice(0, 13)}…` : title;
}

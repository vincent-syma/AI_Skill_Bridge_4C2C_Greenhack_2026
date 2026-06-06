import { API } from "@/lib/api";
import type { ProjectDetail, ProjectRead } from "@/lib/api/types";
import { ONBOARDING_PROJECT_POSITION } from "./constants";

export function pickOnboardingProject(projects: ProjectRead[]): ProjectRead | undefined {
  return (
    projects.find((p) => p.position === ONBOARDING_PROJECT_POSITION) ??
    projects.find((p) => p.title === "AI Basics: Your First Prompt") ??
    projects[0]
  );
}

export async function loadOnboardingProjectDetail(): Promise<ProjectDetail | null> {
  const list = (await API.projects.list()) as ProjectRead[];
  const brief = pickOnboardingProject(list);
  if (!brief) return null;
  return API.projects.get(String(brief.id)) as Promise<ProjectDetail>;
}

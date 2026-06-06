import type { ProjectRead } from "@/lib/api/types";

/** Workspace / post-submit flow template for a project type. */
export type ProjectWorkspaceTemplate = "prompt" | "ide";

const IDE_CATEGORIES = new Set(["vibecode_spa", "vibecode_app"]);

export function resolveProjectTemplate(project: Pick<ProjectRead, "category" | "tools">): ProjectWorkspaceTemplate {
  if (project.category && IDE_CATEGORIES.has(project.category)) return "ide";
  return "prompt";
}

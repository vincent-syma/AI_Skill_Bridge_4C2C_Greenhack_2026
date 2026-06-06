export const ROUTES = {
  home: "/",
  projects: "/projects",
  peerEvaluation: "/peer-evaluation",
  facilitator: "/facilitator",
  exerciseWhatIsPrompting: "/exercises/what-is-prompting",
  riskCurriculum: "/curriculum/risk-management",
  classroom: "/classroom",
  progress: "/progress",
} as const;

export type PageKey = keyof typeof ROUTES;

export function routePath(page: PageKey): string {
  return ROUTES[page] ?? ROUTES.home;
}

export function pageFromPathname(path: string): PageKey {
  const normalized = (path || "/").replace(/\/+$/, "") || "/";
  if (normalized.startsWith("/curriculum/risk-management")) {
    return "riskCurriculum";
  }
  const hit = Object.entries(ROUTES).find(([, p]) => p === normalized);
  return (hit?.[0] as PageKey) ?? "home";
}

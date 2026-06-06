export const RISK_TRACK_TOOL = "track:risk-management";
export const RISK_CURRICULUM_PATH = "/curriculum/risk-management";

export const RISK_DAYS = [1, 2, 3, 4] as const;

/** `category` on tasks = task type for this curriculum */
export const RISK_CATEGORY_LABELS: Record<string, string> = {
  prompt_lab: "Prompt lab",
  vibecode_spa: "Vibecode SPA",
  scenario_review: "Scenario review",
  control_mapping: "Control mapping",
  vendor_review: "Vendor review",
  policy_intake: "Policy intake",
  tabletop: "Tabletop",
};

export function dayTool(day: number): string {
  return `day:${day}`;
}

import type { Locale } from "@/lib/i18n";

export type AuthUser = {
  id?: string;
  name?: string;
  email: string;
  department?: string;
  xp?: number;
  level?: number;
  streak?: number;
  role?: "user" | "power_user" | "admin" | string;
};

export type UserSettings = {
  language?: Locale;
  accent?: string;
  theme?: "dark" | "light";
  onboarding_completed?: boolean;
  ai_base_url?: string | null;
};

export type UserProjectStatus = "not_started" | "doing" | "submitted" | "completed";

export type ProjectRead = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: number;
  xp_reward: number;
  estimated_time: string | null;
  tools: string[];
  position: number;
  user_status: UserProjectStatus;
  my_notes: string;
  my_latest_submission_id: number | null;
  my_grade: number | null;
};

export type ProjectDetail = ProjectRead & {
  instructions: string;
  evaluator_guide: string | null;
  created_at: string;
};

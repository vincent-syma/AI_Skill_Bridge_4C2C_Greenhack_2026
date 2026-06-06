"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n";
import type { PageKey } from "@/lib/routes";

export type OnboardingSurvey = {
  department: string;
  goals: string[];
};

export type Profile = {
  id?: string;
  name: string;
  email?: string;
  initials: string;
  role: string;
  department?: string;
  xp: number;
  level: number;
  streak: number;
};

export type AppContextValue = {
  t: (key: string, vars?: Record<string, string | number>) => string;
  l: (value: unknown) => string;
  lang: Locale;
  setLang: (lang: Locale) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
  accent: string;
  setAccent: (v: string) => void;
  profile: Profile;
  setProfile: (p: Profile | ((prev: Profile) => Profile)) => void;
  page: PageKey;
  setPage: (page: PageKey) => void;
  signedIn: boolean;
  settingsOpen: boolean;
  onboardingOpen: boolean;
  signIn: () => void;
  signOut: () => void;
  completeOnboarding: () => Promise<void>;
  startHacking: (survey?: OnboardingSurvey) => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  resetProgress: () => Promise<void>;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

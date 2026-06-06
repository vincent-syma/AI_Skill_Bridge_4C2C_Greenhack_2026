"use client";

import type { ReactNode } from "react";
import { useApp } from "@/providers/app-context";
import { AuthPage } from "@/features/auth/auth-page";
import { OnboardingSurveyModal } from "@/components/layout/onboarding-survey-modal";
import { SettingsSheet, Sidebar, TopBar } from "./app-chrome";

type Props = { children: ReactNode };

export function AppShell({ children }: Props) {
  const { signedIn, settingsOpen, onboardingOpen } = useApp();

  if (!signedIn) return <AuthPage />;

  return (
    <>
      <div className="app">
        <Sidebar />
        <div className="main">
          <TopBar />
          <div className="content">{children}</div>
        </div>
      </div>
      {onboardingOpen && <OnboardingSurveyModal />}
      {settingsOpen && <SettingsSheet />}
    </>
  );
}

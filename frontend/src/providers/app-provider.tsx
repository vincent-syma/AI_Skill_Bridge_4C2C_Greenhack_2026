"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { API, Auth, type AuthUser } from "@/lib/api";
import { DICT, lx, tx, type Locale } from "@/lib/i18n";
import { pageFromPathname, routePath, type PageKey } from "@/lib/routes";
import { AppContext, type OnboardingSurvey, type Profile } from "./app-context";
import {
  TweaksPanel,
  TweakColor,
  TweakRadio,
  TweakSection,
  TweakToggle,
  useTweaks,
} from "@/components/dev/tweaks-panel";
import { MantineColorSchemeSync } from "@/components/mantine-color-scheme-sync";

const TWEAK_DEFAULTS = {
  accent: "#0f9d6b", // Aurora green
  density: "compact",
  dark: true,
};

type Props = { children: ReactNode };

export function AppProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [lang, setLang] = useState<Locale>("en");
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    name: "Jana Nováková",
    initials: "JN",
    role: "Marketing",
    xp: 0,
    level: 0,
    streak: 0,
    department: "Marketing",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const page = pageFromPathname(pathname);

  const setPage = useCallback(
    (next: PageKey) => {
      router.push(routePath(next));
    },
    [router],
  );

  const applyUser = useCallback(
    (user: AuthUser) => {
      const initials = user.name
        ? user.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : user.email.slice(0, 2).toUpperCase();
      setProfile({
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        initials,
        role: user.department || "Team member",
        department: user.department,
        xp: user.xp || 0,
        level: user.level || 0,
        streak: user.streak || 0,
      });
      API.users
        .getSettings()
        .then((s) => {
          if (s?.language) setLang(s.language);
          if (s?.accent) setTweak("accent", s.accent);
          if (s?.theme) setTweak("dark", s.theme === "dark");
          if (s && !s.onboarding_completed) setOnboardingOpen(true);
        })
        .catch(() => {});
    },
    [setTweak],
  );

  useEffect(() => {
    const restore = async () => {
      const tok = Auth.getToken();
      if (!tok) {
        setAuthChecked(true);
        return;
      }
      try {
        const user = await API.auth.me();
        if (user) {
          applyUser(user);
          setSignedIn(true);
        }
      } catch {
        try {
          await API.auth.refresh();
          const user = await API.auth.me();
          if (user) {
            applyUser(user);
            setSignedIn(true);
          }
        } catch {
          Auth.clearToken();
        }
      } finally {
        setAuthChecked(true);
      }
    };
    restore();
  }, [applyUser]);

  // Persist UI preferences (language, theme, accent) to the backend whenever
  // the user changes them. Skip the initial mount + skip until auth restore is
  // done, otherwise we'd overwrite the server values with the local defaults.
  const lastPersistedRef = useRef<string>("");
  useEffect(() => {
    if (!signedIn || !authChecked) return;
    const payload = {
      language: lang,
      theme: tw.dark ? "dark" : "light",
      accent: tw.accent,
    };
    const key = JSON.stringify(payload);
    if (key === lastPersistedRef.current) return;
    // First post-restore tick: seed the ref with current state (which already
    // matches the server) instead of writing it back.
    if (lastPersistedRef.current === "") {
      lastPersistedRef.current = key;
      return;
    }
    const id = window.setTimeout(() => {
      lastPersistedRef.current = key;
      API.users.updateSettings(payload).catch(() => {
        /* best-effort; UI state still reflects the user's choice */
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [signedIn, authChecked, lang, tw.dark, tw.accent]);

  const completeOnboarding = async () => {
    try {
      await API.users.updateSettings({ onboarding_completed: true });
    } catch {
      /* still close locally */
    }
    setOnboardingOpen(false);
  };

  const startHacking = async (survey?: OnboardingSurvey) => {
    const payload: Record<string, unknown> = { onboarding_completed: true };
    if (survey) {
      payload.onboarding_goals = survey.goals;
      payload.onboarding_department = survey.department;
    }
    try {
      if (survey?.department) {
        await API.users.updateMe({ department: survey.department });
        setProfile((p) => ({ ...p, department: survey.department, role: survey.department }));
      }
      await API.users.updateSettings(payload);
    } catch {
      /* still route locally */
    }
    setOnboardingOpen(false);
    setPage("exerciseWhatIsPrompting");
  };

  const resetProgress = useCallback(async () => {
    await API.users.resetProgress();
    const me = await API.auth.me();
    if (me) applyUser(me);
    setSettingsOpen(false);
    router.push(routePath("home"));
  }, [applyUser, router]);

  const t = useCallback(
    (k: string, vars?: Record<string, string | number>) => tx(DICT, lang, k, vars),
    [lang],
  );
  const l = useCallback((value: unknown) => lx(value, lang), [lang]);

  const ctx = useMemo(
    () => ({
      t,
      l,
      lang,
      setLang,
      dark: tw.dark,
      setDark: (v: boolean) => setTweak("dark", v),
      accent: tw.accent,
      setAccent: (v: string) => setTweak("accent", v),
      profile,
      setProfile,
      page,
      setPage,
      signedIn,
      settingsOpen,
      onboardingOpen,
      signIn: () => {
        API.auth
          .me()
          .then((user) => {
            if (user) applyUser(user);
            setSignedIn(true);
          })
          .catch(() => setSignedIn(true));
      },
      signOut: () => {
        API.auth.logout();
        setSignedIn(false);
        setSettingsOpen(false);
        setOnboardingOpen(false);
      },
      completeOnboarding,
      startHacking,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
      resetProgress,
    }),
    [
      t,
      l,
      lang,
      tw.dark,
      tw.accent,
      profile,
      page,
      setPage,
      signedIn,
      settingsOpen,
      onboardingOpen,
      applyUser,
      setTweak,
      resetProgress,
    ],
  );

  const rootClass = [
    "app-root",
    tw.dark ? "dark" : "",
    tw.density === "compact"
      ? "density-compact"
      : tw.density === "comfy"
        ? "density-comfy"
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!authChecked) {
    return (
      <div className={rootClass} style={{ "--accent": tw.accent } as CSSProperties}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          <div className="dim" style={{ fontSize: 14 }}>
            …
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <MantineColorSchemeSync dark={tw.dark} />
      <div className={rootClass} style={{ "--accent": tw.accent } as CSSProperties}>
        {children}
        <TweaksPanel title={t("tweaks")}>
          <TweakSection label={t("theme")}>
            <TweakColor
              label={t("accent")}
              value={tw.accent}
              options={["#0f9d6b", "#0d9488", "#3b6dff", "#6d5cff", "#9b4dff", "#cf9019"]}
              onChange={(v: string) => setTweak("accent", v)}
            />
            <TweakToggle
              label={t("darkMode")}
              value={tw.dark}
              onChange={(v: boolean) => setTweak("dark", v)}
            />
            <TweakRadio
              label={t("density")}
              value={tw.density}
              options={[
                { value: "compact", label: t("compact") },
                { value: "regular", label: t("regular") },
                { value: "comfy", label: t("comfy") },
              ]}
              onChange={(v: string) => setTweak("density", v)}
            />
          </TweakSection>
        </TweaksPanel>
      </div>
    </AppContext.Provider>
  );
}

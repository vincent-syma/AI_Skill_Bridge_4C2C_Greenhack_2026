/* ============================================================
   appmain.jsx — context provider, routing, settings, tweaks
   ============================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#0ea5b5",
  "density": "compact",
  "dark": true
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [lang, setLang] = React.useState("en");
  const [signedIn, setSignedIn] = React.useState(false);
  const [page, setPageState] = React.useState(() => readRouteFromHash());
  const setPage = React.useCallback((next) => {
    setPageState(next);
    writeRouteHash(next);
  }, []);

  React.useEffect(() => {
    const onHashChange = () => setPageState(readRouteFromHash());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) writeRouteHash(readRouteFromHash());
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const [profile, setProfile] = React.useState({
    name: "Jana Nováková", initials: "JN", role: "Marketing",
    xp: 0, level: 0, streak: 0, department: "Marketing",
  });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);

  // On mount: restore session from stored token
  React.useEffect(() => {
    const restore = async () => {
      const tok = Auth.getToken();
      if (!tok) { setAuthChecked(true); return; }
      try {
        const user = await API.auth.me();
        _applyUser(user);
        setSignedIn(true);
      } catch (e) {
        // Token expired — try refresh via httpOnly cookie
        try {
          await API.auth.refresh();
          const user = await API.auth.me();
          _applyUser(user);
          setSignedIn(true);
        } catch (_) {
          Auth.clearToken();
        }
      } finally {
        setAuthChecked(true);
      }
    };
    restore();
  }, []);

  const _applyUser = (user) => {
    const initials = user.name
      ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
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
    // Sync language from settings if available
    API.users.getSettings().then((s) => {
      if (s?.language) setLang(s.language);
      if (s?.accent) setTweak("accent", s.accent);
      if (s?.theme) setTweak("dark", s.theme === "dark");
      if (s && !s.onboarding_completed) setOnboardingOpen(true);
    }).catch(() => {});
  };

  const completeOnboarding = async () => {
    try {
      await API.users.updateSettings({ onboarding_completed: true });
    } catch (_) { /* still close locally */ }
    setOnboardingOpen(false);
  };

  const startHacking = async () => {
    await completeOnboarding();
    setPage("exerciseWhatIsPrompting");
  };

  const t = (k, vars) => tx(DICT, lang, k, vars);
  const l = (value) => lx(value, lang);

  const ctx = {
    t, l, lang, setLang,
    dark: tw.dark, setDark: (v) => setTweak("dark", v),
    accent: tw.accent, setAccent: (v) => setTweak("accent", v),
    profile, setProfile,
    page, setPage,
    signIn: () => {
      // Reload user after login
      API.auth.me().then((user) => {
        _applyUser(user);
        setSignedIn(true);
        setPage(readRouteFromHash());
      }).catch(() => {
        setSignedIn(true);
        setPage(readRouteFromHash());
      });
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
  };

  const rootClass = [
    "app-root",
    tw.dark ? "dark" : "",
    tw.density === "compact" ? "density-compact" : tw.density === "comfy" ? "density-comfy" : "",
  ].join(" ");

  // Wait for the auth check before rendering (avoids flash of login screen)
  if (!authChecked) {
    return (
      <div className={rootClass} style={{ "--accent": tw.accent }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <div className="dim" style={{ fontSize: 14 }}>…</div>
        </div>
      </div>
    );
  }

  const pageNode = page === "home" ? <HomePage />
    : page === "projects" ? <ProjectsPage />
    : page === "exerciseWhatIsPrompting" ? <ExerciseWhatIsPromptingPage />
    : <PeerEvaluationPage />;

  return (
    <AppCtx.Provider value={ctx}>
      <div className={rootClass} style={{ "--accent": tw.accent }}>
        {!signedIn ? (
          <AuthPage />
        ) : (
          <div className="app">
            <Sidebar />
            <div className="main">
              <TopBar />
              <div className="content" key={page}>{pageNode}</div>
            </div>
          </div>
        )}
        {signedIn && onboardingOpen && <OnboardingModal />}
        {signedIn && settingsOpen && <SettingsSheet />}

        <TweaksPanel title={t("tweaks")}>
          <TweakSection label={t("theme")} />
          <TweakColor label={t("accent")} value={tw.accent}
            options={["#2f9e72", "#4f63d6", "#d9663f", "#8a5ad0", "#0ea5b5", "#c2410c"]}
            onChange={(v) => setTweak("accent", v)} />
          <TweakToggle label={t("darkMode")} value={tw.dark} onChange={(v) => setTweak("dark", v)} />
          <TweakRadio label={t("density")} value={tw.density}
            options={[{ value: "compact", label: t("compact") }, { value: "regular", label: t("regular") }, { value: "comfy", label: t("comfy") }]}
            onChange={(v) => setTweak("density", v)} />
        </TweaksPanel>
      </div>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

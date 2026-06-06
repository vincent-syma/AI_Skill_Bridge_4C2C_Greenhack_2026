// @ts-nocheck — legacy port; tighten types incrementally per feature.
"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/providers/app-context";
import { API, Auth } from "@/lib/api";
import { Av, Bar, TrustPanel } from "@/components/ui";
import { ICONS } from "@/components/ui/icons";
import { DICT, LANG_META, LOCALES } from "@/lib/i18n";
import type { PageKey } from "@/lib/routes";
import { routePath } from "@/lib/routes";

/* Aurora sidebar — ported 1:1 from the reference HTML
   (Use AI Skill Bridge at 42 (3)/AI Skill Bridge.html, <aside class="side au-mesh">).
   Classes match verbatim: .side .au-mesh .brand .mark .nm .side-nav .on .ai-nav .ct
   .spacer .side-sect .usage .faclink. SVGs are inlined as JSX. */
function Sidebar() {
  const { page, setPage, signOut, openSettings, profile } = useApp();
  const [isPower, setIsPower] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [peerCount, setPeerCount] = useState(0);

  // role gate — facilitator link only for power_user / admin
  useEffect(() => {
    let cancelled = false;
    API.auth.me().then((u: any) => {
      if (cancelled) return;
      const r = u?.role ?? profile?.role;
      if (r === "power_user" || r === "admin") setIsPower(true);
    }).catch(() => {
      const r = profile?.role;
      if (r === "power_user" || r === "admin") setIsPower(true);
    });
    return () => { cancelled = true; };
  }, [profile?.role]);

  // Tasks + Peers count badges — fetched once on mount (cached, not refetched per render).
  useEffect(() => {
    let cancelled = false;
    API.projects.list().then((rows: any) => {
      if (cancelled) return;
      const list = Array.isArray(rows) ? rows : (rows?.items ?? []);
      const open = list.filter((p: any) => p?.user_status && p.user_status !== "completed").length;
      setTaskCount(open);
    }).catch(() => {});
    API.peerEvals.queue().then((q: any) => {
      if (cancelled) return;
      const n = Array.isArray(q) ? q.length : (q?.items?.length ?? 0);
      setPeerCount(n);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const studioActive = page === "exerciseWhatIsPrompting";
  const go = (k: PageKey) => () => setPage(k);

  return (
    <aside className="side au-mesh">
      <div className="brand">
        <span className="mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
          </svg>
        </span>
        <span className="nm">AI Skill Bridge<small>Learn · Build · Share</small></span>
      </div>

      <nav className="side-nav">
        <button className={page === "home" ? "on" : ""} onClick={go("home")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11l8-7 8 7" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /><path d="M10 20v-6h4v6" />
          </svg>
          Home
        </button>

        <button className={page === "classroom" ? "on" : ""} onClick={go("classroom")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 20h8M12 17v3" />
          </svg>
          Classroom
        </button>

        <button className={page === "projects" ? "on" : ""} onClick={go("projects")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
          </svg>
          Tasks{taskCount > 0 && <span className="ct">{taskCount}</span>}
        </button>

        <button className={"ai-nav" + (studioActive ? " on" : "")} onClick={go("exerciseWhatIsPrompting")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17V9M11 17V5M17 17v-6" />
          </svg>
          Studio
        </button>

        <button className={page === "peerEvaluation" ? "on" : ""} onClick={go("peerEvaluation")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="3" /><path d="M3 19a5 5 0 0 1 10 0" /><path d="M15 7h6M15 11h4M15 15l2 2 4-5" />
          </svg>
          Peers{peerCount > 0 && <span className="ct">{peerCount}</span>}
        </button>

        <button className={page === "progress" ? "on" : ""} onClick={go("progress")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M12 4l8 14H4z" />
          </svg>
          Progress
        </button>
      </nav>

      <div className="spacer" />

      <div>
        {/* AI-usage panel intentionally omitted: API.aiUsage.summary() does not exist
            in the current backend client, and the reference's demo numbers must not
            be hardcoded per the porting rules. Settings + sign-out moved here so the
            existing functionality (previously in the old sidebar) is preserved. */}
        <div className="side-tools">
          <button type="button" title="Settings" onClick={openSettings}>
            {ICONS.gear ?? ICONS.cog ?? null}
            Settings
          </button>
          <button type="button" title="Sign out" onClick={signOut}>
            {ICONS.logout}
            Sign out
          </button>
        </div>

        {isPower && (
          <button className="faclink" type="button" onClick={go("facilitator")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7z" />
            </svg>
            Facilitator view
          </button>
        )}
      </div>
    </aside>
  );
}

function TopBar() {
  const { t, lang, setLang, dark, setDark, profile, openSettings } = useApp();
  return (
    <header className="top">
      <div className="search">
        {ICONS.search}
        <input placeholder={t("search")} />
      </div>
      <span className="grow" />
      <div className="lang">
        {LOCALES.map((c) => (
          <span key={c} className={lang === c ? "on" : ""} onClick={() => setLang(c)}>{LANG_META[c].short}</span>
        ))}
      </div>
      <button className="iconbtn" title={t("theme")} onClick={() => setDark(!dark)}>{dark ? ICONS.sun : ICONS.moon}</button>
      <button className="iconbtn" title={t("notifs")}>{ICONS.bell}<span className="dot" /></button>
      <button className="pbtn" onClick={openSettings} title={t("settings")}>
        <span className="nm">{profile.name.split(" ")[0]}</span>
        <Av sm>{profile.initials}</Av>
      </button>
    </header>
  );
}

const ACCENTS = ["#2f9e72", "#4f63d6", "#d9663f", "#8a5ad0", "#0ea5b5", "#c2410c"];

const LLM_PRESETS: { label: string; url: string }[] = [
  { label: "LM Studio", url: "http://127.0.0.1:1234/v1" },
  { label: "Ollama", url: "http://127.0.0.1:11434" },
];

function SettingsSheet() {
  const { t, lang, setLang, dark, setDark, accent, setAccent, profile, setProfile, closeSettings, signOut, resetProgress } = useApp();
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [saved, setSaved] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErr, setResetErr] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");

  // --- Local LLM ---
  const [llmUrl, setLlmUrl] = useState("http://127.0.0.1:1234/v1");
  const [llmStatus, setLlmStatus] = useState<"idle" | "testing" | "ok" | "fail" | "saved">("idle");
  const [llmModels, setLlmModels] = useState<{ id: string; name: string }[]>([]);
  const [llmErr, setLlmErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    API.users.getSettings().then((s) => {
      if (cancelled) return;
      if (s?.ai_base_url) setLlmUrl(s.ai_base_url);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const testLlm = async () => {
    setLlmErr("");
    setLlmStatus("testing");
    setLlmModels([]);
    try {
      const res = await API.playground.test(llmUrl);
      if (res.reachable) {
        setLlmStatus("ok");
        setLlmModels(res.models || []);
      } else {
        setLlmStatus("fail");
        setLlmErr("No response from that URL. Is LM Studio's local server running?");
      }
    } catch (e: any) {
      setLlmStatus("fail");
      setLlmErr(e?.message || "Connection failed");
    }
  };

  const saveLlm = async () => {
    setLlmErr("");
    try {
      await API.users.updateSettings({ ai_base_url: llmUrl.trim() || null });
      setLlmStatus("saved");
      setTimeout(() => setLlmStatus(llmModels.length ? "ok" : "idle"), 1600);
    } catch (e: any) {
      setLlmErr(e?.message || "Save failed");
    }
  };

  const clearLlm = async () => {
    setLlmErr("");
    try {
      await API.users.updateSettings({ ai_base_url: null });
      setLlmUrl("http://127.0.0.1:1234/v1");
      setLlmModels([]);
      setLlmStatus("idle");
    } catch (e: any) {
      setLlmErr(e?.message || "Clear failed");
    }
  };

  const initials = name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const save = async () => {
    const newName = name.trim() || profile.name;
    try {
      await API.users.updateMe({ name: newName, department: role });
      await API.users.updateSettings({ theme: dark ? "dark" : "light", language: lang, accent });
    } catch (e) { /* ignore network errors in settings */ }
    setProfile({ ...profile, name: newName, role, initials });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const changePassword = async () => {
    setPwErr("");
    setPwMsg("");
    setDevResetUrl("");
    if (newPw !== confirmPw) {
      setPwErr(t("passwordMismatch"));
      return;
    }
    setPwLoading(true);
    try {
      const res = await API.auth.changePassword(currentPw, newPw);
      setPwMsg((res?.message || t("passwordChanged")) + " " + t("sessionsRevoked"));
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      Auth.clearToken();
    } catch (e) {
      setPwErr(e.message || t("changePasswordFailed"));
    } finally {
      setPwLoading(false);
    }
  };

  const eraseProgress = async () => {
    if (!window.confirm(t("resetProgressConfirm"))) return;
    setResetErr("");
    setResetLoading(true);
    try {
      await resetProgress();
    } catch (e) {
      setResetErr((e as Error).message || t("resetProgressFailed"));
    } finally {
      setResetLoading(false);
    }
  };

  const emailResetLink = async () => {
    setPwErr("");
    setPwMsg("");
    setDevResetUrl("");
    setResetSent(false);
    if (!profile.email) return;
    setPwLoading(true);
    try {
      const res = await API.auth.forgotPassword(profile.email);
      setResetSent(true);
      setPwMsg(res.message || t("resetLinkSent"));
      if (res.dev_reset_url) setDevResetUrl(res.dev_reset_url);
    } catch (e) {
      setPwErr(e.message || t("sendResetFailed"));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={closeSettings}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sh-head">
          <h2 className="h2">{t("settings")}</h2>
          <button className="iconbtn" onClick={closeSettings}>{ICONS.x}</button>
        </div>
        <div className="sh-body">
          {/* account */}
          <div className="set-group">
            <span className="lbl">{t("account")}</span>
            <div className="row center" style={{ gap: 13 }}>
              <Av lg>{initials}</Av>
              <div className="dim" style={{ fontSize: 11.5 }}>
                {t("member")}<br /><b style={{ color: "var(--ink-2)" }}>{t("memberDate")}</b> · {(DICT[lang] || DICT.en).groupName}
              </div>
            </div>
            <label className="col" style={{ gap: 5 }}>
              <span className="dim" style={{ fontSize: 11 }}>{t("displayName")}</span>
              <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="col" style={{ gap: 5 }}>
              <span className="dim" style={{ fontSize: 11 }}>{t("role")}</span>
              <input className="inp" value={role} onChange={(e) => setRole(e.target.value)} />
            </label>
            <button className="btn primary sm" style={{ alignSelf: "flex-start" }} onClick={save}>
              {saved ? t("saved") : t("save")}
            </button>
          </div>
          <hr className="divider" />
          {/* appearance */}
          <div className="set-group">
            <span className="lbl">{t("appearance")}</span>
            <div className="row between center">
              <span style={{ fontSize: 13 }}>{t("theme")}</span>
              <div className="seg">
                <button className={!dark ? "on" : ""} onClick={() => setDark(false)}>{t("light")}</button>
                <button className={dark ? "on" : ""} onClick={() => setDark(true)}>{t("dark")}</button>
              </div>
            </div>
            <div className="row between center">
              <span style={{ fontSize: 13 }}>{t("accent")}</span>
              <div className="swatches">
                {ACCENTS.map((c) => (
                  <button key={c} className={"swatch" + (accent === c ? " on" : "")} style={{ background: c }} onClick={() => setAccent(c)} />
                ))}
              </div>
            </div>
          </div>
          <hr className="divider" />
          {/* local LLM */}
          <div className="set-group">
            <span className="lbl">Local LLM</span>
            <p className="dim" style={{ fontSize: 12, margin: 0, lineHeight: 1.45 }}>
              Point the AI playground at LM Studio or Ollama running on your machine.
              For LM Studio use a URL ending in <code>/v1</code>.
            </p>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {LLM_PRESETS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  className={"btn sm" + (llmUrl === p.url ? " primary" : "")}
                  onClick={() => setLlmUrl(p.url)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="col" style={{ gap: 5 }}>
              <span className="dim" style={{ fontSize: 11 }}>Base URL</span>
              <input
                className="inp"
                value={llmUrl}
                onChange={(e) => { setLlmUrl(e.target.value); setLlmStatus("idle"); setLlmModels([]); }}
                placeholder="http://127.0.0.1:1234/v1"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
              />
            </label>
            {llmErr && (
              <div style={{ fontSize: 12, color: "var(--err, #f87171)" }}>{llmErr}</div>
            )}
            {llmStatus === "ok" && (
              <div className="success-box" style={{ fontSize: 12 }}>
                Connected. {llmModels.length} model{llmModels.length === 1 ? "" : "s"} available
                {llmModels.length > 0 && (
                  <>: <b>{llmModels.slice(0, 3).map((m) => m.name).join(", ")}</b>
                  {llmModels.length > 3 && ` +${llmModels.length - 3} more`}</>
                )}
              </div>
            )}
            {llmStatus === "saved" && (
              <div className="success-box" style={{ fontSize: 12 }}>Saved to your profile.</div>
            )}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn primary sm"
                disabled={llmStatus === "testing" || !llmUrl.trim()}
                onClick={testLlm}
              >
                {llmStatus === "testing" ? "…" : "Connect"}
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={llmStatus !== "ok"}
                onClick={saveLlm}
                title="Persist this URL to your profile"
              >
                Save to profile
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={clearLlm}
                title="Remove the per-user override and fall back to the server default"
              >
                Clear
              </button>
            </div>
          </div>
          <hr className="divider" />
          {/* security */}
          <div className="set-group">
            <span className="lbl">{t("security")}</span>
            <TrustPanel title={t("forgotTrustTitle")} body={t("forgotTrustBody")} />
            {pwErr && (
              <div style={{ fontSize: 12, color: "var(--err, #f87171)" }}>{pwErr}</div>
            )}
            {pwMsg && (
              <div className="success-box" style={{ fontSize: 12 }}>{pwMsg}</div>
            )}
            {devResetUrl && (
              <div className="trust-panel">
                <strong>{t("devResetNote")}</strong>
                <a className="linkish" href={devResetUrl} style={{ wordBreak: "break-all" }}>{devResetUrl}</a>
              </div>
            )}
            <label className="col" style={{ gap: 5 }}>
              <span className="dim" style={{ fontSize: 11 }}>{t("currentPassword")}</span>
              <input className="inp" type="password" value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </label>
            <label className="col" style={{ gap: 5 }}>
              <span className="dim" style={{ fontSize: 11 }}>{t("newPassword")}</span>
              <input className="inp" type="password" value={newPw}
                onChange={(e) => setNewPw(e.target.value)} minLength={8} autoComplete="new-password" />
            </label>
            <label className="col" style={{ gap: 5 }}>
              <span className="dim" style={{ fontSize: 11 }}>{t("confirmPassword")}</span>
              <input className="inp" type="password" value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)} minLength={8} autoComplete="new-password" />
            </label>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn primary sm" type="button" disabled={pwLoading || !currentPw || !newPw}
                onClick={changePassword}>
                {pwLoading ? "…" : t("changePassword")}
              </button>
              <button className="btn sm" type="button" disabled={pwLoading || !profile.email}
                onClick={emailResetLink}>
                {resetSent ? "✓" : t("sendResetLink")}
              </button>
            </div>
          </div>
          <hr className="divider" />
          {/* language */}
          <div className="set-group">
            <span className="lbl">{t("language")}</span>
            <div className="lang-grid">
              {LOCALES.map((c) => (
                <button key={c} className={"lang-opt" + (lang === c ? " on" : "")} onClick={() => setLang(c)}>
                  <span className="lang-code">{LANG_META[c].short}</span>
                  <span className="lang-name">{LANG_META[c].native}</span>
                  {lang === c && <span className="lang-tick">{ICONS.check}</span>}
                </button>
              ))}
            </div>
          </div>
          <hr className="divider" />
          <div className="set-group">
            <span className="lbl">{t("resetProgressTitle")}</span>
            <p className="dim" style={{ fontSize: 12, margin: 0, lineHeight: 1.45 }}>
              {t("resetProgressDesc")}
            </p>
            {resetErr && (
              <div style={{ fontSize: 12, color: "var(--err, #f87171)" }}>{resetErr}</div>
            )}
            <button
              className="btn sm"
              type="button"
              disabled={resetLoading}
              style={{ alignSelf: "flex-start", color: "var(--err, #f87171)" }}
              onClick={eraseProgress}
            >
              {resetLoading ? "…" : t("resetProgressBtn")}
            </button>
          </div>
          <hr className="divider" />
          <button className="btn block" onClick={signOut}>{ICONS.logout} {t("signout")}</button>
        </div>
      </div>
    </div>
  );
}

function OnboardingModal() {
  const { t, profile, startHacking } = useApp();
  const firstName = (profile.name || "").split(" ")[0] || profile.name;

  return (
    <div className="eval-overlay onboard-overlay">
      <div className="eval-modal onboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="onboard-hero">
          <div className="onboard-icon">{ICONS.spark}</div>
          <Av lg>{profile.initials}</Av>
        </div>
        <h2 className="h2" style={{ textAlign: "center", margin: 0 }}>{t("onboardWelcomeTitle", { name: firstName })}</h2>
        <p className="onboard-body">{t("onboardWelcomeSub")}</p>
        <button type="button" className="btn primary onboard-start-btn" onClick={startHacking}>
          {ICONS.spark} {t("onboardStartHacking")}
        </button>
      </div>
    </div>
  );
}

export { Sidebar };
export { TopBar };
export { SettingsSheet };
export { OnboardingModal };
export { ACCENTS };

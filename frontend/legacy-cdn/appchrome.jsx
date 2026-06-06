/* ============================================================
   appchrome.jsx — sidebar, top bar, settings sheet
   ============================================================ */

function Sidebar() {
  const { t, page, setPage } = useApp();
  const items = ["home", "projects", "peerEvaluation"];
  return (
    <aside className="side">
      <div className="brand"><Mark /> {t("appName")}</div>
      <nav className="side-nav">
        {items.map((k) => (
          <a key={k} className={page === k ? "on" : ""} onClick={() => setPage(k)}>{ICONS[k]} {t(k)}</a>
        ))}
      </nav>
      <div className="spacer" />
      <div>
        <div className="side-sect">{ICONS.leaf} {t("aiUsage")}</div>
        <div className="card tint flat" style={{ padding: 12 }}>
          <div className="row between center" style={{ marginBottom: 8 }}>
            <span className="num" style={{ fontSize: 21 }}>1,240</span>
            <span className="pill" style={{ fontSize: 10 }}>{t("thisMonth")}</span>
          </div>
          <div className="dim" style={{ fontSize: 11, marginBottom: 8 }}>{t("usageLine")}</div>
          <Bar p={42} />
          <div className="dim" style={{ fontSize: 10.5, marginTop: 7 }}>{t("teamBudgetTips")}</div>
        </div>
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
        {Object.entries(LANG_META).map(([c, meta]) => (
          <span key={c} className={lang === c ? "on" : ""} onClick={() => setLang(c)}>{meta.short}</span>
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

function SettingsSheet() {
  const { t, lang, setLang, dark, setDark, accent, setAccent, profile, setProfile, closeSettings, signOut } = useApp();
  const [name, setName] = React.useState(profile.name);
  const [role, setRole] = React.useState(profile.role);
  const [saved, setSaved] = React.useState(false);
  const [currentPw, setCurrentPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirmPw, setConfirmPw] = React.useState("");
  const [pwMsg, setPwMsg] = React.useState("");
  const [pwErr, setPwErr] = React.useState("");
  const [pwLoading, setPwLoading] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [devResetUrl, setDevResetUrl] = React.useState("");

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
      setPwMsg((res.message || t("passwordChanged")) + " " + t("sessionsRevoked"));
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
              {Object.entries(LANG_META).map(([c, meta]) => (
                <button key={c} className={"lang-opt" + (lang === c ? " on" : "")} onClick={() => setLang(c)}>
                  <span className="lang-code">{meta.short}</span>
                  <span className="lang-name">{meta.native}</span>
                  {lang === c && <span className="lang-tick">{ICONS.check}</span>}
                </button>
              ))}
            </div>
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

Object.assign(window, { Sidebar, TopBar, SettingsSheet, OnboardingModal, ACCENTS });

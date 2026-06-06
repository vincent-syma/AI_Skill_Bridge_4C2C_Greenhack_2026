/* ============================================================
   page-auth.jsx — Sign in / register / password reset
   ============================================================ */

function AuthPage() {
  const { t, lang, setLang, signIn } = useApp();
  const [mode, setMode] = React.useState("signin");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("jana.novakova@firma.cz");
  const [password, setPassword] = React.useState("Demo1234!");
  const [confirm, setConfirm] = React.useState("");
  const [resetToken, setResetToken] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");
  const [devResetUrl, setDevResetUrl] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset");
    if (token) {
      setResetToken(token);
      setMode("reset");
      setPassword("");
      setConfirm("");
      window.history.replaceState({}, "", window.location.pathname || "/");
    }
  }, []);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
    setDevResetUrl("");
    setConfirm("");
    if (next === "signin") {
      setEmail("jana.novakova@firma.cz");
      setPassword("Demo1234!");
      setName("");
    } else if (next === "register") {
      setEmail("");
      setPassword("");
      setName("");
    } else if (next === "forgot") {
      setPassword("");
      setName("");
    } else if (next === "reset") {
      setPassword("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setDevResetUrl("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await API.auth.forgotPassword(email.trim());
        setInfo(res.message || t("resetLinkSent"));
        if (res.dev_reset_url) setDevResetUrl(res.dev_reset_url);
        return;
      }
      if (mode === "reset") {
        if (password !== confirm) {
          setError(t("passwordMismatch"));
          return;
        }
        await API.auth.resetPassword(resetToken, password);
        setInfo(t("passwordUpdatedSignIn"));
        setMode("signin");
        setPassword("");
        setConfirm("");
        setResetToken("");
        return;
      }
      if (mode === "register") {
        await API.auth.register({
          email: email.trim(),
          password,
          name: name.trim() || null,
        });
        await API.auth.login(email.trim(), password);
      } else {
        await API.auth.login(email.trim(), password);
      }
      signIn();
    } catch (err) {
      const fallback = mode === "register" ? t("registerFailed")
        : mode === "reset" ? t("resetFailed")
        : mode === "forgot" ? t("sendResetFailed")
        : t("loginFailed");
      setError(err.message || fallback || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";
  const title = isRegister ? t("joinUs")
    : isForgot ? t("forgotTitle")
    : isReset ? t("resetTitle")
    : t("welcomeBack");

  return (
    <div className="auth">
      <div className="brandside">
        <div className="deco" />
        <div className="brand" style={{ color: "#fff", fontSize: 17, position: "relative" }}><Mark light /> {t("appName")}</div>
        <div style={{ position: "relative", fontSize: 26, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-.5px", whiteSpace: "pre-line" }}>{t("brandTagline")}</div>
        <div className="col" style={{ position: "relative", gap: 14 }}>
          {[["★", t("sell1")], ["✎", t("sell2")], ["⚡", t("sell3")]].map(([ic, s]) => (
            <div className="sell" key={s}><span className="bsq">{ic}</span>{s}</div>
          ))}
        </div>
        <div style={{ position: "relative", fontSize: 11.5, opacity: .8 }}>{t("authMethod")}</div>
      </div>
      <div className="formside">
        <div style={{ position: "absolute", top: 22, right: 22 }}>
          <div className="lang">
            {Object.entries(LANG_META).map(([c, meta]) => (
              <span key={c} className={lang === c ? "on" : ""} onClick={() => setLang(c)}>{meta.short}</span>
            ))}
          </div>
        </div>
        <form className="formbox" onSubmit={handleSubmit}>
          <h1 className="h1">{title}</h1>
          {(isForgot || isReset) && (
            <p className="dim" style={{ fontSize: 12.5, margin: "-6px 0 0", lineHeight: 1.45 }}>
              {isForgot ? t("forgotSubtitle") : t("resetSubtitle")}
            </p>
          )}
          {isForgot && (
            <TrustPanel title={t("forgotTrustTitle")} body={t("forgotTrustBody")} />
          )}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,.15)", color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}
          {info && (
            <div className="success-box">{info}</div>
          )}
          {devResetUrl && (
            <div className="trust-panel">
              <strong>{t("devResetNote")}</strong>
              <a className="linkish" href={devResetUrl} style={{ wordBreak: "break-all" }}>{devResetUrl}</a>
            </div>
          )}
          {isRegister && (
            <label className="col" style={{ gap: 6 }}>
              <span className="dim" style={{ fontSize: 11.5 }}>{t("displayName")}</span>
              <input className="inp" type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jana Nováková" autoComplete="name" />
            </label>
          )}
          {!isReset && (
            <label className="col" style={{ gap: 6 }}>
              <span className="dim" style={{ fontSize: 11.5 }}>{t("email")}</span>
              <input className="inp" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jana.novakova@firma.cz" required autoComplete="email" />
            </label>
          )}
          {!isForgot && (
            <label className="col" style={{ gap: 6 }}>
              <span className="dim" style={{ fontSize: 11.5 }}>{t("password")}</span>
              <input className="inp" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                required minLength={isRegister || isReset ? 8 : undefined}
                autoComplete={isRegister || isReset ? "new-password" : "current-password"} />
              {(isRegister || isReset) && (
                <span className="dim" style={{ fontSize: 11 }}>{t("passwordHint")}</span>
              )}
            </label>
          )}
          {isReset && (
            <label className="col" style={{ gap: 6 }}>
              <span className="dim" style={{ fontSize: 11.5 }}>{t("confirmPassword")}</span>
              <input className="inp" type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required minLength={8} autoComplete="new-password" />
            </label>
          )}
          {mode === "signin" && (
            <span className="linkish" style={{ alignSelf: "flex-start" }} onClick={() => switchMode("forgot")}>
              {t("forgot")}
            </span>
          )}
          <button className="btn primary block" type="submit" disabled={loading}>
            {loading ? "…" : (
              isForgot ? t("sendResetLink")
              : isReset ? t("changePassword")
              : isRegister ? t("register")
              : t("signin")
            )}
          </button>
          {mode === "signin" && (
            <>
              <div className="row center" style={{ gap: 10 }}>
                <hr className="divider grow" /><span className="dim" style={{ fontSize: 11 }}>{t("or")}</span><hr className="divider grow" />
              </div>
              <button className="btn block" type="button" onClick={handleSubmit}>{t("sso")}</button>
            </>
          )}
          {(isForgot || isReset) && (
            <div className="row center" style={{ justifyContent: "center" }}>
              <span className="linkish" onClick={() => switchMode("signin")}>{t("backToSignIn")}</span>
            </div>
          )}
          {mode === "signin" || mode === "register" ? (
            <div className="row center" style={{ justifyContent: "center", gap: 7, marginTop: 2 }}>
              <span className="dim" style={{ fontSize: 12 }}>{isRegister ? t("alreadyHaveAccount") : t("newHere")}</span>
              <span
                className="pill accent"
                style={{ cursor: "pointer" }}
                onClick={() => switchMode(isRegister ? "signin" : "register")}
              >
                {isRegister ? t("signin") : t("register")}
              </span>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { AuthPage });

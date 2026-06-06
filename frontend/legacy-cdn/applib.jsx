/* ============================================================
   applib.jsx — hi-fi app: context, primitives, icons, i18n
   ============================================================ */

const AppCtx = React.createContext({});
const useApp = () => React.useContext(AppCtx);

const ROUTES = {
  home: "/",
  projects: "/projects",
  peerEvaluation: "/peer-evaluation",
  exerciseWhatIsPrompting: "/exercises/what-is-prompting",
};

function routePath(page) {
  return ROUTES[page] || ROUTES.home;
}

function pageFromRoute(path) {
  const normalized = (path || "/").replace(/\/+$/, "") || "/";
  const hit = Object.entries(ROUTES).find(([, p]) => p === normalized);
  return hit ? hit[0] : "home";
}

function readRouteFromHash() {
  const raw = (window.location.hash || "#/").replace(/^#/, "");
  return pageFromRoute(raw.split("?")[0]);
}

function writeRouteHash(page) {
  const next = "#" + routePath(page);
  if (window.location.hash !== next) window.history.replaceState(null, "", next);
}

/* ---------- primitives ---------- */
function Av({ children, size = "" }) { return <div className={"av " + size}>{children}</div>; }
function Pill({ children, kind = "", as = "span", ...p }) {
  const C = as; return <C className={"pill " + kind} {...p}>{children}</C>;
}
function Bar({ p = 60 }) { return <div className="bar"><i style={{ width: p + "%" }} /></div>; }
function Stars({ n = 4 }) { return <span className="star">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>; }
function Badge({ icon = "★", locked }) { return <div className={"badge" + (locked ? " locked" : "")}>{icon}</div>; }
function Ring({ p = 62, lvl = 7 }) {
  return <div className="ring" style={{ "--p": p }}><b>L{lvl}<small>{p}%</small></b></div>;
}
function ImgPh({ label = "image", h = 120, style, className = "" }) {
  return <div className={"img-ph " + className} style={{ height: h, ...style }}>{label}</div>;
}

/* ---------- icons ---------- */
function Ic({ paths, size = 18 }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
  );
}
const ICONS = {
  home: <Ic paths={<><path d="M4 11l8-7 8 7" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /><path d="M10 20v-6h4v6" /></>} />,
  projects: <Ic paths={<><path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M8 13h8M8 16h5" /></>} />,
  peerEvaluation: <Ic paths={<><circle cx="8" cy="8" r="3" /><path d="M3 19a5 5 0 0 1 10 0" /><path d="M15 7h6M15 11h4M15 15l2 2 4-5" /></>} />,
  search: <Ic size={16} paths={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></>} />,
  bell: <Ic size={17} paths={<><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>} />,
  sun: <Ic size={17} paths={<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" /></>} />,
  moon: <Ic size={17} paths={<path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a6.5 6.5 0 0 0 9.5 9.5Z" />} />,
  logout: <Ic size={16} paths={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>} />,
  check: <Ic size={14} paths={<path d="M5 12l5 5L20 6" />} />,
  x: <Ic size={16} paths={<path d="M6 6l12 12M18 6 6 18" />} />,
  edit: <Ic size={14} paths={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} />,
  leaf: <Ic size={15} paths={<><path d="M4 20c8 2 16-4 16-15 0 0-13-2-13 8a5 5 0 0 0 5 5" /><path d="M4 20c2-6 6-9 10-11" /></>} />,
  plus: <Ic size={15} paths={<path d="M12 5v14M5 12h14" />} />,
  spark: <Ic size={15} paths={<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />} />,
  chev: <Ic size={15} paths={<path d="m9 6 6 6-6 6" />} />,
  flag: <Ic size={15} paths={<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>} />,
};

function TrustPanel({ title, body }) {
  return (
    <div className="trust-panel">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function Mark({ light }) {
  return (
    <svg className="mark" viewBox="0 0 32 32" fill="none" stroke={light ? "#fff" : "var(--accent)"} strokeWidth="2.1" strokeLinecap="round">
      <path d="M3 22c5-9 21-9 26 0" />
      <path d="M3 22v4M29 22v4M11 18v8M21 18v8M16 16v10" />
    </svg>
  );
}

/* ---------- i18n ---------- */
const DICT = {
  en: {
    home: "Home", projects: "Projects", peerEvaluation: "Peer Evaluation",
    search: "Search projects, tools, people…",
    settings: "Settings", account: "Account", appearance: "Appearance", language: "Language",
    theme: "Theme", light: "Light", dark: "Dark", accent: "Accent colour", signout: "Sign out",
    editProfile: "Edit profile", displayName: "Display name", role: "Department / role", save: "Save changes", saved: "Saved ✓", member: "Member since",
    welcome: "Welcome back", tagline: "Learn AI by doing. Level up by sharing.",
    level: "Level", xpToNext: "to next level", projectsDone: "Projects done", evalsGiven: "Evals given",
    streak: "Streak", days: "days", badges: "Achievements", learningPath: "Your learning path", recentActivity: "Recent activity",
    basics: "Basics", prompting: "Prompting", toolsStep: "Tools", sharing: "Sharing", mentor: "Mentor", youAreHere: "you are here", nextLevel: "Next: Level 8 · Builder",
    showcaseTitle: "Team Showcase", showcaseSub: "What your colleagues built with AI",
    share: "Share result", evaluate: "Evaluate", view: "View", evals: "evals", helpful: "Was this helpful?",
    toolsUsed: "Tools", featuredTag: "Most helpful this week", yourWeek: "Your week", peersWaiting: "2 peers waiting for your feedback",
    trending: "Trending tools", filter: "Filter feed", allDepts: "All teams", anyTool: "Any tool", anyTask: "Any project type",
    results: "results", clear: "clear", noMatch: "No projects match — clear a filter.", ago: "ago",
    projectsTitle: "Projects", active: "active", newTask: "New task", reward: "reward", steps: "Steps",
    submit: "Submit work", ready: "Mark ready for review", matched: "Matched with a peer",
    groupName: "Marketing team", members: "Members", weeklyGoal: "Weekly team goal", sharedWork: "Shared projects", teamActivity: "Team activity",
    combinedXp: "Combined XP", contribute: "Contribute", goalDesc: "Complete 20 projects together this month", joined: "joined",
    welcomeBack: "Welcome back", joinUs: "Join the bridge", signin: "Sign in", register: "Create account", email: "Work email", password: "Password",
    passwordHint: "At least 8 characters", forgot: "Forgot password?", or: "or", sso: "Continue with Microsoft", newHere: "New here?", alreadyHaveAccount: "Already have an account?",
    registerFailed: "Registration failed", loginFailed: "Login failed",
    security: "Security", changePassword: "Change password", currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm password",
    passwordMismatch: "Passwords do not match", changePasswordFailed: "Could not update password", passwordChanged: "Password updated",
    sendResetLink: "Email reset link", resetLinkSent: "If an account exists for this address, we sent reset instructions.",
    forgotTitle: "Reset your password", forgotSubtitle: "Enter your work email. We will send a secure one-time link.",
    forgotTrustTitle: "Privacy & security", forgotTrustBody: "For your protection we always show the same message — we never confirm whether an email is registered. Links expire in 60 minutes and work once.",
    resetTitle: "Choose a new password", resetSubtitle: "Use at least 8 characters. After saving, sign in with your new password.",
    backToSignIn: "Back to sign in", passwordUpdatedSignIn: "Password updated. Please sign in.",
    devResetNote: "Development only — no mail server; use this link:", sessionsRevoked: "Other sessions were signed out for security.",
    resetFailed: "Reset link invalid or expired", sendResetFailed: "Could not send reset link",
    brandTagline: "Learn AI by doing.\nLevel up by sharing.", sell1: "Share what you built", sell2: "Get peer feedback", sell3: "Earn XP & badges",
    onboardWelcomeTitle: "Welcome, {name}!", onboardWelcomeSub: "You're in. Here's how AI Skill Bridge helps you learn by doing and grow with your team.",
    onboardStep1Title: "Pick a project", onboardStep1Body: "Choose hands-on tasks with clear steps. Complete work, earn XP, and build real AI skills.",
    onboardStep2Title: "Share & get feedback", onboardStep2Body: "Post what you built and receive thoughtful peer evaluations — the fastest way to improve.",
    onboardStep3Title: "Level up together", onboardStep3Body: "Track streaks, unlock badges, and see what colleagues are building on the team showcase.",
    onboardNext: "Next", onboardStart: "Get started", onboardSkip: "Skip for now", onboardStartHacking: "Start Hacking",
    exerciseWhatIsPromptingTitle: "What is prompting and why you need it?",
    exerciseSubmit: "SUBMIT",
    notifs: "Notifications",
  },
  cs: {
    home: "Domů", projects: "Projekty", peerEvaluation: "Peer hodnocení",
    search: "Hledat projekty, nástroje, lidi…",
    settings: "Nastavení", account: "Účet", appearance: "Vzhled", language: "Jazyk",
    theme: "Motiv", light: "Světlý", dark: "Tmavý", accent: "Akcentová barva", signout: "Odhlásit se",
    editProfile: "Upravit profil", displayName: "Zobrazené jméno", role: "Oddělení / role", save: "Uložit změny", saved: "Uloženo ✓", member: "Členem od",
    welcome: "Vítej zpět", tagline: "Uč se AI děláním. Posouvej se sdílením.",
    level: "Úroveň", xpToNext: "do další úrovně", projectsDone: "Splněné projekty", evalsGiven: "Daná hodnocení",
    streak: "Série", days: "dní", badges: "Úspěchy", learningPath: "Tvoje cesta učení", recentActivity: "Nedávná aktivita",
    basics: "Základy", prompting: "Prompty", toolsStep: "Nástroje", sharing: "Sdílení", mentor: "Mentor", youAreHere: "jsi tady", nextLevel: "Další: Úroveň 8 · Tvůrce",
    showcaseTitle: "Týmová výkladní skříň", showcaseSub: "Co kolegové vytvořili s AI",
    share: "Sdílet výsledek", evaluate: "Ohodnotit", view: "Zobrazit", evals: "hodnocení", helpful: "Bylo to užitečné?",
    toolsUsed: "Nástroje", featuredTag: "Nejužitečnější tento týden", yourWeek: "Tvůj týden", peersWaiting: "2 kolegové čekají na zpětnou vazbu",
    trending: "Oblíbené nástroje", filter: "Filtrovat", allDepts: "Všechny týmy", anyTool: "Jakýkoli nástroj", anyTask: "Jakýkoli typ projektu",
    results: "výsledků", clear: "zrušit", noMatch: "Nic neodpovídá — zrušte filtr.", ago: "zpět",
    projectsTitle: "Projekty", active: "aktivní", newTask: "Nový úkol", reward: "odměna", steps: "Kroky",
    submit: "Odevzdat práci", ready: "Označit k revizi", matched: "Spárováno s kolegou",
    groupName: "Marketingový tým", members: "Členové", weeklyGoal: "Týdenní cíl týmu", sharedWork: "Sdílené projekty", teamActivity: "Aktivita týmu",
    combinedXp: "Společné XP", contribute: "Přispět", goalDesc: "Splnit společně 20 projektů tento měsíc", joined: "se připojil",
    welcomeBack: "Vítej zpět", joinUs: "Přidej se na bridge", signin: "Přihlásit se", register: "Vytvořit účet", email: "Pracovní e-mail", password: "Heslo",
    passwordHint: "Alespoň 8 znaků", forgot: "Zapomněli jste heslo?", or: "nebo", sso: "Pokračovat přes Microsoft", newHere: "Jste tu nově?", alreadyHaveAccount: "Už máš účet?",
    registerFailed: "Registrace se nezdařila", loginFailed: "Přihlášení se nezdařilo",
    security: "Zabezpečení", changePassword: "Změnit heslo", currentPassword: "Současné heslo", newPassword: "Nové heslo", confirmPassword: "Potvrzení hesla",
    passwordMismatch: "Hesla se neshodují", changePasswordFailed: "Heslo se nepodařilo změnit", passwordChanged: "Heslo změněno",
    sendResetLink: "Poslat odkaz e-mailem", resetLinkSent: "Pokud účet existuje, poslali jsme instrukce k obnovení.",
    forgotTitle: "Obnovení hesla", forgotSubtitle: "Zadej pracovní e-mail. Pošleme jednorázový bezpečný odkaz.",
    forgotTrustTitle: "Soukromí a bezpečí", forgotTrustBody: "Kvůli ochraně vždy zobrazíme stejnou zprávu — nikdy nepotvrzujeme, zda je e-mail registrovaný. Odkaz vyprší za 60 minut a funguje jednou.",
    resetTitle: "Nové heslo", resetSubtitle: "Minimálně 8 znaků. Po uložení se přihlas novým heslem.",
    backToSignIn: "Zpět na přihlášení", passwordUpdatedSignIn: "Heslo změněno. Přihlas se prosím.",
    devResetNote: "Jen pro vývoj — bez mail serveru; použij tento odkaz:", sessionsRevoked: "Ostatní relace byly z bezpečnostních důvodů odhlášeny.",
    resetFailed: "Odkaz je neplatný nebo vypršel", sendResetFailed: "Odkaz se nepodařilo odeslat",
    brandTagline: "Uč se AI děláním.\nPosouvej se sdílením.", sell1: "Sdílej, co jsi vytvořil", sell2: "Získej zpětnou vazbu", sell3: "Sbírej XP a odznaky",
    onboardWelcomeTitle: "Vítej, {name}!", onboardWelcomeSub: "Jsi uvnitř. Tady je, jak ti AI Skill Bridge pomůže učit se praxí a růst s týmem.",
    onboardStep1Title: "Vyber projekt", onboardStep1Body: "Praktické úkoly s jasnými kroky. Plň je, sbírej XP a buduj skutečné AI dovednosti.",
    onboardStep2Title: "Sdílej a získej zpětnou vazbu", onboardStep2Body: "Ukaž, co jsi vytvořil, a dostaneš promyšlené hodnocení od kolegů — nejrychlejší cesta ke zlepšení.",
    onboardStep3Title: "Růst společně", onboardStep3Body: "Sleduj série, odemykej odznaky a inspiruj se tím, co tým sdílí na výkladní skříni.",
    onboardNext: "Další", onboardStart: "Začít", onboardSkip: "Přeskočit", onboardStartHacking: "Začít hackovat",
    exerciseWhatIsPromptingTitle: "Co je prompting a proč ho potřebuješ?",
    exerciseSubmit: "ODESLAT",
    notifs: "Oznámení",
  },
  de: {
    home: "Start", projects: "Projekte", peerEvaluation: "Peer-Bewertung",
    search: "Projekte, Tools, Personen suchen…",
    settings: "Einstellungen", account: "Konto", appearance: "Darstellung", language: "Sprache",
    theme: "Modus", light: "Hell", dark: "Dunkel", accent: "Akzentfarbe", signout: "Abmelden",
    editProfile: "Profil bearbeiten", displayName: "Anzeigename", role: "Abteilung / Rolle", save: "Änderungen speichern", saved: "Gespeichert ✓", member: "Mitglied seit",
    welcome: "Willkommen zurück", tagline: "Lerne KI durch Tun. Steig auf durch Teilen.",
    level: "Level", xpToNext: "bis nächstes Level", projectsDone: "Abgeschlossene Projekte", evalsGiven: "Bewertungen",
    streak: "Serie", days: "Tage", badges: "Erfolge", learningPath: "Dein Lernpfad", recentActivity: "Letzte Aktivität",
    basics: "Grundlagen", prompting: "Prompting", toolsStep: "Tools", sharing: "Teilen", mentor: "Mentor", youAreHere: "du bist hier", nextLevel: "Nächstes: Level 8 · Builder",
    showcaseTitle: "Team-Schaufenster", showcaseSub: "Was Kollegen mit KI gebaut haben",
    share: "Ergebnis teilen", evaluate: "Bewerten", view: "Ansehen", evals: "Bewert.", helpful: "War das hilfreich?",
    toolsUsed: "Tools", featuredTag: "Diese Woche am hilfreichsten", yourWeek: "Deine Woche", peersWaiting: "2 Kollegen warten auf dein Feedback",
    trending: "Beliebte Tools", filter: "Feed filtern", allDepts: "Alle Teams", anyTool: "Beliebiges Tool", anyTask: "Beliebiger Projekttyp",
    results: "Ergebnisse", clear: "zurücksetzen", noMatch: "Keine Treffer — Filter zurücksetzen.", ago: "her",
    projectsTitle: "Projekte", active: "aktiv", newTask: "Neue Aufgabe", reward: "Belohnung", steps: "Schritte",
    submit: "Arbeit einreichen", ready: "Zur Prüfung markieren", matched: "Mit Kollege gematcht",
    groupName: "Marketing-Team", members: "Mitglieder", weeklyGoal: "Wöchentliches Teamziel", sharedWork: "Geteilte Projekte", teamActivity: "Team-Aktivität",
    combinedXp: "Gesamt-XP", contribute: "Beitragen", goalDesc: "Gemeinsam 20 Projekte diesen Monat", joined: "beigetreten",
    welcomeBack: "Willkommen zurück", joinUs: "Werde Teil der Bridge", signin: "Anmelden", register: "Konto erstellen", email: "Arbeits-E-Mail", password: "Passwort",
    passwordHint: "Mindestens 8 Zeichen", forgot: "Passwort vergessen?", or: "oder", sso: "Mit Microsoft fortfahren", newHere: "Neu hier?", alreadyHaveAccount: "Schon ein Konto?",
    registerFailed: "Registrierung fehlgeschlagen", loginFailed: "Anmeldung fehlgeschlagen",
    security: "Sicherheit", changePassword: "Passwort ändern", currentPassword: "Aktuelles Passwort", newPassword: "Neues Passwort", confirmPassword: "Passwort bestätigen",
    passwordMismatch: "Passwörter stimmen nicht überein", changePasswordFailed: "Passwort konnte nicht geändert werden", passwordChanged: "Passwort aktualisiert",
    sendResetLink: "Reset-Link per E-Mail", resetLinkSent: "Falls ein Konto existiert, haben wir Anweisungen gesendet.",
    forgotTitle: "Passwort zurücksetzen", forgotSubtitle: "Arbeits-E-Mail eingeben. Wir senden einen einmaligen sicheren Link.",
    forgotTrustTitle: "Datenschutz & Sicherheit", forgotTrustBody: "Zum Schutz zeigen wir immer dieselbe Meldung — wir bestätigen nie, ob eine E-Mail registriert ist. Links laufen nach 60 Minuten ab und gelten einmal.",
    resetTitle: "Neues Passwort wählen", resetSubtitle: "Mindestens 8 Zeichen. Danach mit dem neuen Passwort anmelden.",
    backToSignIn: "Zurück zur Anmeldung", passwordUpdatedSignIn: "Passwort aktualisiert. Bitte anmelden.",
    devResetNote: "Nur Entwicklung — kein Mailserver; diesen Link verwenden:", sessionsRevoked: "Andere Sitzungen wurden aus Sicherheitsgründen beendet.",
    resetFailed: "Link ungültig oder abgelaufen", sendResetFailed: "Reset-Link konnte nicht gesendet werden",
    brandTagline: "Lerne KI durch Tun.\nSteig auf durch Teilen.", sell1: "Teile, was du gebaut hast", sell2: "Erhalte Peer-Feedback", sell3: "Sammle XP & Abzeichen",
    onboardWelcomeTitle: "Willkommen, {name}!", onboardWelcomeSub: "Du bist drin. So hilft dir AI Skill Bridge beim Lernen durch Tun und beim Wachsen im Team.",
    onboardStep1Title: "Projekt wählen", onboardStep1Body: "Praxisaufgaben mit klaren Schritten. Erledige sie, sammle XP und baue echte KI-Fähigkeiten auf.",
    onboardStep2Title: "Teilen & Feedback", onboardStep2Body: "Zeig, was du gebaut hast, und erhalte durchdachtes Peer-Feedback — der schnellste Weg zur Verbesserung.",
    onboardStep3Title: "Gemeinsam aufsteigen", onboardStep3Body: "Verfolge Serien, schalte Abzeichen frei und sieh, was Kollegen in der Team-Schaufenster teilen.",
    onboardNext: "Weiter", onboardStart: "Loslegen", onboardSkip: "Überspringen", onboardStartHacking: "Loslegen",
    exerciseWhatIsPromptingTitle: "Was ist Prompting und warum brauchst du es?",
    exerciseSubmit: "ABSENDEN",
    notifs: "Benachrichtigungen",
  },
  uk: {
    home: "Головна", projects: "Проєкти", peerEvaluation: "Peer-оцінювання",
    search: "Шукати проєкти, інструменти, людей…",
    settings: "Налаштування", account: "Обліковий запис", appearance: "Вигляд", language: "Мова",
    theme: "Тема", light: "Світла", dark: "Темна", accent: "Акцентний колір", signout: "Вийти",
    editProfile: "Редагувати профіль", displayName: "Ім'я для показу", role: "Відділ / роль", save: "Зберегти зміни", saved: "Збережено ✓", member: "Учасник з",
    welcome: "З поверненням", tagline: "Вивчай ШІ на практиці. Зростай, ділячись.",
    level: "Рівень", xpToNext: "до наступного рівня", projectsDone: "Виконано проєктів", evalsGiven: "Надано оцінок",
    streak: "Серія", days: "днів", badges: "Досягнення", learningPath: "Твій шлях навчання", recentActivity: "Остання активність",
    basics: "Основи", prompting: "Промпти", toolsStep: "Інструменти", sharing: "Обмін", mentor: "Ментор", youAreHere: "ти тут", nextLevel: "Далі: Рівень 8 · Творець",
    showcaseTitle: "Вітрина команди", showcaseSub: "Що колеги створили за допомогою ШІ",
    share: "Поділитися результатом", evaluate: "Оцінити", view: "Переглянути", evals: "оцінок", helpful: "Чи було це корисно?",
    toolsUsed: "Інструменти", featuredTag: "Найкорисніше цього тижня", yourWeek: "Твій тиждень", peersWaiting: "2 колеги чекають на твій відгук",
    trending: "Популярні інструменти", filter: "Фільтрувати", allDepts: "Усі команди", anyTool: "Будь-який інструмент", anyTask: "Будь-який тип проєкту",
    results: "результатів", clear: "очистити", noMatch: "Нічого не знайдено — змініть фільтр.", ago: "тому",
    projectsTitle: "Проєкти", active: "активних", newTask: "Нове завдання", reward: "винагорода", steps: "Кроки",
    submit: "Надіслати роботу", ready: "Позначити готовим до перевірки", matched: "Підібрано колегу",
    groupName: "Маркетингова команда", members: "Учасники", weeklyGoal: "Тижнева мета команди", sharedWork: "Спільні проєкти", teamActivity: "Активність команди",
    combinedXp: "Спільний XP", contribute: "Долучитися", goalDesc: "Виконати разом 20 проєктів цього місяця", joined: "приєднався",
    welcomeBack: "З поверненням", joinUs: "Приєднуйся до bridge", signin: "Увійти", register: "Створити акаунт", email: "Робоча пошта", password: "Пароль",
    passwordHint: "Щонайменше 8 символів", forgot: "Забули пароль?", or: "або", sso: "Продовжити через Microsoft", newHere: "Вперше тут?", alreadyHaveAccount: "Уже маєш акаунт?",
    registerFailed: "Реєстрація не вдалася", loginFailed: "Вхід не вдався",
    security: "Безпека", changePassword: "Змінити пароль", currentPassword: "Поточний пароль", newPassword: "Новий пароль", confirmPassword: "Підтвердження пароля",
    passwordMismatch: "Паролі не збігаються", changePasswordFailed: "Не вдалося оновити пароль", passwordChanged: "Пароль оновлено",
    sendResetLink: "Надіслати посилання на пошту", resetLinkSent: "Якщо акаунт існує, ми надіслали інструкції.",
    forgotTitle: "Скидання пароля", forgotSubtitle: "Введи робочу пошту. Надішлемо одноразове безпечне посилання.",
    forgotTrustTitle: "Конфіденційність і безпека", forgotTrustBody: "Захищаючи вас, ми завжди показуємо однакове повідомлення — ніколи не підтверджуємо, чи зареєстрована пошта. Посилання діє 60 хвилин і один раз.",
    resetTitle: "Новий пароль", resetSubtitle: "Щонайменше 8 символів. Після збереження увійди з новим паролем.",
    backToSignIn: "Назад до входу", passwordUpdatedSignIn: "Пароль оновлено. Увійди, будь ласка.",
    devResetNote: "Лише для розробки — без поштового сервера; використай це посилання:", sessionsRevoked: "Інші сесії завершено з міркувань безпеки.",
    resetFailed: "Посилання недійсне або прострочене", sendResetFailed: "Не вдалося надіслати посилання",
    brandTagline: "Вивчай ШІ на практиці.\nЗростай, ділячись.", sell1: "Ділися тим, що створив", sell2: "Отримуй відгуки колег", sell3: "Заробляй XP та бейджі",
    onboardWelcomeTitle: "Вітаємо, {name}!", onboardWelcomeSub: "Ти в системі. Ось як AI Skill Bridge допомагає вчитися на практиці та рости з командою.",
    onboardStep1Title: "Обери проєкт", onboardStep1Body: "Практичні завдання з чіткими кроками. Виконуй їх, заробляй XP і будуй справжні навички з ШІ.",
    onboardStep2Title: "Ділися та отримуй відгук", onboardStep2Body: "Покажи, що створив, і отримай змістовну peer-оцінку — найшвидший шлях до покращення.",
    onboardStep3Title: "Рости разом", onboardStep3Body: "Відстежуй серії, відкривай бейджі та дивись, що команда ділиться на вітрині.",
    onboardNext: "Далі", onboardStart: "Почати", onboardSkip: "Пропустити", onboardStartHacking: "Почати хакати",
    exerciseWhatIsPromptingTitle: "Що таке промптинг і навіщо він тобі?",
    exerciseSubmit: "НАДІСЛАТИ",
    notifs: "Сповіщення",
  },
};



/* ---------- i18n helpers + extended copy ---------- */
const LANG_META = {
  en: { short: "EN", native: "English" },
  cs: { short: "CZ", native: "Čeština" },
  de: { short: "DE", native: "Deutsch" },
  uk: { short: "UA", native: "Українська" },
};
function fmtText(raw, vars = {}) {
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
function tx(dict, lang, key, vars) {
  const raw = (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || key;
  return vars ? fmtText(raw, vars) : raw;
}
function lx(value, lang) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[lang] || value.en || value.cs || Object.values(value)[0] || "";
  }
  return value;
}

Object.assign(DICT.en, {
  appName: "AI Skill Bridge",
  aiUsage: "AI usage", thisMonth: "this month", usageLine: "queries · ≈ 0.9 kWh · 4.1 L water", teamBudgetTips: "42% of team budget · tips ↓",
  memberDate: "Mar 2026", tweaks: "Tweaks", density: "Density", compact: "compact", regular: "regular", comfy: "comfy", darkMode: "Dark mode",
  authMethod: "42 Prague method · no teachers · learn by doing",
  profileXpLine: "340 / 500 XP → L8 · Builder", resultScreenshot: "project result / screenshot", featuredResult: "featured project result",
  "dept.hr": "HR", "dept.finance": "Finance", "dept.marketing": "Marketing", "dept.ops": "Operations", "dept.sales": "Sales",
  "task.reporting": "Reporting", "task.summarize": "Summarize", "task.content": "Content", "task.chatbot": "Chatbot", "task.automation": "Automation",
  feed1Title: "Invoice auto-sorting flow", feed2Title: "Onboarding FAQ bot for new hires", feed3Title: "Campaign copy A/B in one afternoon", feed4Title: "Policy summary in plain words", feed5Title: "Meeting notes → action items", featuredTitle: "Sales forecast explained in plain language",
  projectsSub: "Pick a project · learn by doing · close it and get peer-reviewed.", completed: "completed", yourLevel: "your level",
  filterAll: "All", noProjectsInView: "No projects in this view.", difficultyTitle: "Difficulty {n}/3",
  projectStatusGo: "Available", projectStatusDoing: "In progress", projectStatusReview: "In review", projectStatusDone: "Completed", projectStatusLock: "Locked",
  catBasics: "Basics", catPrompting: "Prompting", catSummarize: "Summarize", catReporting: "Reporting", catContent: "Content", catChatbot: "Chatbot", catAutomation: "Automation",
  p0Title: "AI Foundations — pick the right tool", p1Title: "Prompting that doesn't waste tokens", p2Title: "Summarize a long PDF — accurately", p3Title: "Draft a monthly report with AI", p4Title: "Clean up a slide deck — on brand", p5Title: "Build a team FAQ assistant", p6Title: "Automate a repetitive workflow",
  p0Obj1: "Map 5 everyday tasks to the right kind of AI tool", p0Obj2: "Explain when NOT to use AI", p0Obj3: "Log one tool you tried for the first time",
  p1Obj1: "Write a prompt with role + context + format", p1Obj2: "Cut one bloated prompt in half, same result", p1Obj3: "Note the compute/water saved",
  p2Obj1: "Pull the 5 key points from a 30-page doc", p2Obj2: "Verify each point against the source", p2Obj3: "Flag one thing the AI got wrong",
  p3Obj1: "Turn raw figures into a 2-minute manager summary", p3Obj2: "Keep one chart, drop the rest", p3Obj3: "Add a 'what changed vs last month' line",
  p4Obj1: "Make 20 messy slides consistent", p4Obj2: "One message per slide", p4Obj3: "Match the brand voice",
  p5Obj1: "Collect 20 real questions from the team", p5Obj2: "Ground answers in your own docs", p5Obj3: "Test it with a colleague",
  p6Obj1: "Find a task you do every week", p6Obj2: "Draft the automation steps", p6Obj3: "Measure the time saved",
  p0Note: "Made a little cheat-sheet of which tool for which job.", p1Note: "Shorter prompts → same answer, ~40% fewer tokens.", p4Note: "Used Gamma for layout, Claude for tightening copy.",
  p0Fb: "Clear mapping — loved the cheat-sheet.", p1Fb: "Great efficiency mindset.",
  needs: "Needs", noPrereq: "— nothing, open to all", subjectHow: "📄 Subject — how to do it", hide: "hide ▴", show: "show ▾",
  objectivesEval: "Objectives you'll be evaluated on:", suggestedTools: "Suggested tools", fullBrief: "full brief.pdf — examples, dataset & rubric",
  yourNotes: "Your notes", unlocksWhenStart: "(unlocks when you start)", notesPlaceholder: "Jot tools tried, prompts, what worked…", yourGrade: "Your grade",
  waitingPeerEval: "Waiting for peer evaluation", slotsOpenBooked: "{open} slots open · {booked} booked", autoMatchPeer: "We auto-match a peer who finished the same project.", peerBookedSlot: "A peer booked a slot.", openMoreSlots: "Open more slots to get matched faster.", manageEvalSlots: "Manage evaluation slots",
  finishPrereqOne: "Finish {count} prerequisite first", finishPrereqMany: "Finish {count} prerequisites first", startProject: "Start project", saveNotes: "Save notes", closeRequestEval: "Close & request evaluation →", reopenSubmission: "Re-open submission", retryImprove: "Retry to improve",
  toastStarted: "Project started", toastNotesSaved: "Notes saved", toastReopened: "Re-opened — submission withdrawn", toastRetry: "Re-attempt started", toastLocked: "Locked — finish its prerequisites first", toastClosedEval: "Project closed — peer evaluation requested", toastAvailability: "Availability updated",
  closeProjectSlots: "Close project & open evaluation slots", cancel: "Cancel", done: "Done", evalSlots: "Evaluation slots",
  openSlotRequestOne: "Open {count} slot & request review →", openSlotRequestMany: "Open {count} slots & request review →", closeProjectHelp: "When you close a project it enters peer review. Pick the times you're free — a peer who finished {cat} work can book one of your open slots.", openAvailabilityWeek: "Open your availability this week", availabilityHelp: "Open or close the times you're available for an evaluator to book.", tapCell: "tap a cell to open / close your availability",
  open: "open", booked: "booked", closed: "closed", bookedBy: "Booked by {by}", openClickClose: "Open — click to close", clickOpenSlot: "Click to open this slot",
  dayMon: "Mon", dayTue: "Tue", dayWed: "Wed", dayThu: "Thu", dayFri: "Fri",
  peerEvalSub: "Review colleagues’ submitted work, confirm received feedback, and manage your evaluation availability.", toEvaluate: "To evaluate", myReviews: "My reviews", availability: "Availability", peersWaitingStat: "Peers waiting", confirmedReviews: "Confirmed reviews", openSlots: "Open slots",
  reviewBooked: "booked", reviewOpen: "open", reviewClosed: "closed", startEvaluation: "Start evaluation", submitEvaluation: "Submit evaluation", confirmHelpful: "Confirm helpful", confirmedLabel: "confirmed", needsConfirmation: "needs confirmation", rubric: "Rubric", evidence: "Evidence", feedback: "Feedback", feedbackPh: "Write one concrete strength and one improvement suggestion…", noQueue: "No pending peer evaluations.", manageAvailability: "Open the times when you are available for a peer review call. Booked slots stay locked.",
  reviewXp: "+40 XP / review", pending: "pending", autoMatchedSubmissions: "auto-matched submissions", feedbackLoopsClosed: "feedback loops closed", slotNotBooked: "slot not booked", submittedResult: "submitted result / shared link", passesRubric: "passes rubric",
  evalSentToast: "Evaluation sent · XP pending confirmation", feedbackConfirmedToast: "Feedback confirmed · XP released", receivedFeedbackQuote: "Clear output, good prompt iteration. Next time add source checks before finalizing.", defaultEvalFeedback: "Strong structure and clear summary. Add one explicit source check before submission.", correctness: "Correctness", clarity: "Clarity", responsibleAiUse: "Responsible AI use",
  peerQ1Project: "Summarize a long PDF", peerQ2Project: "Draft a monthly report", peerQ3Project: "Clean up a slide deck", age12min: "12 min", age1h: "1 h", age3h: "3 h", bookedToday1500: "Today 15:00", bookedTomorrow1000: "Tomorrow 10:00",
  review1Project: "Campaign copy A/B", review2Project: "Brand voice guide", review3Project: "Event recap deck",
});
Object.assign(DICT.cs, {
  appName: "AI Skill Bridge",
  aiUsage: "Využití AI", thisMonth: "tento měsíc", usageLine: "dotazy · ≈ 0,9 kWh · 4,1 l vody", teamBudgetTips: "42 % týmového rozpočtu · tipy ↓",
  memberDate: "bře 2026", tweaks: "Úpravy", density: "Hustota", compact: "kompaktní", regular: "běžná", comfy: "pohodlná", darkMode: "Tmavý režim",
  authMethod: "Metoda 42 Prague · bez učitelů · učení praxí",
  profileXpLine: "340 / 500 XP → L8 · Tvůrce", resultScreenshot: "výsledek projektu / screenshot", featuredResult: "výsledek vybraného projektu",
  "dept.hr": "HR", "dept.finance": "Finance", "dept.marketing": "Marketing", "dept.ops": "Provoz", "dept.sales": "Obchod",
  "task.reporting": "Reporting", "task.summarize": "Shrnutí", "task.content": "Obsah", "task.chatbot": "Chatbot", "task.automation": "Automatizace",
  feed1Title: "Automatické třídění faktur", feed2Title: "FAQ bot pro onboarding nových kolegů", feed3Title: "A/B copy kampaně během jednoho odpoledne", feed4Title: "Shrnutí směrnice jednoduchým jazykem", feed5Title: "Zápis ze schůzky → akční body", featuredTitle: "Prodejní forecast vysvětlený jednoduchým jazykem",
  projectsSub: "Vyber projekt · uč se praxí · uzavři ho a získej peer hodnocení.", completed: "dokončeno", yourLevel: "tvoje úroveň",
  filterAll: "Vše", noProjectsInView: "V tomto pohledu nejsou žádné projekty.", difficultyTitle: "Obtížnost {n}/3",
  projectStatusGo: "Dostupné", projectStatusDoing: "Rozpracováno", projectStatusReview: "V hodnocení", projectStatusDone: "Dokončeno", projectStatusLock: "Zamčeno",
  catBasics: "Základy", catPrompting: "Promptování", catSummarize: "Shrnutí", catReporting: "Reporting", catContent: "Obsah", catChatbot: "Chatbot", catAutomation: "Automatizace",
  p0Title: "Základy AI — vyber správný nástroj", p1Title: "Promptování, které neplýtvá tokeny", p2Title: "Přesné shrnutí dlouhého PDF", p3Title: "Měsíční report s pomocí AI", p4Title: "Upravit prezentaci podle brandu", p5Title: "Postavit týmového FAQ asistenta", p6Title: "Automatizovat opakující se workflow",
  p0Obj1: "Přiřaď 5 běžných úkolů ke správnému typu AI nástroje", p0Obj2: "Vysvětli, kdy AI NEPOUŽÍVAT", p0Obj3: "Zapiš jeden nástroj, který jsi zkusil/a poprvé",
  p1Obj1: "Napiš prompt s rolí + kontextem + formátem", p1Obj2: "Zkrať rozvláčný prompt na polovinu se stejným výsledkem", p1Obj3: "Zapiš ušetřený výpočetní výkon/vodu",
  p2Obj1: "Vytáhni 5 hlavních bodů z 30stránkového dokumentu", p2Obj2: "Ověř každý bod vůči zdroji", p2Obj3: "Označ jednu věc, ve které se AI spletla",
  p3Obj1: "Převeď surová čísla do dvouminutového manažerského shrnutí", p3Obj2: "Nech jeden graf, zbytek vyřaď", p3Obj3: "Doplň větu „co se změnilo proti minulému měsíci“",
  p4Obj1: "Sjednoť 20 neuspořádaných slidů", p4Obj2: "Jedna zpráva na jeden slide", p4Obj3: "Dodrž tón značky",
  p5Obj1: "Sesbírej 20 reálných otázek z týmu", p5Obj2: "Ukotvi odpovědi ve vlastních dokumentech", p5Obj3: "Otestuj asistenta s kolegou/kolegyní",
  p6Obj1: "Najdi úkol, který děláš každý týden", p6Obj2: "Navrhni kroky automatizace", p6Obj3: "Změř ušetřený čas",
  p0Note: "Vytvořila jsem krátký tahák, který nástroj se hodí na jakou práci.", p1Note: "Kratší prompty → stejná odpověď, asi o 40 % méně tokenů.", p4Note: "Gamma jsem použila na layout, Claude na zpřesnění textu.",
  p0Fb: "Jasné mapování — tahák se mi líbil.", p1Fb: "Skvělý důraz na efektivitu.",
  needs: "Potřeba", noPrereq: "— nic, otevřeno všem", subjectHow: "📄 Zadání — jak na to", hide: "skrýt ▴", show: "zobrazit ▾",
  objectivesEval: "Cíle, podle kterých budeš hodnocen/a:", suggestedTools: "Doporučené nástroje", fullBrief: "celé zadání.pdf — příklady, data a rubrika",
  yourNotes: "Tvoje poznámky", unlocksWhenStart: "(odemkne se po startu)", notesPlaceholder: "Zapiš zkoušené nástroje, prompty a co fungovalo…", yourGrade: "Tvoje známka",
  waitingPeerEval: "Čeká na peer hodnocení", slotsOpenBooked: "{open} volných slotů · {booked} rezervováno", autoMatchPeer: "Automaticky přiřadíme kolegu/kolegyni, který/á dokončil/a stejný projekt.", peerBookedSlot: "Kolega/kolegyně si rezervoval/a slot.", openMoreSlots: "Otevři více slotů, hodnocení přijde rychleji.", manageEvalSlots: "Spravovat hodnoticí sloty",
  finishPrereqOne: "Nejdřív dokonči {count} předpoklad", finishPrereqMany: "Nejdřív dokonči {count} předpoklady", startProject: "Začít projekt", saveNotes: "Uložit poznámky", closeRequestEval: "Uzavřít a požádat o hodnocení →", reopenSubmission: "Znovu otevřít odevzdání", retryImprove: "Zkusit zlepšit výsledek",
  toastStarted: "Projekt spuštěn", toastNotesSaved: "Poznámky uloženy", toastReopened: "Znovu otevřeno — odevzdání staženo", toastRetry: "Nový pokus spuštěn", toastLocked: "Zamčeno — nejdřív dokonči předpoklady", toastClosedEval: "Projekt uzavřen — peer hodnocení vyžádáno", toastAvailability: "Dostupnost aktualizována",
  closeProjectSlots: "Uzavřít projekt a otevřít hodnoticí sloty", cancel: "Zrušit", done: "Hotovo", evalSlots: "Hodnoticí sloty",
  openSlotRequestOne: "Otevřít {count} slot a požádat o hodnocení →", openSlotRequestMany: "Otevřít {count} slotů a požádat o hodnocení →", closeProjectHelp: "Po uzavření projekt přejde do peer hodnocení. Vyber časy, kdy máš prostor — kolega/kolegyně, který/á dokončil/a práci typu {cat}, si může rezervovat jeden z otevřených slotů.", openAvailabilityWeek: "Otevři dostupnost na tento týden", availabilityHelp: "Otevři nebo zavři časy, kdy jsi dostupný/dostupná pro hodnotitele.", tapCell: "klepnutím otevřeš / zavřeš dostupnost",
  open: "volné", booked: "rezervováno", closed: "zavřeno", bookedBy: "Rezervoval/a {by}", openClickClose: "Volné — kliknutím zavřít", clickOpenSlot: "Kliknutím otevřít slot",
  dayMon: "Po", dayTue: "Út", dayWed: "St", dayThu: "Čt", dayFri: "Pá",
  peerEvalSub: "Hodnoť odevzdanou práci kolegů, potvrzuj přijatou zpětnou vazbu a spravuj dostupnost pro hodnocení.", toEvaluate: "K hodnocení", myReviews: "Moje hodnocení", availability: "Dostupnost", peersWaitingStat: "Čeká na hodnocení", confirmedReviews: "Potvrzená hodnocení", openSlots: "Volné sloty",
  reviewBooked: "rezervováno", reviewOpen: "volné", reviewClosed: "zavřeno", startEvaluation: "Začít hodnocení", submitEvaluation: "Odeslat hodnocení", confirmHelpful: "Potvrdit užitečnost", confirmedLabel: "potvrzeno", needsConfirmation: "čeká na potvrzení", rubric: "Rubrika", evidence: "Podklad", feedback: "Zpětná vazba", feedbackPh: "Napiš jednu konkrétní silnou stránku a jedno doporučení ke zlepšení…", noQueue: "Žádná čekající peer hodnocení.", manageAvailability: "Otevři časy, kdy jsi dostupný/dostupná pro peer review. Rezervované sloty zůstávají zamčené.",
  reviewXp: "+40 XP / hodnocení", pending: "čeká", autoMatchedSubmissions: "automaticky přiřazená odevzdání", feedbackLoopsClosed: "uzavřené zpětnovazební smyčky", slotNotBooked: "slot není rezervován", submittedResult: "odevzdaný výsledek / sdílený odkaz", passesRubric: "splňuje rubriku",
  evalSentToast: "Hodnocení odesláno · XP čeká na potvrzení", feedbackConfirmedToast: "Zpětná vazba potvrzena · XP uvolněno", receivedFeedbackQuote: "Jasný výstup, dobrá iterace promptu. Příště před dokončením doplň kontrolu zdrojů.", defaultEvalFeedback: "Silná struktura a jasné shrnutí. Před odevzdáním doplň jednu explicitní kontrolu zdroje.", correctness: "Správnost", clarity: "Srozumitelnost", responsibleAiUse: "Odpovědné použití AI",
  peerQ1Project: "Shrnout dlouhé PDF", peerQ2Project: "Vytvořit měsíční report", peerQ3Project: "Upravit prezentaci", age12min: "12 min", age1h: "1 h", age3h: "3 h", bookedToday1500: "Dnes 15:00", bookedTomorrow1000: "Zítra 10:00",
  review1Project: "A/B copy kampaně", review2Project: "Průvodce tónem značky", review3Project: "Prezentace z rekapitulace akce",
});
Object.assign(DICT.de, {
  appName: "AI Skill Bridge",
  aiUsage: "KI-Nutzung", thisMonth: "diesen Monat", usageLine: "Anfragen · ≈ 0,9 kWh · 4,1 l Wasser", teamBudgetTips: "42 % des Team-Budgets · Tipps ↓",
  memberDate: "Mär 2026", tweaks: "Anpassungen", density: "Dichte", compact: "kompakt", regular: "normal", comfy: "bequem", darkMode: "Dunkelmodus",
  authMethod: "42-Prague-Methode · keine Lehrkräfte · Lernen durch Tun",
  profileXpLine: "340 / 500 XP → L8 · Builder", resultScreenshot: "Projektergebnis / Screenshot", featuredResult: "ausgewähltes Projektergebnis",
  "dept.hr": "HR", "dept.finance": "Finanzen", "dept.marketing": "Marketing", "dept.ops": "Operations", "dept.sales": "Sales",
  "task.reporting": "Reporting", "task.summarize": "Zusammenfassen", "task.content": "Content", "task.chatbot": "Chatbot", "task.automation": "Automatisierung",
  feed1Title: "Automatischer Workflow zur Rechnungssortierung", feed2Title: "Onboarding-FAQ-Bot für neue Mitarbeitende", feed3Title: "Kampagnen-Copy-A/B an einem Nachmittag", feed4Title: "Richtlinie in einfachen Worten", feed5Title: "Meetingnotizen → Aufgaben", featuredTitle: "Sales Forecast einfach erklärt",
  projectsSub: "Wähle ein Projekt · lerne durch Tun · schließe es ab und erhalte Peer-Review.", completed: "abgeschlossen", yourLevel: "dein Level",
  filterAll: "Alle", noProjectsInView: "Keine Projekte in dieser Ansicht.", difficultyTitle: "Schwierigkeit {n}/3",
  projectStatusGo: "Verfügbar", projectStatusDoing: "In Bearbeitung", projectStatusReview: "In Review", projectStatusDone: "Abgeschlossen", projectStatusLock: "Gesperrt",
  catBasics: "Grundlagen", catPrompting: "Prompting", catSummarize: "Zusammenfassen", catReporting: "Reporting", catContent: "Content", catChatbot: "Chatbot", catAutomation: "Automatisierung",
  p0Title: "KI-Grundlagen — das richtige Tool wählen", p1Title: "Prompting ohne Token-Verschwendung", p2Title: "Langes PDF präzise zusammenfassen", p3Title: "Monatsbericht mit KI erstellen", p4Title: "Foliensatz markenkonform bereinigen", p5Title: "Team-FAQ-Assistent bauen", p6Title: "Wiederkehrenden Workflow automatisieren",
  p0Obj1: "Ordne 5 Alltagsaufgaben dem passenden KI-Tooltyp zu", p0Obj2: "Erkläre, wann man KI NICHT nutzen sollte", p0Obj3: "Dokumentiere ein Tool, das du erstmals ausprobiert hast",
  p1Obj1: "Schreibe einen Prompt mit Rolle + Kontext + Format", p1Obj2: "Kürze einen aufgeblähten Prompt halb, bei gleichem Ergebnis", p1Obj3: "Notiere gesparte Rechenleistung/Wasser",
  p2Obj1: "Ziehe die 5 wichtigsten Punkte aus einem 30-seitigen Dokument", p2Obj2: "Prüfe jeden Punkt gegen die Quelle", p2Obj3: "Markiere eine Sache, bei der die KI falsch lag",
  p3Obj1: "Wandle Rohzahlen in eine 2-Minuten-Management-Zusammenfassung um", p3Obj2: "Behalte ein Diagramm, entferne den Rest", p3Obj3: "Ergänze eine Zeile: Was änderte sich gegenüber letztem Monat?",
  p4Obj1: "Mache 20 unordentliche Folien konsistent", p4Obj2: "Eine Botschaft pro Folie", p4Obj3: "Triff die Markenstimme",
  p5Obj1: "Sammle 20 echte Fragen aus dem Team", p5Obj2: "Begründe Antworten mit eigenen Dokumenten", p5Obj3: "Teste es mit einem Kollegen/einer Kollegin",
  p6Obj1: "Finde eine Aufgabe, die du jede Woche erledigst", p6Obj2: "Entwirf die Automatisierungsschritte", p6Obj3: "Miss die gesparte Zeit",
  p0Note: "Kleinen Spickzettel erstellt: welches Tool für welche Aufgabe.", p1Note: "Kürzere Prompts → gleiche Antwort, ca. 40 % weniger Tokens.", p4Note: "Gamma für Layout genutzt, Claude zum Straffen der Texte.",
  p0Fb: "Klare Zuordnung — der Spickzettel war stark.", p1Fb: "Sehr gutes Effizienzdenken.",
  needs: "Voraussetzung", noPrereq: "— keine, offen für alle", subjectHow: "📄 Aufgabenstellung — Vorgehen", hide: "ausblenden ▴", show: "anzeigen ▾",
  objectivesEval: "Ziele, nach denen bewertet wird:", suggestedTools: "Empfohlene Tools", fullBrief: "vollständiges Briefing.pdf — Beispiele, Datensatz & Rubrik",
  yourNotes: "Deine Notizen", unlocksWhenStart: "(wird beim Start freigeschaltet)", notesPlaceholder: "Notiere getestete Tools, Prompts und was funktioniert hat…", yourGrade: "Deine Bewertung",
  waitingPeerEval: "Wartet auf Peer Evaluation", slotsOpenBooked: "{open} Slots offen · {booked} gebucht", autoMatchPeer: "Wir matchen automatisch mit einem Peer, der dasselbe Projekt abgeschlossen hat.", peerBookedSlot: "Ein Peer hat einen Slot gebucht.", openMoreSlots: "Öffne mehr Slots, um schneller gematcht zu werden.", manageEvalSlots: "Evaluationsslots verwalten",
  finishPrereqOne: "Erst {count} Voraussetzung abschließen", finishPrereqMany: "Erst {count} Voraussetzungen abschließen", startProject: "Projekt starten", saveNotes: "Notizen speichern", closeRequestEval: "Schließen & Evaluation anfragen →", reopenSubmission: "Einreichung erneut öffnen", retryImprove: "Erneut versuchen",
  toastStarted: "Projekt gestartet", toastNotesSaved: "Notizen gespeichert", toastReopened: "Erneut geöffnet — Einreichung zurückgezogen", toastRetry: "Neuer Versuch gestartet", toastLocked: "Gesperrt — erst Voraussetzungen abschließen", toastClosedEval: "Projekt geschlossen — Peer Evaluation angefragt", toastAvailability: "Verfügbarkeit aktualisiert",
  closeProjectSlots: "Projekt schließen & Evaluationsslots öffnen", cancel: "Abbrechen", done: "Fertig", evalSlots: "Evaluationsslots",
  openSlotRequestOne: "{count} Slot öffnen & Review anfragen →", openSlotRequestMany: "{count} Slots öffnen & Review anfragen →", closeProjectHelp: "Wenn du ein Projekt schließt, geht es in Peer Review. Wähle Zeiten, zu denen du frei bist — ein Peer mit abgeschlossener {cat}-Arbeit kann einen offenen Slot buchen.", openAvailabilityWeek: "Verfügbarkeit diese Woche öffnen", availabilityHelp: "Öffne oder schließe Zeiten, in denen du für einen Evaluator verfügbar bist.", tapCell: "Zelle antippen, um Verfügbarkeit zu öffnen / schließen",
  open: "offen", booked: "gebucht", closed: "geschlossen", bookedBy: "Gebucht von {by}", openClickClose: "Offen — klicken zum Schließen", clickOpenSlot: "Klicken, um diesen Slot zu öffnen",
  dayMon: "Mo", dayTue: "Di", dayWed: "Mi", dayThu: "Do", dayFri: "Fr",
  peerEvalSub: "Bewerte eingereichte Arbeiten, bestätige erhaltenes Feedback und verwalte deine Verfügbarkeit.", toEvaluate: "Zu bewerten", myReviews: "Meine Reviews", availability: "Verfügbarkeit", peersWaitingStat: "Wartende Peers", confirmedReviews: "Bestätigte Reviews", openSlots: "Offene Slots",
  reviewBooked: "gebucht", reviewOpen: "offen", reviewClosed: "geschlossen", startEvaluation: "Bewertung starten", submitEvaluation: "Bewertung senden", confirmHelpful: "Als hilfreich bestätigen", confirmedLabel: "bestätigt", needsConfirmation: "wartet auf Bestätigung", rubric: "Rubrik", evidence: "Nachweis", feedback: "Feedback", feedbackPh: "Nenne eine konkrete Stärke und einen Verbesserungsvorschlag…", noQueue: "Keine ausstehenden Peer-Bewertungen.", manageAvailability: "Öffne Zeiten, in denen du für Peer Review verfügbar bist. Gebuchte Slots bleiben gesperrt.",
  reviewXp: "+40 XP / Review", pending: "ausstehend", autoMatchedSubmissions: "automatisch gematchte Einreichungen", feedbackLoopsClosed: "geschlossene Feedback-Schleifen", slotNotBooked: "Slot nicht gebucht", submittedResult: "eingereichtes Ergebnis / geteilter Link", passesRubric: "erfüllt Rubrik",
  evalSentToast: "Bewertung gesendet · XP wartet auf Bestätigung", feedbackConfirmedToast: "Feedback bestätigt · XP freigegeben", receivedFeedbackQuote: "Klares Ergebnis, gute Prompt-Iteration. Nächstes Mal Quellenchecks vor dem Finalisieren ergänzen.", defaultEvalFeedback: "Starke Struktur und klare Zusammenfassung. Ergänze vor der Einreichung einen expliziten Quellencheck.", correctness: "Korrektheit", clarity: "Klarheit", responsibleAiUse: "Verantwortliche KI-Nutzung",
  peerQ1Project: "Langes PDF zusammenfassen", peerQ2Project: "Monatsbericht erstellen", peerQ3Project: "Foliensatz bereinigen", age12min: "12 Min.", age1h: "1 Std.", age3h: "3 Std.", bookedToday1500: "Heute 15:00", bookedTomorrow1000: "Morgen 10:00",
  review1Project: "Kampagnen-Copy-A/B", review2Project: "Leitfaden Markenstimme", review3Project: "Event-Recap-Deck",
});
Object.assign(DICT.uk, {
  appName: "AI Skill Bridge",
  aiUsage: "Використання ШІ", thisMonth: "цього місяця", usageLine: "запити · ≈ 0,9 кВт·год · 4,1 л води", teamBudgetTips: "42 % командного бюджету · поради ↓",
  memberDate: "бер 2026", tweaks: "Налаштування", density: "Щільність", compact: "компактна", regular: "звичайна", comfy: "зручна", darkMode: "Темний режим",
  authMethod: "Метод 42 Prague · без викладачів · навчання через практику",
  profileXpLine: "340 / 500 XP → L8 · Творець", resultScreenshot: "результат проєкту / скриншот", featuredResult: "результат обраного проєкту",
  "dept.hr": "HR", "dept.finance": "Фінанси", "dept.marketing": "Маркетинг", "dept.ops": "Операції", "dept.sales": "Продажі",
  "task.reporting": "Звітність", "task.summarize": "Підсумок", "task.content": "Контент", "task.chatbot": "Чатбот", "task.automation": "Автоматизація",
  feed1Title: "Автосортування рахунків", feed2Title: "FAQ-бот для онбордингу нових співробітників", feed3Title: "A/B текст кампанії за один день", feed4Title: "Політика простими словами", feed5Title: "Нотатки зустрічі → дії", featuredTitle: "Прогноз продажів простою мовою",
  projectsSub: "Обери проєкт · навчайся через практику · закрий його й отримай peer-оцінку.", completed: "виконано", yourLevel: "твій рівень",
  filterAll: "Усі", noProjectsInView: "У цьому перегляді немає проєктів.", difficultyTitle: "Складність {n}/3",
  projectStatusGo: "Доступний", projectStatusDoing: "У процесі", projectStatusReview: "На перевірці", projectStatusDone: "Завершено", projectStatusLock: "Заблоковано",
  catBasics: "Основи", catPrompting: "Промпти", catSummarize: "Підсумок", catReporting: "Звітність", catContent: "Контент", catChatbot: "Чатбот", catAutomation: "Автоматизація",
  p0Title: "Основи ШІ — обери правильний інструмент", p1Title: "Промпти без марнування токенів", p2Title: "Точно підсумувати довгий PDF", p3Title: "Місячний звіт із ШІ", p4Title: "Впорядкувати презентацію за брендом", p5Title: "Створити командного FAQ-асистента", p6Title: "Автоматизувати повторюваний процес",
  p0Obj1: "Зістав 5 щоденних задач із правильним типом ШІ-інструмента", p0Obj2: "Поясни, коли НЕ варто використовувати ШІ", p0Obj3: "Запиши один інструмент, який спробував/спробувала вперше",
  p1Obj1: "Напиши промпт із роллю + контекстом + форматом", p1Obj2: "Скороти надто довгий промпт удвічі з тим самим результатом", p1Obj3: "Запиши зекономлені обчислення/воду",
  p2Obj1: "Витягни 5 ключових пунктів із 30-сторінкового документа", p2Obj2: "Перевір кожен пункт за джерелом", p2Obj3: "Познач одну помилку ШІ",
  p3Obj1: "Перетвори сирі цифри на 2-хвилинний менеджерський підсумок", p3Obj2: "Залиши один графік, решту прибери", p3Obj3: "Додай рядок «що змінилося проти минулого місяця»",
  p4Obj1: "Зроби 20 хаотичних слайдів послідовними", p4Obj2: "Одна думка на один слайд", p4Obj3: "Дотримайся голосу бренду",
  p5Obj1: "Збери 20 реальних запитань від команди", p5Obj2: "Побудуй відповіді на власних документах", p5Obj3: "Протестуй із колегою",
  p6Obj1: "Знайди задачу, яку виконуєш щотижня", p6Obj2: "Опиши кроки автоматизації", p6Obj3: "Виміряй заощаджений час",
  p0Note: "Зробив/зробила коротку шпаргалку: який інструмент для якої роботи.", p1Note: "Коротші промпти → та сама відповідь, приблизно на 40 % менше токенів.", p4Note: "Gamma для макета, Claude для стислості тексту.",
  p0Fb: "Чітке зіставлення — шпаргалка сподобалась.", p1Fb: "Чудове мислення про ефективність.",
  needs: "Потрібно", noPrereq: "— нічого, відкрито для всіх", subjectHow: "📄 Завдання — як виконати", hide: "сховати ▴", show: "показати ▾",
  objectivesEval: "Цілі, за якими тебе оцінюватимуть:", suggestedTools: "Рекомендовані інструменти", fullBrief: "повне завдання.pdf — приклади, дані та рубрика",
  yourNotes: "Твої нотатки", unlocksWhenStart: "(відкриється після старту)", notesPlaceholder: "Запиши інструменти, промпти й що спрацювало…", yourGrade: "Твоя оцінка",
  waitingPeerEval: "Очікує peer-оцінки", slotsOpenBooked: "{open} відкритих слотів · {booked} заброньовано", autoMatchPeer: "Ми автоматично підбираємо колегу, який/яка завершив/завершила той самий проєкт.", peerBookedSlot: "Колега забронював/забронювала слот.", openMoreSlots: "Відкрий більше слотів, щоб швидше отримати пару.", manageEvalSlots: "Керувати слотами оцінювання",
  finishPrereqOne: "Спочатку заверши {count} передумову", finishPrereqMany: "Спочатку заверши {count} передумов", startProject: "Почати проєкт", saveNotes: "Зберегти нотатки", closeRequestEval: "Закрити й запросити оцінку →", reopenSubmission: "Знову відкрити подання", retryImprove: "Спробувати покращити",
  toastStarted: "Проєкт розпочато", toastNotesSaved: "Нотатки збережено", toastReopened: "Знову відкрито — подання відкликано", toastRetry: "Нову спробу розпочато", toastLocked: "Заблоковано — спочатку заверши передумови", toastClosedEval: "Проєкт закрито — peer-оцінку запрошено", toastAvailability: "Доступність оновлено",
  closeProjectSlots: "Закрити проєкт і відкрити слоти оцінювання", cancel: "Скасувати", done: "Готово", evalSlots: "Слоти оцінювання",
  openSlotRequestOne: "Відкрити {count} слот і запросити перевірку →", openSlotRequestMany: "Відкрити {count} слотів і запросити перевірку →", closeProjectHelp: "Коли ти закриваєш проєкт, він переходить у peer-review. Обери час, коли ти вільний/вільна — колега, який/яка завершив/завершила роботу типу {cat}, може забронювати один із відкритих слотів.", openAvailabilityWeek: "Відкрити доступність цього тижня", availabilityHelp: "Відкрий або закрий час, коли ти доступний/доступна для оцінювача.", tapCell: "натисни клітинку, щоб відкрити / закрити доступність",
  open: "відкрито", booked: "заброньовано", closed: "закрито", bookedBy: "Заброньовано {by}", openClickClose: "Відкрито — натисни, щоб закрити", clickOpenSlot: "Натисни, щоб відкрити цей слот",
  dayMon: "Пн", dayTue: "Вт", dayWed: "Ср", dayThu: "Чт", dayFri: "Пт",
  peerEvalSub: "Оцінюй роботи колег, підтверджуй отриманий відгук і керуй доступністю для оцінювання.", toEvaluate: "До оцінювання", myReviews: "Мої відгуки", availability: "Доступність", peersWaitingStat: "Очікують", confirmedReviews: "Підтверджені", openSlots: "Відкриті слоти",
  reviewBooked: "заброньовано", reviewOpen: "відкрито", reviewClosed: "закрито", startEvaluation: "Почати оцінювання", submitEvaluation: "Надіслати оцінку", confirmHelpful: "Підтвердити корисність", confirmedLabel: "підтверджено", needsConfirmation: "потребує підтвердження", rubric: "Рубрика", evidence: "Матеріал", feedback: "Відгук", feedbackPh: "Напиши одну сильну сторону та одну пораду щодо покращення…", noQueue: "Немає очікуваних peer-оцінювань.", manageAvailability: "Відкрий час, коли ти доступний/доступна для peer review. Заброньовані слоти заблоковані.",
  reviewXp: "+40 XP / оцінка", pending: "очікує", autoMatchedSubmissions: "автоматично підібрані подання", feedbackLoopsClosed: "закриті цикли відгуку", slotNotBooked: "слот не заброньовано", submittedResult: "поданий результат / спільне посилання", passesRubric: "відповідає рубриці",
  evalSentToast: "Оцінку надіслано · XP очікує підтвердження", feedbackConfirmedToast: "Відгук підтверджено · XP видано", receivedFeedbackQuote: "Чіткий результат, хороша ітерація промпту. Наступного разу додай перевірку джерел перед фіналізацією.", defaultEvalFeedback: "Сильна структура і чіткий підсумок. Перед поданням додай одну явну перевірку джерела.", correctness: "Правильність", clarity: "Ясність", responsibleAiUse: "Відповідальне використання ШІ",
  peerQ1Project: "Підсумувати довгий PDF", peerQ2Project: "Створити місячний звіт", peerQ3Project: "Впорядкувати презентацію", age12min: "12 хв", age1h: "1 год", age3h: "3 год", bookedToday1500: "Сьогодні 15:00", bookedTomorrow1000: "Завтра 10:00",
  review1Project: "A/B текст кампанії", review2Project: "Гайд голосу бренду", review3Project: "Презентація за підсумками події",
});

Object.assign(window, { AppCtx, useApp, Av, Pill, Bar, Stars, Badge, Ring, ImgPh, Ic, ICONS, Mark, DICT, LANG_META, tx, lx });

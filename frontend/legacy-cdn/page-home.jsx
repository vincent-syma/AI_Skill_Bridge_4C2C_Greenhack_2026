/* ============================================================
   page-home.jsx — Home = Progress (C + learning path) + Showcase (A)
   ============================================================ */

const ALL_TOOLS = ["Claude", "ChatGPT", "Copilot", "Excel Copilot", "Notion AI", "Midjourney"];
const TASK_TYPES = ["Reporting", "Summarize", "Content", "Chatbot", "Automation", "Basics", "Prompting"];

/* ---------- Progress block (Progress C + learning path) ---------- */
function ProfileCard() {
  const { t, profile } = useApp();
  const xpPct = Math.min(100, ((profile.xp || 0) % 500) / 5); // 0-100% within current level
  return (
    <div className="card col" style={{ width: 292, flex: "none", alignItems: "center", textAlign: "center", gap: 12 }}>
      <Av xl>{profile.initials}</Av>
      <div>
        <div className="h2">{profile.name}</div>
        <div className="dim" style={{ fontSize: 12 }}>{profile.role}</div>
      </div>
      <Ring p={xpPct} lvl={profile.level || 0} />
      <div style={{ width: "100%" }}>
        <Bar p={xpPct} />
        <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
          {profile.xp} XP · {500 - ((profile.xp || 0) % 500)} to next level
        </div>
      </div>
      <hr className="divider" style={{ width: "100%" }} />
      <BadgesRow />
    </div>
  );
}

function BadgesRow() {
  const { t } = useApp();
  const [badges, setBadges] = React.useState([]);
  React.useEffect(() => {
    API.users.getBadges().then(setBadges).catch(() => {});
  }, []);
  const icons = { "FIRST_SUBMISSION": "★", "FIRST_EVAL": "✎", "EVAL_5": "⚡", "TASK_COMPLETE": "♺", "TASK_5": "🏆" };
  const shown = badges.slice(0, 4);
  return (
    <div style={{ width: "100%" }}>
      <div className="lbl" style={{ marginBottom: 8, textAlign: "left" }}>{t("badges")} · {badges.length}/18</div>
      <div className="row" style={{ justifyContent: "center", gap: 9 }}>
        {shown.map((b) => <Badge key={b.code} icon={icons[b.code] || "●"} />)}
        {shown.length < 4 && <Badge icon="?" locked />}
      </div>
    </div>
  );
}

function Stat({ k, v, sub }) {
  return <div className="card stat"><span className="lbl">{k}</span><div className="num">{v}</div>{sub && <div className="sub">{sub}</div>}</div>;
}

function StatsRow() {
  const { t } = useApp();
  const [stats, setStats] = React.useState(null);
  React.useEffect(() => {
    API.users.getStats().then(setStats).catch(() => {});
  }, []);
  return (
    <div className="g3">
      <Stat k={t("projectsDone")} v={stats ? stats.projects_done : "—"} />
      <Stat k={t("evalsGiven")} v={stats ? stats.evals_given : "—"} />
      <Stat k={t("streak")} v={stats ? `${stats.streak}🔥` : "—"} sub={t("days")} />
    </div>
  );
}

function Activity() {
  const { t } = useApp();
  const [items, setItems] = React.useState(null);
  React.useEffect(() => {
    API.users.getActivity(6).then(setItems).catch(() => {});
  }, []);

  // Fallback while loading
  if (!items) {
    return (
      <div className="card col" style={{ gap: 4 }}>
        <span className="lbl" style={{ marginBottom: 6 }}>{t("recentActivity")}</span>
        <div className="dim" style={{ fontSize: 12, padding: 8 }}>Loading…</div>
      </div>
    );
  }

  const kindIcon = { submission_completed: "+XP", eval_submitted: "+50", badge_earned: "🏅" };
  const kindColor = { eval_submitted: " acc" };

  return (
    <div className="card col" style={{ gap: 4 }}>
      <span className="lbl" style={{ marginBottom: 6 }}>{t("recentActivity")}</span>
      <div className="tl">
        {items.length === 0 && <div className="dim" style={{ fontSize: 12 }}>No activity yet</div>}
        {items.map((item, i) => (
          <div className="ev" key={item.id + "-" + i}>
            <span className={"xp" + (kindColor[item.kind] || "")}>
              {item.xp_delta != null ? `+${item.xp_delta}` : kindIcon[item.kind] || "●"}
            </span>
            <span className="grow" style={{ fontSize: 13 }}>{item.label}</span>
            <span className="dim" style={{ fontSize: 11 }}>
              {(() => {
                const d = Math.floor((Date.now() - new Date(item.created_at)) / 86400000);
                return d === 0 ? "today" : `${d}d`;
              })()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearningPath() {
  const { t } = useApp();
  const steps = [["basics", "done"], ["prompting", "done"], ["toolsStep", "done"], ["sharing", "now"], ["mentor", "todo"]];
  return (
    <div className="card col" style={{ gap: 14 }}>
      <div className="sect-head">
        <span className="lbl">{t("learningPath")}</span>
        <span className="pill accent">{t("nextLevel")}</span>
      </div>
      <div className="path">
        {steps.map(([k, st], i) => (
          <React.Fragment key={k}>
            <div className="node">
              <div className={"pin " + st}>{st === "done" ? <span style={{ display: "flex" }}>{ICONS.check}</span> : i + 1}</div>
              <span className="cap">{t(k)}</span>
              {st === "now" && <span className="pill accent" style={{ fontSize: 9, padding: "1px 7px" }}>{t("youAreHere")}</span>}
            </div>
            {i < steps.length - 1 && <div className={"seg" + (steps[i + 1][1] === "todo" && st !== "done" ? "" : st === "done" ? " done" : "")} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function HomeProgress() {
  const { t, profile } = useApp();
  const xpPct = Math.min(100, ((profile.xp || 0) % 500) / 5);
  return (
    <div className="col">
      <div className="row center between">
        <h1 className="h1">{t("welcome")} 👋</h1>
        <span className="dim" style={{ fontSize: 12.5 }}>{t("tagline")}</span>
      </div>
      <div className="row" style={{ alignItems: "stretch" }}>
        <ProfileCard />
        <div className="col grow">
          <StatsRow />
          <Activity />
        </div>
      </div>
      <LearningPath />
    </div>
  );
}

/* ---------- Showcase block (Showcase A) ---------- */

function FeedCard({ d }) {
  const { t } = useApp();
  const daysAgo = Math.floor((Date.now() - new Date(d.created_at)) / 86400000);
  const rating = d.avg_score ? Math.round(d.avg_score) : (d.overall_pass ? 4 : 3);
  const evalCount = d.helpful_count || 0;
  return (
    <div className="card feed-card">
      <div className="fc-head">
        <Av>{d.author.initials}</Av>
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.author.name || d.author.initials}</div>
          <div className="dim" style={{ fontSize: 11.5 }}>{d.author.department || "Team"} · {daysAgo}d {t("ago")}</div>
        </div>
        <span className="pill">+{d.task_category === "Basics" ? 60 : d.task_category === "Prompting" ? 80 : 100} XP</span>
      </div>
      <div className="h3">{d.task_title}</div>
      <div className="tool-tags">{(d.tools || []).map((x) => <span key={x} className="pill">{x}</span>)}</div>
      <ImgPh label={t("resultScreenshot")} h={150} />
      <div className="row center between wrap" style={{ gap: 8 }}>
        <span><Stars n={rating} /> <span className="dim" style={{ fontSize: 11.5 }}>· {evalCount} {t("evals")}</span></span>
        <div className="row tight">
          <button className="btn sm">{t("view")}</button>
          <button className="btn primary sm" onClick={() => API.showcase.markHelpful(d.id).catch(() => {})}>{t("helpful") || "👍"}</button>
        </div>
      </div>
    </div>
  );
}

function Featured({ d }) {
  const { t } = useApp();
  if (!d) return null;
  const rating = d.avg_score ? Math.round(d.avg_score) : 5;
  return (
    <div className="card featured shiny">
      <ImgPh className="fimg" label={t("featuredResult")} h={230} style={{ borderRadius: 0, borderWidth: "0 1px 0 0" }} />
      <div className="fbody">
        <span className="pill accent" style={{ alignSelf: "flex-start" }}>{ICONS.spark} {t("featuredTag")}</span>
        <h2 className="h2" style={{ fontSize: 18 }}>{d.task_title}</h2>
        <div className="row center tight">
          <Av sm>{d.author.initials}</Av>
          <span className="dim" style={{ fontSize: 12 }}>{d.author.name || d.author.initials} · {d.author.department || "Team"}</span>
        </div>
        <div className="row center wrap tight">
          {(d.tools || []).map((x) => <span key={x} className="pill">{x}</span>)}
          <span className="dim" style={{ fontSize: 11.5 }}>· <Stars n={rating} /> {d.helpful_count} {t("evals")}</span>
        </div>
        <div className="row tight" style={{ marginTop: 2 }}>
          <button className="btn primary sm">{t("view")}</button>
          <button className="btn sm" onClick={() => API.showcase.markHelpful(d.id).catch(() => {})}>{t("helpful") || "👍"}</button>
        </div>
      </div>
    </div>
  );
}

function FilterWidget({ dept, setDept, tool, setTool, task, setTask, count }) {
  const { t } = useApp();
  const active = dept !== "all" || tool !== "all" || task !== "all";
  const deptOpts = [["all", t("allDepts")], ...["HR", "Finance", "Marketing", "Operations"].map((x) => [x, x])];
  return (
    <div className="card col" style={{ gap: 10 }}>
      <div className="sect-head"><span className="lbl">{ICONS.search} {t("filter")}</span>
        {active && <button className="pill" onClick={() => { setDept("all"); setTool("all"); setTask("all"); }}>✕ {t("clear")}</button>}
      </div>
      <select className="sel" value={dept} onChange={(e) => setDept(e.target.value)}>{deptOpts.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
      <select className="sel" value={tool} onChange={(e) => setTool(e.target.value)}><option value="all">{t("anyTool")}</option>{ALL_TOOLS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
      <select className="sel" value={task} onChange={(e) => setTask(e.target.value)}><option value="all">{t("anyTask")}</option>{TASK_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
      <div className="dim" style={{ fontSize: 11.5 }}>{count} {t("results")}</div>
    </div>
  );
}

function HomeShowcase() {
  const { t, profile } = useApp();
  const [dept, setDept] = React.useState("all");
  const [tool, setTool] = React.useState("all");
  const [task, setTask] = React.useState("all");

  const [feedData, feedLoading, feedError] = useApi(() => API.showcase.feed(1, 20), []);
  const [featuredList, , ] = useApi(() => API.showcase.featured(), []);

  const feedItems = feedData?.items || [];
  const featured = featuredList?.[0] || null;

  const shown = feedItems.filter((d) =>
    (dept === "all" || d.author?.department === dept) &&
    (tool === "all" || (d.tools || []).includes(tool)) &&
    (task === "all" || d.task_category === task)
  );

  return (
    <div className="col">
      <div className="page-divider">{t("showcaseTitle")}</div>
      <div className="sect-head">
        <div><h2 className="h2">{t("showcaseTitle")}</h2><div className="dim" style={{ fontSize: 12.5 }}>{t("showcaseSub")}</div></div>
        <button className="btn primary sm">{ICONS.plus} {t("share")}</button>
      </div>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col grow">
          {feedLoading && <div className="card dim" style={{ textAlign: "center", padding: 24, fontSize: 12.5 }}>Loading showcase…</div>}
          {feedError && <div className="card dim" style={{ textAlign: "center", padding: 16, fontSize: 12.5 }}>{feedError}</div>}
          {!feedLoading && !feedError && <Featured d={featured} />}
          {shown.length === 0 && !feedLoading && <div className="card dim" style={{ textAlign: "center", padding: 24, fontSize: 12.5 }}>{t("noMatch")}</div>}
          {shown.filter((d) => !d.is_featured).map((d) => <FeedCard key={d.id} d={d} />)}
        </div>
        <div className="col" style={{ width: 268, flex: "none" }}>
          <FilterWidget dept={dept} setDept={setDept} tool={tool} setTool={setTool} task={task} setTask={setTask} count={shown.length} />
          <WeekSummaryCard />
          <div className="card col" style={{ gap: 8 }}>
            <span className="lbl">{t("trending")}</span>
            {["Claude", "ChatGPT", "Copilot", "Midjourney"].map((x) => (
              <button key={x} className={"pill" + (tool === x ? " accent" : "")} style={{ justifyContent: "space-between", width: "100%" }} onClick={() => setTool(tool === x ? "all" : x)}>{x} <span className="dim">↑</span></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekSummaryCard() {
  const { t } = useApp();
  const [stats, setStats] = React.useState(null);
  const [queue, setQueue] = React.useState([]);
  React.useEffect(() => {
    API.users.getStats().then(setStats).catch(() => {});
    API.peerEvals.queue().then(setQueue).catch(() => {});
  }, []);
  const { setPage } = useApp();
  return (
    <div className="card col" style={{ gap: 9 }}>
      <span className="lbl">{t("yourWeek")}</span>
      <div className="row center between"><span style={{ fontSize: 13 }}>XP</span><b style={{ fontSize: 16 }}>+{stats ? stats.xp : "…"}</b></div>
      <Bar p={stats ? Math.min(100, (stats.xp % 500) / 5) : 0} />
      {queue.length > 0 && <div className="dim" style={{ fontSize: 11.5 }}>{queue.length} peer{queue.length > 1 ? "s" : ""} waiting for your feedback</div>}
      <button className="btn sm" onClick={() => setPage("peereval")}>{t("evaluate")} →</button>
    </div>
  );
}

function HomePage() {
  return (<><HomeProgress /><HomeShowcase /></>);
}

Object.assign(window, { HomePage });

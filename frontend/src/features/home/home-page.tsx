// @ts-nocheck — legacy port; tighten types incrementally per feature.
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/providers/app-context";
import { API } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Av, Bar, Stars, Badge, Ring, ImgPh } from "@/components/ui";
import { ICONS } from "@/components/ui/icons";
import { LearningPathStrip } from "@/features/home/learning-path-strip";
import {
  filterGeneralCurriculum,
  projectPathHref,
} from "@/features/projects/learning-path";

const ALL_TOOLS = ["Claude", "ChatGPT", "Copilot", "Excel Copilot", "Notion AI", "Midjourney"];
const TASK_TYPES = ["Reporting", "Summarize", "Content", "Chatbot", "Automation", "Basics", "Prompting"];

/* ---------- Profile card ---------- */
function ProfileCard() {
  const { t, profile } = useApp();
  const xpPct = Math.min(100, ((profile.xp || 0) % 500) / 5);
  const toNext = 500 - ((profile.xp || 0) % 500);
  return (
    <div className="card col profile-card" style={{ width: 300, flex: "none", alignItems: "center", textAlign: "center", gap: 14 }}>
      <Av xl>{profile.initials}</Av>
      <div>
        <div className="h2" style={{ fontFamily: "var(--serif)", fontSize: 19, whiteSpace: "nowrap" }}>{profile.name}</div>
        <div className="dim mono" style={{ fontSize: 11.5, marginTop: 2 }}>{profile.role}</div>
      </div>
      <Ring p={xpPct} lvl={profile.level || 0} />
      <div style={{ width: "100%" }}>
        <Bar p={xpPct} />
        <div className="dim" style={{ fontSize: 11.5, marginTop: 8 }}>
          {(profile.xp || 0) % 500} / 500 XP · {toNext} {t("toNextLevel") || "to next level"}
        </div>
      </div>
      <hr className="divider" style={{ width: "100%" }} />
      <BadgesRow />
    </div>
  );
}

function BadgesRow() {
  const { t } = useApp();
  const [badges, setBadges] = useState([]);
  useEffect(() => {
    API.users.getBadges().then(setBadges).catch(() => {});
  }, []);
  const icons = { FIRST_SUBMISSION: "★", FIRST_EVAL: "✎", EVAL_5: "⚡", TASK_COMPLETE: "♺", TASK_5: "🏆", AI_PIONEER: "✦", STREAK_6: "🔥" };
  const shown = badges.slice(0, 4);
  const locks = Math.max(0, 6 - shown.length);
  return (
    <div style={{ width: "100%" }}>
      <div className="lbl" style={{ marginBottom: 11, textAlign: "left" }}>
        {t("badges") || "Achievements"} · {badges.length}/18
      </div>
      <div className="row" style={{ justifyContent: "center", gap: 9, flexWrap: "wrap", maxWidth: "100%" }}>
        {shown.map((b) => (
          <Badge key={b.code} icon={icons[b.code] || "●"} />
        ))}
        {Array.from({ length: locks }).map((_, i) => (
          <Badge key={"l" + i} icon="?" locked />
        ))}
      </div>
    </div>
  );
}

/* ---------- Stats ---------- */
function Stat({ k, v, sub, subPlain }) {
  return (
    <div className="card stat col" style={{ gap: 0 }}>
      <span className="lbl">{k}</span>
      <div className="num" style={{ marginTop: 9 }}>{v}</div>
      {sub && <div className={"sub" + (subPlain ? " plain" : "")}>{sub}</div>}
    </div>
  );
}

function StatsRow({ stats }) {
  const { t } = useApp();
  const pending = stats?.projects_awaiting_eval ?? 0;
  const projectsSub =
    pending > 0
      ? t(pending === 1 ? "projectsDonePendingOne" : "projectsDonePending", { count: pending })
      : null;
  return (
    <div className="g3">
      <Stat k={t("projectsDone")} v={stats ? stats.projects_done : "—"} sub={projectsSub} />
      <Stat k={t("evalsGiven")} v={stats ? stats.evals_given : "—"} subPlain />
      <Stat
        k={t("streak")}
        v={stats ? `${stats.streak} 🔥` : "—"}
        sub={t("days")}
        subPlain
      />
    </div>
  );
}

/* ---------- AI suggested next task ---------- */
function SuggestedNext({ project }) {
  const { t } = useApp();
  if (!project) return null;
  const href = projectPathHref(project);
  return (
    <div className="ai-surface row center" style={{ gap: 16, flexWrap: "wrap" }}>
      <div className="grow" style={{ minWidth: 240 }}>
        <span className="pill ai" style={{ marginBottom: 9 }}>
          {ICONS.spark} {t("suggestedByCoach") || "Suggested by AI Coach"}
        </span>
        <div className="d3" style={{ fontSize: 20, marginTop: 4 }}>{project.title}</div>
        <div className="dim" style={{ fontSize: 12, marginTop: 5 }}>
          {project.estimated_time ? `${project.estimated_time} · ` : ""}
          <b style={{ color: "var(--ai-ink)" }}>+{project.xp_reward} XP</b>
        </div>
      </div>
      <Link href={href} className="btn ai" style={{ textDecoration: "none" }}>
        {t("startTask") || "Start task"} →
      </Link>
    </div>
  );
}

/* ---------- Recent activity ---------- */
function Activity() {
  const { t } = useApp();
  const [items, setItems] = useState(null);
  useEffect(() => {
    API.users.getActivity(6).then(setItems).catch(() => {});
  }, []);
  if (!items) {
    return (
      <div className="card col" style={{ gap: 2 }}>
        <span className="lbl" style={{ marginBottom: 7 }}>{t("recentActivity")}</span>
        <div className="dim" style={{ fontSize: 12, padding: 8 }}>{t("loading") || "Loading…"}</div>
      </div>
    );
  }
  const kindIcon = { submission_completed: "+XP", eval_submitted: "+50", badge_earned: "🏅" };
  const kindColor = { eval_submitted: " acc" };
  return (
    <div className="card col" style={{ gap: 2 }}>
      <span className="lbl" style={{ marginBottom: 7 }}>{t("recentActivity")}</span>
      <div className="tl">
        {items.length === 0 && <div className="dim" style={{ fontSize: 12 }}>{t("noActivity") || "No activity yet"}</div>}
        {items.map((item, i) => (
          <div className="ev" key={item.id + "-" + i}>
            <span className={"xp" + (kindColor[item.kind] || "")}>
              {item.xp_delta != null ? `+${item.xp_delta}` : kindIcon[item.kind] || "●"}
            </span>
            <span className="grow" style={{ fontSize: 13.5 }}>{item.label}</span>
            <span className="dim mono" style={{ fontSize: 11 }}>
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

/* ---------- Welcome / hero ---------- */
function WelcomeHeader() {
  const { t, profile } = useApp();
  const first = (profile.name || "").split(" ")[0] || profile.initials;
  return (
    <div className="row center between wrap" style={{ gap: 12 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="display" style={{ fontSize: 27 }}>
          {t("welcomeBack") || "Welcome back"}, {first}
        </h1>
        <div className="dim mono" style={{ fontSize: 12.5, letterSpacing: ".04em" }}>
          {t("tagline")}
        </div>
      </div>
      <button className="btn ai" type="button">
        {ICONS.spark} {t("askAiCoach") || "Ask the AI Coach"}
      </button>
    </div>
  );
}

/* ---------- Progress block ---------- */
function HomeProgress() {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    API.users.getStats().then(setStats).catch(() => {});
    API.projects.list()
      .then((all) => setProjects(filterGeneralCurriculum(all)))
      .catch(() => {});
  }, []);

  const nextTask = useMemo(() => {
    const open = projects
      .filter((p) => p.user_status !== "completed")
      .sort((a, b) => a.position - b.position);
    return open[0] || null;
  }, [projects]);

  return (
    <section className="col reveal" style={{ gap: 20 }}>
      <WelcomeHeader />
      <div className="profile-row row" style={{ gap: "var(--gap)", alignItems: "stretch" }}>
        <ProfileCard />
        <div className="col grow">
          <StatsRow stats={stats} />
          <SuggestedNext project={nextTask} />
          <Activity />
        </div>
      </div>
      <LearningPathStrip />
    </section>
  );
}

/* ---------- Showcase block ---------- */

function FeedCard({ d }) {
  const { t } = useApp();
  const daysAgo = Math.floor((Date.now() - new Date(d.created_at)) / 86400000);
  const rating = d.avg_score ? Math.round(d.avg_score) : (d.overall_pass ? 4 : 3);
  const evalCount = d.helpful_count || 0;
  const xp = d.task_category === "Basics" ? 60 : d.task_category === "Prompting" ? 80 : 100;
  return (
    <div className="card feed-card">
      <div className="fc-head">
        <Av>{d.author.initials}</Av>
        <div className="grow">
          <div style={{ fontWeight: 600, fontSize: 14 }}>{d.author.name || d.author.initials}</div>
          <div className="dim mono" style={{ fontSize: 11 }}>
            {d.author.department || "Team"} · {daysAgo}d {t("ago") || "ago"}
          </div>
        </div>
        <span className="pill">+{xp} XP</span>
      </div>
      <div className="h3" style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{d.task_title}</div>
      <div className="tool-tags">
        {(d.tools || []).map((x) => (
          <span key={x} className="pill">{x}</span>
        ))}
      </div>
      <ImgPh label={t("resultScreenshot")} h={152} />
      <div className="row center between wrap" style={{ gap: 8 }}>
        <span>
          <Stars n={rating} /> <span className="dim" style={{ fontSize: 11.5 }}>· {evalCount} {t("evals")}</span>
        </span>
        <div className="row tight">
          <button className="btn sm">{t("view")}</button>
          <button
            className="btn primary sm"
            onClick={() => API.showcase.markHelpful(d.id).catch(() => {})}
          >
            👍 {t("helpful") || "Helpful"}
          </button>
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
        <span className="pill accent" style={{ alignSelf: "flex-start" }}>
          {ICONS.spark} {t("featuredTag")}
        </span>
        <h2 className="h2" style={{ fontSize: 18 }}>{d.task_title}</h2>
        <div className="row center tight">
          <Av sm>{d.author.initials}</Av>
          <span className="dim" style={{ fontSize: 12 }}>
            {d.author.name || d.author.initials} · {d.author.department || "Team"}
          </span>
        </div>
        <div className="row center wrap tight">
          {(d.tools || []).map((x) => (
            <span key={x} className="pill">{x}</span>
          ))}
          <span className="dim" style={{ fontSize: 11.5 }}>
            · <Stars n={rating} /> {d.helpful_count} {t("evals")}
          </span>
        </div>
        <div className="row tight" style={{ marginTop: 2 }}>
          <button className="btn primary sm">{t("view")}</button>
          <button
            className="btn sm"
            onClick={() => API.showcase.markHelpful(d.id).catch(() => {})}
          >
            👍 {t("helpful") || "Helpful"}
          </button>
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
    <div className="card col" style={{ gap: 11 }}>
      <div className="sect-head">
        <span className="lbl">{ICONS.search} {t("filter")}</span>
        {active && (
          <button className="pill" onClick={() => { setDept("all"); setTool("all"); setTask("all"); }}>
            ✕ {t("clear")}
          </button>
        )}
      </div>
      <select className="sel" value={dept} onChange={(e) => setDept(e.target.value)}>
        {deptOpts.map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>
      <select className="sel" value={tool} onChange={(e) => setTool(e.target.value)}>
        <option value="all">{t("anyTool")}</option>
        {ALL_TOOLS.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
      <select className="sel" value={task} onChange={(e) => setTask(e.target.value)}>
        <option value="all">{t("anyTask")}</option>
        {TASK_TYPES.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
      <div className="dim mono" style={{ fontSize: 12 }}>
        <b>{count}</b> {t("results")}
      </div>
    </div>
  );
}

function WeekSummaryCard() {
  const { t, setPage } = useApp();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    API.users.getStats().then(setStats).catch(() => {});
    API.peerEvals.queue().then(setQueue).catch(() => {});
  }, []);
  return (
    <div className="card col" style={{ gap: 10 }}>
      <span className="lbl">{t("yourWeek")}</span>
      <div className="row center between">
        <span style={{ fontSize: 13 }}>{t("xpEarned") || "XP earned"}</span>
        <b className="mono" style={{ fontSize: 18 }}>+{stats ? stats.xp : "…"}</b>
      </div>
      <Bar p={stats ? Math.min(100, (stats.xp % 500) / 5) : 0} />
      {queue.length > 0 && (
        <div className="dim" style={{ fontSize: 12 }}>
          {queue.length} {queue.length === 1 ? "peer" : "peers"} {t("waitingFeedback") || "waiting for your feedback"}
        </div>
      )}
      <button className="btn sm" onClick={() => setPage("peerEvaluation")} style={{ marginTop: 2 }}>
        {t("evaluate")} →
      </button>
    </div>
  );
}

function HomeShowcase() {
  const { t } = useApp();
  const [dept, setDept] = useState("all");
  const [tool, setTool] = useState("all");
  const [task, setTask] = useState("all");

  const [feedData, feedLoading, feedError] = useApi(() => API.showcase.feed(1, 20), []);
  const [featuredList] = useApi(() => API.showcase.featured(), []);

  const feedItems = feedData?.items || [];
  const featured = featuredList?.[0] || null;

  const shown = feedItems.filter(
    (d) =>
      (dept === "all" || d.author?.department === dept) &&
      (tool === "all" || (d.tools || []).includes(tool)) &&
      (task === "all" || d.task_category === task),
  );

  return (
    <section className="col reveal" style={{ gap: 20 }}>
      <div className="page-divider">{t("showcaseTitle")}</div>
      <div className="sect-head">
        <div>
          <h2 className="d3">{t("showcaseTitle")}</h2>
          <div className="dim mono" style={{ fontSize: 12, marginTop: 6 }}>{t("showcaseSub")}</div>
        </div>
        <button className="btn primary sm">{ICONS.plus} {t("share")}</button>
      </div>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="col grow">
          {feedLoading && (
            <div className="card dim" style={{ textAlign: "center", padding: 24, fontSize: 12.5 }}>
              {t("loading") || "Loading showcase…"}
            </div>
          )}
          {feedError && (
            <div className="card dim" style={{ textAlign: "center", padding: 16, fontSize: 12.5 }}>{feedError}</div>
          )}
          {!feedLoading && !feedError && <Featured d={featured} />}
          {shown.length === 0 && !feedLoading && (
            <div className="card dim" style={{ textAlign: "center", padding: 24, fontSize: 12.5 }}>{t("noMatch")}</div>
          )}
          {shown.filter((d) => !d.is_featured).map((d) => (
            <FeedCard key={d.id} d={d} />
          ))}
        </div>
        <div className="col" style={{ width: 280, flex: "none" }}>
          <FilterWidget
            dept={dept}
            setDept={setDept}
            tool={tool}
            setTool={setTool}
            task={task}
            setTask={setTask}
            count={shown.length}
          />
          <WeekSummaryCard />
          <div className="card col" style={{ gap: 9 }}>
            <span className="lbl">{t("trending")}</span>
            {["Claude", "ChatGPT", "Copilot", "Midjourney"].map((x) => (
              <button
                key={x}
                className={"pill" + (tool === x ? " accent" : "")}
                style={{ justifyContent: "space-between", width: "100%" }}
                onClick={() => setTool(tool === x ? "all" : x)}
              >
                {x} <span className="dim">↑</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <>
      <HomeProgress />
      <HomeShowcase />
    </>
  );
}

export { HomePage };

// @ts-nocheck — legacy port; tighten types incrementally per feature.
"use client";

import React, { useState } from "react";
import { useApp } from "@/providers/app-context";
import { Av, Ring } from "@/components/ui";
import { ICONS as G } from "@/components/ui/icons";

/* ---------------- main classroom ---------------- */
function ClassroomMain({ onLive }: { onLive: () => void }) {
  const { t, setPage } = useApp();

  const days = [
    ["1", t("clDay1") || "Explore tools", "done"],
    ["2", t("clDay2") || "Simplify your work", "now"],
    ["3", t("clDay3") || "Build & share", "todo"],
    ["4", t("clDay4") || "Wrap-up & next", "todo"],
  ];

  const missions = [
    [t("clM1") || "Make your weekly report AI-assisted", "40 min · good for HR & Ops", t("inProgress") || "In progress", "warn", t("continue") || "Continue", "primary"],
    [t("clM2") || "Draft a tricky email with AI", "20 min · reviewed by a peer", t("reviewed") || "Reviewed", "green", t("view") || "View", "ghost"],
    [t("clM3") || "Clean up a messy spreadsheet", "35 min · Sheets AI", t("notStarted") || "Not started", "", t("start") || "Start", "ghost"],
  ];

  const trending = [["Claude", "31"], ["Sheets AI", "22"], ["Slides AI", "12"]];

  return (
    <div className="wrapw reveal">
      <div className="resp">
        <div className="grow col">
          {/* day path */}
          <div className="card">
            <div className="path daystrip">
              {days.map(([n, label, st], i) => (
                <React.Fragment key={n}>
                  <a className="node">
                    <div className={"pin " + st}>{st === "done" ? G.check : n}</div>
                    <span className="cap">
                      <small style={{ display: "block", color: "var(--ink-3)" }}>Day {n}</small>
                      {label}
                    </span>
                  </a>
                  {i < days.length - 1 && <div className={"seg " + (st === "done" ? "done" : "")} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* today's missions */}
          <div>
            <div className="row center" style={{ gap: 10, marginBottom: 13 }}>
                  <h2 className="h2" style={{ fontSize: 18, margin: 0 }}>{t("todaysMissions") || "Today's missions"}</h2>
              <span className="pill green">{t("clDayTag") || "Day 2 · Simplify"}</span>
            </div>
            <div className="col" style={{ gap: 11 }}>
              {missions.map(([title, meta, st, tone, cta, btn]) => (
                <div key={title} className="card hover row center" style={{ gap: 14 }}>
                  <span className="mi">{G.diamond}</span>
                  <div className="grow">
                    <div className="h3">{title}</div>
                    <div className="dim mono" style={{ fontSize: 11, marginTop: 3 }}>{meta}</div>
                  </div>
                  {st && <span className={"pill " + tone}>{st}</span>}
                  <button className={"btn " + btn + " sm"} type="button" onClick={() => setPage("projects")}>
                    {cta}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* peer session */}
          <div className="card hover ai row center" style={{ gap: 14 }}>
            <div
              className="mono"
              style={{ width: 50, height: 50, borderRadius: 12, background: "var(--ai-grad)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flex: "none" }}
            >
              15:00
            </div>
            <div className="grow">
              <div className="h3">{t("clPeerSession") || "Your peer session today · Table 4"}</div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
                {t("clPeerSessionSub") || 'Review with Tomáš (Finance) — task "Weekly report"'}
              </div>
            </div>
            <button className="btn ai sm" type="button" onClick={() => setPage("peerEvaluation")}>
              {t("details") || "Details"}
            </button>
          </div>
        </div>

        {/* rail */}
        <div className="rail col">
          <div className="card hover" style={{ cursor: "pointer" }} onClick={onLive} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onLive(); }}>
            <div className="row center between" style={{ marginBottom: 11 }}>
              <span className="row center" style={{ gap: 9 }}>
                <span className="pulse" />
                <span className="lbl">{t("theClassroom") || "The classroom"}</span>
              </span>
              <span className="dim">{G.arrowsm}</span>
            </div>
            <div className="h3">{t("hereNow38") || "38 here now"}</div>
            <div className="dim" style={{ fontSize: 12, marginTop: 3 }}>
              {t("oneBigRoom") || "One big room · see live activity"}
            </div>
          </div>

          <div className="card">
            <div className="row center" style={{ gap: 13, marginBottom: 13 }}>
              <Ring p={62} lvl={7} />
              <div>
                <div className="h3">{t("builder") || "Builder"}</div>
                <div className="dim mono" style={{ fontSize: 11 }}>340 / 500 XP → L8</div>
              </div>
            </div>
            <div className="bar"><i style={{ width: "68%" }} /></div>
          </div>

          <div className="card ai">
            <div className="lbl" style={{ marginBottom: 10 }}>{t("trendingInRoom") || "Trending in the room"}</div>
            <div className="col" style={{ gap: 9 }}>
              {trending.map(([tool, n]) => (
                <div key={tool} className="row center between" style={{ fontSize: 12.5, gap: 10 }}>
                  <span className="row center" style={{ gap: 8, minWidth: 0 }}>
                    <span className="dot ai" />
                    {tool}
                  </span>
                  <span className="faint dim mono" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{n} {t("uses") || "uses"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- one big classroom (live) ---------------- */
function ClassroomLive({ onBack }: { onBack: () => void }) {
  const { t, setPage } = useApp();

  const feed = [
    ["ED", "Eva", t("flFinished") || "finished", "Summarise a long doc", "green", "2m"],
    ["JP", "Jiří", t("flAsked") || "asked the room", "anyone tried Sheets AI for pivots?", "ai", "4m"],
    ["LM", "Lucie", t("flStarted") || "started", "Draft a tricky email", "", "6m"],
    ["NS", "Nora", t("flShared") || "shared a result to the gallery", "Ops status update", "green", "9m"],
    ["TB", "Tomáš", t("flLevel") || "leveled up to", "L5 · Connector", "green", "12m"],
  ];

  const tables = [
    ["Table 1", "Reports", 6],
    ["Table 2", "Emails", 5],
    ["Table 3", "Sheets", 7],
    ["Table 4", "Mixed", 4],
    ["Table 5", "Slides", 5],
    ["Table 6", "Open", 3],
  ];

  const stats = [["38", t("hereNow") || "here now"], ["11", t("inStudio") || "in Studio"], ["5", t("reviewing") || "reviewing"]];

  return (
    <div className="wrapw reveal">
      <div className="row center" style={{ gap: 10, marginBottom: 14 }}>
        <button className="btn ghost sm" type="button" onClick={onBack}>← {t("classroom") || "Classroom"}</button>
      </div>
      <div className="resp">
        <div className="grow col">
          <div className="card row center" style={{ gap: 16 }}>
            <span className="pulse" style={{ width: 11, height: 11 }} />
            <div className="grow">
                  <div className="h2" style={{ fontSize: 19 }}>{t("classroomLive") || "The Classroom · live"}</div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
                {t("classroomLiveSub") || "One cohort, one room. No teachers — everyone's mid-task."}
              </div>
            </div>
            <div className="row" style={{ gap: 22, textAlign: "center" }}>
              {stats.map(([v, k]) => (
                <div key={k}>
                  <div className="num" style={{ fontSize: 22 }}>{v}</div>
                  <div className="dim" style={{ fontSize: 11, marginTop: 3 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="row center between" style={{ marginBottom: 4 }}>
              <div className="lbl">{t("liveActivity") || "Live activity"}</div>
              <span className="pill ai" style={{ fontSize: 9.5 }}>{G.bolt} {t("streaming") || "streaming"}</span>
            </div>
            <div>
              {feed.map(([initials, name, act, obj, tone, time], i) => (
                <div className="feed-item" key={i}>
                  <Av sm>{initials}</Av>
                  <div className="grow" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    <b>{name}</b> <span className="dim">{act}</span>{" "}
                    {tone ? (
                      <b style={{ color: tone === "ai" ? "var(--ai-ink)" : "var(--green)" }}>{obj}</b>
                    ) : (
                      <span className="dim">{obj}</span>
                    )}
                  </div>
                  <time className="dim mono" style={{ fontSize: 10.5 }}>{time}</time>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rail col">
          <div className="card">
            <div className="lbl" style={{ marginBottom: 12 }}>{t("tablesNow") || "Tables right now"}</div>
            <div className="col" style={{ gap: 9 }}>
              {tables.map(([tbl, topic, n]) => (
                <div key={tbl} className="row center between">
                  <div>
                    <b style={{ fontSize: 12.5 }}>{tbl}</b>{" "}
                    <span className="dim mono" style={{ fontSize: 10.5 }}>· {topic}</span>
                  </div>
                  <span className="pill" style={{ fontSize: 10 }}>{n} {G.users}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card ai">
            <div className="lbl" style={{ marginBottom: 8 }}>{t("needHand") || "Need a hand?"}</div>
            <div className="dim" style={{ fontSize: 12.5, lineHeight: 1.55, marginBottom: 12 }}>
              {t("needHandSub") || "Drop a question into the room — someone nearby has probably solved it."}
            </div>
            <button className="btn ai sm block" type="button">{G.chat} {t("askRoom") || "Ask the room"}</button>
          </div>

          <button className="btn ghost block" type="button" onClick={() => setPage("home")}>
            {G.grid} {t("seeShared") || "See shared results"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassroomPage() {
  const [live, setLive] = useState(false);
  return live ? <ClassroomLive onBack={() => setLive(false)} /> : <ClassroomMain onLive={() => setLive(true)} />;
}

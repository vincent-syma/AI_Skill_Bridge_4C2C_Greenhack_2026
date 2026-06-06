"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/providers/app-context";
import { API } from "@/lib/api";
import { ICONS } from "@/components/ui/icons";

type PeerView = "peers" | "schedule" | "evaluate" | "reflect" | "loopclosed";

type PeerItem = {
  id?: string;
  evaluatee?: {
    name?: string;
    department?: string;
    level?: number;
    initials?: string;
  };
  submission?: {
    task_title?: string;
    task_category?: string;
    content?: string;
    file_name?: string;
  };
};

const SCHEDULE_SLOTS = ["14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];

const DEMO: PeerItem = {
  evaluatee: { name: "Tomáš N.", department: "Finance", level: 5, initials: "TN" },
  submission: { task_title: "Weekly report", task_category: "Finance" },
};

function peerInitials(name?: string) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function peerLabel(item: PeerItem) {
  const ev = item.evaluatee;
  const parts = [ev?.name || "Peer"];
  if (ev?.department) parts.push(ev.department);
  if (ev?.level) parts.push(`L${ev.level}`);
  return parts.join(" · ");
}

function PeerAv({ children, ai }: { children: React.ReactNode; ai?: boolean }) {
  return <span className={`av${ai ? " ai" : ""}`}>{children}</span>;
}

function FakeLines({ n, lead = true }: { n: number; lead?: boolean }) {
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push(
      <div
        key={i}
        style={{
          width: i === n - 1 ? "58%" : "100%",
          height: 7,
          borderRadius: 5,
          background: "var(--surface-3)",
        }}
      />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {lead && (
        <div
          style={{
            width: "68%",
            height: 9,
            borderRadius: 5,
            background: "var(--surface-3)",
          }}
        />
      )}
      {lines}
    </div>
  );
}

function Scale({
  value,
  onChange,
  compact,
}: {
  value: number;
  onChange: (n: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="scale" style={compact ? { marginLeft: 6 } : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n === value ? "on" : ""}
          style={compact ? { width: 36, height: 36, fontSize: 12 } : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const MATCHED_NOTE =
  '"Works for the summary, but I\'m unsure if the tone is too casual for leadership."';

function PeerEvaluationPage() {
  const { t, setPage } = useApp();
  const [view, setView] = useState<PeerView>("peers");
  const [queue, setQueue] = useState<PeerItem[]>([]);
  const [active, setActive] = useState<PeerItem>(DEMO);
  const [scheduleTime, setScheduleTime] = useState("15:00");
  const [scheduleWhere, setScheduleWhere] = useState<"inperson" | "video">("inperson");
  const [simplifyScore, setSimplifyScore] = useState(4);
  const [clarityScore, setClarityScore] = useState(5);
  const [keepText, setKeepText] = useState("");
  const [tryText, setTryText] = useState("");
  const [learned, setLearned] = useState(
    "His double-check flag was clearer than mine — I'll copy that habit."
  );
  const [nextTry, setNextTry] = useState(
    "Ask AI to list sections first, then fill — like the coach suggested."
  );
  const [usefulness, setUsefulness] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1900);
  };

  const loadQueue = useCallback(async () => {
    try {
      const q = await API.peerEvals.queue();
      const list = Array.isArray(q) ? q : [];
      setQueue(list);
      if (list[0]) setActive(list[0]);
      else setActive(DEMO);
    } catch {
      setActive(DEMO);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const ev = active.evaluatee ?? DEMO.evaluatee!;
  const sub = active.submission ?? DEMO.submission!;
  const peerShort = ev.name?.split(" ")[0] || "Peer";
  const peerInits = ev.initials || peerInitials(ev.name);
  const deptLine = sub.task_category || ev.department || "Finance";
  const toolLine = `${deptLine} · Claude + Sheets AI`;
  const shortNote = '"Unsure if the tone is too casual for leadership."';

  const composeFeedback = () => {
    const parts: string[] = [];
    if (keepText.trim()) parts.push(`${t("keepOne")}: ${keepText.trim()}`);
    if (tryText.trim()) parts.push(`${t("tryOne")}: ${tryText.trim()}`);
    return parts.join("\n\n");
  };

  const sendEvaluation = async () => {
    const feedback = composeFeedback();
    setSubmitting(true);
    try {
      if (active.id && feedback.trim()) {
        await API.peerEvals.submit(active.id, {
          responses: [],
          overall_pass: (simplifyScore + clarityScore) / 2 >= 3,
          feedback: feedback.trim(),
        });
        setQueue((prev) => prev.filter((x) => x.id !== active.id));
      }
      flash(t("evalSentToast"));
      setView("reflect");
    } catch (e) {
      flash("Submit error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSchedule = () => {
    const whereLabel = scheduleWhere === "inperson" ? "Table 4" : "Video call";
    flash(`Session booked · ${scheduleTime} · ${whereLabel}`);
    setView("evaluate");
  };

  if (view === "loopclosed") {
    return (
      <>
        <div className="wrapw reveal" style={{ maxWidth: 680 }}>
          <div className="card pad-lg" style={{ textAlign: "center" }}>
            <div
              className="row center"
              style={{ gap: 10, justifyContent: "center", marginBottom: 18 }}
            >
              <PeerAv ai>You</PeerAv>
              <span style={{ color: "var(--green)" }}>{ICONS.check}</span>
              <PeerAv>{peerInits}</PeerAv>
            </div>
            <div className="sect-title">Loop closed</div>
            <div
              className="dim"
              style={{
                fontSize: 13.5,
                marginTop: 8,
                maxWidth: 420,
                marginInline: "auto",
                lineHeight: 1.6,
              }}
            >
              You reviewed {peerShort}, {peerShort} reviewed you, and you both reflected.
              That&apos;s one full peer cycle done.
            </div>
            <div className="row" style={{ gap: 12, justifyContent: "center", marginTop: 22 }}>
              {(
                [
                  ["+160", "XP earned today"],
                  ["2", "peer cycles"],
                  ["L7", "340 → 380 XP"],
                ] as const
              ).map(([v, k]) => (
                <div key={k} className="card" style={{ padding: "14px 18px" }}>
                  <div className="num" style={{ fontSize: 22 }}>
                    {v}
                  </div>
                  <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
                    {k}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="row center"
              style={{ gap: 12, justifyContent: "center", marginTop: 24 }}
            >
              <button type="button" className="btn primary" onClick={() => setPage("home")}>
                {t("seeGallery")}
              </button>
              <button type="button" className="btn ghost" onClick={() => setPage("classroom")}>
                {t("backToClassroom")}
              </button>
            </div>
          </div>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </>
    );
  }

  if (view === "reflect") {
    return (
      <>
        <div className="wrapw reveal" style={{ maxWidth: 720 }}>
          <div className="card ai row center" style={{ gap: 12, marginBottom: 18 }}>
            <span className="pill green">
              {ICONS.check} {t("feedbackSentXp")}
            </span>
            <div className="grow dim" style={{ fontSize: 12.5 }}>
              {t("reflectLastStep")}
            </div>
          </div>
          <div className="card col" style={{ gap: 16 }}>
            <div>
              <div className="sect-title" style={{ fontSize: 19 }}>
                {t("closeLoopTitle")}
              </div>
              <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>
                {t("closeLoopSub")}
              </div>
            </div>
            <div className="fieldrow">
              <label>{t("reflectLearned", { name: peerShort })}</label>
              <textarea
                className="ta"
                rows={3}
                value={learned}
                onChange={(e) => setLearned(e.target.value)}
              />
            </div>
            <div className="fieldrow">
              <label>{t("reflectNextTask")}</label>
              <textarea
                className="ta"
                rows={2}
                value={nextTry}
                onChange={(e) => setNextTry(e.target.value)}
              />
            </div>
            <div className="row center" style={{ gap: 10 }}>
              <span className="lbl">{t("matchUseful")}</span>
              <Scale value={usefulness} onChange={setUsefulness} compact />
            </div>
            <button
              type="button"
              className="btn primary block"
              onClick={() => setView("loopclosed")}
            >
              {t("finishReflection")}
            </button>
          </div>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </>
    );
  }

  if (view === "evaluate") {
    return (
      <>
        <div className="wrapw reveal">
          <div className="card row center" style={{ gap: 14, marginBottom: 18 }}>
            <span className="pill ai">
              {ICONS.pencil} {t("reviewing")}
            </span>
            <div className="grow">
              <div className="h3" style={{ fontSize: 13.5 }}>
                {ev.name} · &ldquo;{sub.task_title || "Weekly report"}&rdquo; · {deptLine}
              </div>
            </div>
            <span className="dim mono" style={{ fontSize: 11 }}>
              {t("earnsXp")}
            </span>
          </div>
          <div className="resp">
            <div className="card" style={{ width: 320, flex: "none" }}>
              <div className="lbl" style={{ marginBottom: 10 }}>
                {t("theirArtifact")}
              </div>
              <div
                className="img-ph"
                style={{
                  height: 140,
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  padding: 13,
                  gap: 7,
                }}
              >
                <FakeLines n={4} />
              </div>
              <div className="card tint" style={{ marginTop: 11, padding: 11 }}>
                <div className="lbl" style={{ marginBottom: 5 }}>
                  {t("theirNote")}
                </div>
                <div
                  className="dim serif"
                  style={{ fontSize: 12.5, lineHeight: 1.5, fontStyle: "italic" }}
                >
                  {shortNote}
                </div>
              </div>
            </div>
            <div className="grow">
              <div className="card">
                <div style={{ marginBottom: 18 }}>
                  <div className="h3" style={{ fontSize: 13, marginBottom: 10 }}>
                    {t("rubricSimplify")}
                  </div>
                  <Scale value={simplifyScore} onChange={setSimplifyScore} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <div className="h3" style={{ fontSize: 13, marginBottom: 10 }}>
                    How clearly does it show{" "}
                    <i>how AI was used &amp; where to double-check?</i>
                  </div>
                  <Scale value={clarityScore} onChange={setClarityScore} />
                </div>
                <div className="row" style={{ gap: 14 }}>
                  <div className="grow fieldrow">
                    <label>{t("keepOne")}</label>
                    <textarea
                      className="ta"
                      rows={3}
                      placeholder={t("keepPh")}
                      value={keepText}
                      onChange={(e) => setKeepText(e.target.value)}
                    />
                  </div>
                  <div className="grow fieldrow">
                    <label>{t("tryOne")}</label>
                    <textarea
                      className="ta"
                      rows={3}
                      placeholder={t("tryPh")}
                      value={tryText}
                      onChange={(e) => setTryText(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row center" style={{ gap: 12, marginTop: 18 }}>
                  <button
                    type="button"
                    className="btn ai sm"
                    onClick={() => flash("Drafting feedback… edit before sending")}
                  >
                    {ICONS.spark} {t("draftFeedbackAi")}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    style={{ marginLeft: "auto" }}
                    onClick={sendEvaluation}
                  >
                    Send feedback →
                  </button>
                </div>
              </div>
              <div
                className="mono dim"
                style={{ fontSize: 11, marginTop: 12, textAlign: "center" }}
              >
                {t("evalFocusHint")}
              </div>
            </div>
          </div>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </>
    );
  }

  if (view === "schedule") {
    return (
      <>
        <div className="wrapw reveal" style={{ maxWidth: 780 }}>
          <div className="resp">
            <div className="grow col">
              <div>
                <div className="sect-title" style={{ fontSize: 21 }}>
                  {t("scheduleTitle")}
                </div>
                <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>
                  {t("scheduleSub", { name: ev.name || "Tomáš N." })}
                </div>
              </div>
              <div className="card">
                <div className="lbl" style={{ marginBottom: 12 }}>
                  {t("pickTimeToday")}
                </div>
                <div className="tiles c3">
                  {SCHEDULE_SLOTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`tile ${scheduleTime === s ? "on" : ""}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                      onClick={() => setScheduleTime(s)}
                    >
                      <b className="mono">{s}</b>
                      <span className="tick">{ICONS.check}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="lbl" style={{ marginBottom: 12 }}>
                  {t("whereMeet")}
                </div>
                <div className="tiles c2">
                  <button
                    type="button"
                    className={`tile ${scheduleWhere === "inperson" ? "on" : ""}`}
                    onClick={() => setScheduleWhere("inperson")}
                  >
                    <div className="tile-head">
                      <span className="ti-ic">{ICONS.users}</span>
                      <span className="tick">{ICONS.check}</span>
                    </div>
                    <b>{t("inPerson")}</b>
                    <small>{t("inPersonSub")}</small>
                  </button>
                  <button
                    type="button"
                    className={`tile ${scheduleWhere === "video" ? "on" : ""}`}
                    onClick={() => setScheduleWhere("video")}
                  >
                    <div className="tile-head">
                      <span className="ti-ic">{ICONS.chat}</span>
                      <span className="tick">{ICONS.check}</span>
                    </div>
                    <b>{t("videoCall")}</b>
                    <small>{t("videoCallSub")}</small>
                  </button>
                </div>
              </div>
            </div>
            <div className="rail col">
              <div className="card ai">
                <div className="lbl" style={{ marginBottom: 9 }}>
                  {t("yourSession")}
                </div>
                <div className="h3" style={{ fontSize: 15 }}>
                  Today · {scheduleTime}
                </div>
                <div className="dim mono" style={{ fontSize: 11, marginTop: 3 }}>
                  Table 4 · with {ev.name || "Tomáš N."}
                </div>
              </div>
              <button type="button" className="btn primary block" onClick={confirmSchedule}>
                {t("confirmPrepReview")}
              </button>
              <button type="button" className="btn ghost block" onClick={() => setView("peers")}>
                {t("backToMatch")}
              </button>
            </div>
          </div>
        </div>
        {toast && <div className="toast show">{toast}</div>}
      </>
    );
  }

  return (
    <>
      <div className="wrapw reveal">
        <div className="card ai row center" style={{ gap: 16, marginBottom: 18 }}>
          <span className="pill green">
            {ICONS.check} matched
          </span>
          <div className="grow">
            <div className="h3">You&apos;re paired with {peerLabel(active)}</div>
            <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
              {t("crossTeamMatchSub")}
            </div>
          </div>
          <div className="row center" style={{ gap: 8 }}>
            <PeerAv ai>You</PeerAv>
            <span className="dim">{ICONS.swap}</span>
            <PeerAv>{peerInits}</PeerAv>
          </div>
        </div>
        <div className="resp">
          <div className="card" style={{ width: 340, flex: "none" }}>
            <div className="row center" style={{ gap: 10, marginBottom: 12 }}>
              <PeerAv>{peerInits}</PeerAv>
              <div>
                <div className="h3" style={{ fontSize: 13 }}>
                  {peerShort}&apos;s submission
                </div>
                <div className="dim mono" style={{ fontSize: 10.5 }}>
                  {toolLine}
                </div>
              </div>
            </div>
            <div
              className="img-ph"
              style={{
                height: 150,
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                padding: 14,
                gap: 8,
              }}
            >
              <FakeLines n={5} />
            </div>
            <div className="card tint" style={{ marginTop: 12, padding: 11 }}>
              <div className="lbl" style={{ marginBottom: 5 }}>
                Their note
              </div>
              <div
                className="dim serif"
                style={{ fontSize: 12.5, lineHeight: 1.5, fontStyle: "italic" }}
              >
                {MATCHED_NOTE}
              </div>
            </div>
          </div>
          <div className="grow col">
            <div className="card row center" style={{ gap: 14 }}>
              <span className="mi ai">{ICONS.cal}</span>
              <div className="grow">
                <div className="h3">{t("bookSession")}</div>
                <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {t("bookSessionSub")}
                </div>
              </div>
              <button type="button" className="btn ai" onClick={() => setView("schedule")}>
                Schedule →
              </button>
            </div>
            <div className="card row center" style={{ gap: 14 }}>
              <span className="mi green">{ICONS.pencil}</span>
              <div className="grow">
                <div className="h3">{t("reviewAsync")}</div>
                <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
                  Fill the short rubric — focus on <i>how</i> AI was used.
                </div>
              </div>
              <button type="button" className="btn primary" onClick={() => setView("evaluate")}>
                Start review →
              </button>
            </div>
            <div className="mono dim" style={{ fontSize: 11, textAlign: "center", marginTop: 2 }}>
              {t("loopClosesHint")}
            </div>
          </div>
        </div>
      </div>
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}

export { PeerEvaluationPage };

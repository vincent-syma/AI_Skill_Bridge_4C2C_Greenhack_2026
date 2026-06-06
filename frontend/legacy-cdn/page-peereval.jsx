/* ============================================================
   page-peereval.jsx — Peer Evaluation page (API-backed)
   ============================================================ */

const SLOT_DAYS = [["Mon", "dayMon"], ["Tue", "dayTue"], ["Wed", "dayWed"], ["Thu", "dayThu"], ["Fri", "dayFri"]];
const SLOT_TIMES = ["09:00", "11:00", "13:00", "15:00"];

function peerInitials(name) {
  if (!name) return "??";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function PeerEvaluationPage() {
  const { t, setPage } = useApp();
  const [tab, setTab] = React.useState("toGive");
  const [queue, setQueue] = React.useState([]);
  const [received, setReceived] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeEval, setActiveEval] = React.useState(null);
  const [toast, setToast] = React.useState("");
  const [slots, setSlots] = React.useState({});
  const [slotsLoading, setSlotsLoading] = React.useState(false);

  const flash = (msg) => { setToast(msg); window.setTimeout(() => setToast(""), 1800); };

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const [q, r] = await Promise.all([
        API.peerEvals.queue(),
        API.peerEvals.received(),
      ]);
      setQueue(q);
      setReceived(r);
    } catch (e) {
      flash("Load error: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSlots = React.useCallback(async () => {
    setSlotsLoading(true);
    try {
      const a = await API.availability.get();
      setSlots(a.slots || {});
    } catch (e) {
      // ignore — slots stay empty
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  React.useEffect(() => { loadAll(); }, [loadAll]);
  React.useEffect(() => { if (tab === "availability") loadSlots(); }, [tab]);

  const openCount = Object.values(slots).filter((v) => v === "open").length;
  const bookedCount = Object.values(slots).filter((v) => v === "booked").length;
  const confirmedCount = received.filter((r) => r.status === "confirmed").length;

  const submitEvaluation = async (evalId, payload) => {
    try {
      await API.peerEvals.submit(evalId, payload);
      setQueue((prev) => prev.filter((x) => x.id !== evalId));
      setActiveEval(null);
      flash(t("evalSentToast"));
    } catch (e) {
      flash("Submit error: " + e.message);
    }
  };

  const confirmReview = async (id) => {
    try {
      await API.peerEvals.confirm(id);
      setReceived((prev) => prev.map((r) => r.id === id ? { ...r, status: "confirmed" } : r));
      flash(t("feedbackConfirmedToast"));
    } catch (e) {
      flash("Error: " + e.message);
    }
  };

  const toggleSlot = (day, time) => {
    const key = `${day}|${time}`;
    setSlots((prev) => {
      const cur = prev[key] || "closed";
      if (cur === "booked") return prev;
      return { ...prev, [key]: cur === "open" ? "closed" : "open" };
    });
  };

  const saveSlots = async () => {
    setSlotsLoading(true);
    try {
      // Only send non-closed slots
      const toSave = Object.fromEntries(
        Object.entries(slots).filter(([, v]) => v !== "closed")
      );
      await API.availability.set(toSave);
      flash(t("toastAvailability") || "Availability saved");
    } catch (e) {
      flash("Error saving: " + e.message);
    } finally {
      setSlotsLoading(false);
    }
  };

  return (
    <div className="col">
      <div className="row center between wrap">
        <div style={{ minWidth: 0 }}>
          <h1 className="h1">{t("peerEvaluation")}</h1>
          <div className="dim" style={{ fontSize: 12.5, marginTop: 4 }}>{t("peerEvalSub")}</div>
        </div>
        <div className="row center tight">
          <span className="pill accent">{t("reviewXp")}</span>
          <span className="pill">{queue.length} {t("pending")}</span>
        </div>
      </div>

      <div className="g3">
        <div className="card stat">
          <span className="lbl">{t("peersWaitingStat")}</span>
          <div className="num">{loading ? "…" : queue.length}</div>
          <div className="sub">{t("autoMatchedSubmissions")}</div>
        </div>
        <div className="card stat">
          <span className="lbl">{t("confirmedReviews")}</span>
          <div className="num">{loading ? "…" : confirmedCount}</div>
          <div className="sub">{t("feedbackLoopsClosed")}</div>
        </div>
        <div className="card stat">
          <span className="lbl">{t("openSlots")}</span>
          <div className="num">{slotsLoading ? "…" : openCount}</div>
          <div className="sub">{bookedCount} {t("reviewBooked")}</div>
        </div>
      </div>

      <div className="seg" style={{ alignSelf: "flex-start" }}>
        <button className={tab === "toGive" ? "on" : ""} onClick={() => setTab("toGive")}>{t("toEvaluate")}</button>
        <button className={tab === "reviews" ? "on" : ""} onClick={() => setTab("reviews")}>{t("myReviews")}</button>
        <button className={tab === "availability" ? "on" : ""} onClick={() => setTab("availability")}>{t("availability")}</button>
      </div>

      {tab === "toGive" && (
        <div className="col">
          {loading && <div className="card tint dim" style={{ padding: 16, textAlign: "center", fontSize: 13 }}>Loading…</div>}
          {!loading && queue.length === 0 && <div className="card tint">{t("noQueue")}</div>}
          {queue.map((q) => (
            <div key={q.id} className="card eval-row">
              <Av size="sm">{peerInitials(q.evaluatee?.name)}</Av>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="h3">{q.evaluatee?.name || "Peer"}</div>
                <div className="dim" style={{ fontSize: 12 }}>
                  {q.submission?.task_title} · {q.submission?.task_category} · {(() => {
                    const d = Math.floor((Date.now() - new Date(q.created_at)) / 60000);
                    return d < 60 ? `${d}min` : d < 1440 ? `${Math.floor(d / 60)}h` : `${Math.floor(d / 1440)}d`;
                  })()} {t("ago")}
                </div>
              </div>
              <button className="btn primary sm" onClick={() => setActiveEval(q)}>{t("startEvaluation")}</button>
            </div>
          ))}
        </div>
      )}

      {tab === "reviews" && (
        <div className="g2">
          {loading && <div className="card dim" style={{ padding: 16 }}>Loading…</div>}
          {!loading && received.length === 0 && <div className="card tint dim" style={{ padding: 16 }}>{t("noReviews") || "No reviews received yet"}</div>}
          {received.map((r) => (
            <div key={r.id} className="card col" style={{ gap: 9 }}>
              <div className="row center between wrap">
                <span className="pill">{r.evaluator?.name || "Peer"}</span>
                {r.overall_pass != null && (
                  <Stars n={r.overall_pass ? 4 : 2} />
                )}
              </div>
              <div className="h3">{r.submission?.task_title}</div>
              {r.feedback && <div className="fb-quote">"{r.feedback}"</div>}
              <div className="row center between wrap">
                <span className="dim" style={{ fontSize: 12 }}>
                  {r.status === "confirmed" ? t("confirmedLabel") : t("needsConfirmation")}
                </span>
                {r.status !== "confirmed" && (
                  <button className="btn sm" onClick={() => confirmReview(r.id)}>{t("confirmHelpful")}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "availability" && (
        <div className="card col" style={{ gap: 12 }}>
          <div className="row center between wrap">
            <div>
              <div className="h2">{t("availability")}</div>
              <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>{t("manageAvailability")}</div>
            </div>
            <div className="row center tight">
              <span className="pill accent">{openCount} {t("reviewOpen")}</span>
              <span className="pill">{bookedCount} {t("reviewBooked")}</span>
            </div>
          </div>
          {slotsLoading && <div className="dim" style={{ fontSize: 12 }}>Loading…</div>}
          <div className="slot-grid">
            <div />
            {SLOT_DAYS.map(([d, key]) => <div key={d} className="slot-head">{t(key)}</div>)}
            {SLOT_TIMES.map((tm) => (
              <React.Fragment key={tm}>
                <div className="slot-time">{tm}</div>
                {SLOT_DAYS.map(([d]) => {
                  const st = slots[`${d}|${tm}`] || "closed";
                  return (
                    <button key={d + tm} className={`slot-cell ${st}`} onClick={() => toggleSlot(d, tm)}>
                      {st === "booked" ? "P" : st === "open" ? "✓" : ""}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <button className="btn primary sm" style={{ alignSelf: "flex-start" }} onClick={saveSlots} disabled={slotsLoading}>
            {slotsLoading ? "…" : (t("save") || "Save availability")}
          </button>
        </div>
      )}

      {activeEval && (
        <EvaluationModal
          item={activeEval}
          onClose={() => setActiveEval(null)}
          onSubmit={(payload) => submitEvaluation(activeEval.id, payload)}
        />
      )}
      {toast && <div className="mini-toast">{toast}</div>}
    </div>
  );
}

function EvaluationModal({ item, onClose, onSubmit }) {
  const { t } = useApp();
  const [score, setScore] = React.useState(4);
  const [passed, setPassed] = React.useState(true);
  const [feedback, setFeedback] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) { return; }
    setSubmitting(true);
    try {
      await onSubmit({
        responses: [],
        overall_pass: passed,
        feedback: feedback.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="eval-overlay" onClick={onClose}>
      <div className="eval-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row center between">
          <div>
            <h2 className="h2">{t("startEvaluation")}</h2>
            <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>
              {item.evaluatee?.name || "Peer"} · {item.submission?.task_title}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}>{ICONS.x}</button>
        </div>
        <div className="card tint flat col" style={{ gap: 8 }}>
          <span className="lbl">{t("evidence")}</span>
          <div style={{ fontSize: 13, lineHeight: 1.6, maxHeight: 150, overflowY: "auto", padding: 8 }}>
            {item.submission?.content || <ImgPh label={t("submittedResult")} h={105} />}
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="lbl">{t("rubric")}</span>
          {["correctness", "clarity", "responsibleAiUse"].map((key) => (
            <label key={key} className="rubric-row">
              <span>{t(key)}</span>
              <input type="range" min="1" max="5" defaultValue={4} />
            </label>
          ))}
        </div>
        <label className="col" style={{ gap: 7 }}>
          <span className="lbl">{t("feedback")} <span style={{ color: "#f87171" }}>*</span></span>
          <textarea className="eval-text" placeholder={t("feedbackPh")}
            value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </label>
        <div className="row center between wrap">
          <div className="row center tight">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} className={"rating" + (n <= score ? " on" : "")} onClick={() => setScore(n)}>★</button>)}
          </div>
          <label className="row center tight" style={{ fontSize: 12 }}>
            <input type="checkbox" checked={passed} onChange={(e) => setPassed(e.target.checked)} /> {t("passesRubric")}
          </label>
        </div>
        <div className="row center" style={{ justifyContent: "flex-end" }}>
          <button className="btn sm" onClick={onClose}>{t("cancel")}</button>
          <button className="btn primary sm" disabled={!feedback.trim() || submitting} onClick={handleSubmit}>
            {submitting ? "…" : t("submitEvaluation")}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PeerEvaluationPage });

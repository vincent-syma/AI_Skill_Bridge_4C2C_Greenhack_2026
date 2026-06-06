/* ============================================================
   page-projects.jsx — Projects page (API-backed)
   ============================================================ */

// Map backend user_status to display metadata
const PROJECT_STATUS = {
  not_started: { cls: "go",     key: "projectStatusGo" },
  doing:       { cls: "doing",  key: "projectStatusDoing" },
  submitted:   { cls: "review", key: "projectStatusReview" },
  completed:   { cls: "done",   key: "projectStatusDone" },
};
const PROJECT_FILTERS = [
  ["all", "filterAll"],
  ["not_started", "projectStatusGo"],
  ["doing", "projectStatusDoing"],
  ["submitted", "projectStatusReview"],
  ["completed", "projectStatusDone"],
];
const PROJECT_SLOT_DAYS = [["Mon", "dayMon"], ["Tue", "dayTue"], ["Wed", "dayWed"], ["Thu", "dayThu"], ["Fri", "dayFri"]];
const PROJECT_SLOT_TIMES = ["09:00", "10:30", "13:00", "14:30", "16:00"];

function ProjectDiff({ n }) {
  const { t } = useApp();
  return <span className="diff" title={t("difficultyTitle", { n })}>{[1, 2, 3].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</span>;
}
function ProjectStatusChip({ status }) {
  const { t } = useApp();
  const m = PROJECT_STATUS[status] || PROJECT_STATUS.not_started;
  return <span className={"chip " + m.cls}><span className="dot" /> {t(m.key)}</span>;
}
function ProjectToast() {
  const [msg, setMsg] = React.useState(null);
  const timerRef = React.useRef(null);
  const fire = (m) => {
    setMsg(m);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setMsg(null), 2300);
  };
  return [msg ? <div className="mini-toast">✓ {msg}</div> : null, fire];
}

function ProjectModal({ title, sub, onClose, children, foot }) {
  return (
    <div className="eval-overlay" onClick={onClose}>
      <div className="eval-modal project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row center between">
          <div>
            <h2 className="h2">{title}</h2>
            {sub && <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
          </div>
          <button className="iconbtn" onClick={onClose}>{ICONS.x}</button>
        </div>
        {children}
        {foot && <div className="row wrap" style={{ gap: 9, justifyContent: "flex-end", marginTop: 2 }}>{foot}</div>}
      </div>
    </div>
  );
}

function ProjectSlotScheduler({ slots, setSlots, readOnly }) {
  const { t } = useApp();
  const toggle = (key) => {
    if (readOnly) return;
    setSlots((prev) => {
      const cur = prev[key];
      if (cur && typeof cur === "string" && cur === "booked") return prev;
      const next = { ...prev };
      if (cur === "open") delete next[key];
      else next[key] = "open";
      return next;
    });
  };
  const openCount = Object.values(slots).filter((v) => v === "open").length;
  const bookedCount = Object.values(slots).filter((v) => v === "booked").length;

  return (
    <div className="slotwrap">
      <div className="slotgrid">
        <span className="gh" />
        {PROJECT_SLOT_DAYS.map(([d, key]) => <span key={d} className="gh">{t(key)}</span>)}
        {PROJECT_SLOT_TIMES.map((tm) => (
          <React.Fragment key={tm}>
            <span className="gt">{tm}</span>
            {PROJECT_SLOT_DAYS.map(([d]) => {
              const key = d + "-" + tm;
              const v = slots[key];
              const booked = v === "booked";
              const cls = "slot " + (booked ? "booked" : v === "open" ? "open" : "off");
              return (
                <div key={key} className={cls} onClick={() => toggle(key)}
                  title={booked ? t("bookedBy", { by: "peer" }) : v === "open" ? t("openClickClose") : t("clickOpenSlot")}>
                  {booked ? "P" : v === "open" ? "✓" : ""}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="row center between wrap" style={{ gap: 10 }}>
        <div className="slot-legend">
          <span><i className="open" /> {t("open")} ({openCount})</span>
          <span><i className="booked" /> {t("booked")} ({bookedCount})</span>
          <span><i /> {t("closed")}</span>
        </div>
        {!readOnly && <span className="dim" style={{ fontSize: 12 }}>{t("tapCell")}</span>}
      </div>
    </div>
  );
}

function ProjectNode({ p, on, onClick }) {
  const { t } = useApp();
  return (
    <div className={"pnode" + (on ? " on" : "")} onClick={() => onClick(p)}>
      <div className="row center between" style={{ gap: 8 }}>
        <span className="pill">{p.category || "General"}</span>
        <ProjectDiff n={p.difficulty || 1} />
      </div>
      <div className="pn-title">{p.title}</div>
      <div className="pn-foot">
        <ProjectStatusChip status={p.user_status} />
        {p.user_status === "completed" && p.my_grade
          ? <Stars n={Math.round(p.my_grade)} />
          : <span className="pill accent">+{p.xp_reward}</span>}
      </div>
    </div>
  );
}

function ProjectDetail({ p, onStart, onSaveNotes, onSubmit, onRetry, openSlots, toast }) {
  const { t } = useApp();
  const [subjectOpen, setSubjectOpen] = React.useState(true);
  const [notes, setNotes] = React.useState(p.my_notes || "");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    setNotes(p.my_notes || "");
    setSubjectOpen(true);
  }, [p.id]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await onSaveNotes(p.id, notes);
      toast(t("toastNotesSaved"));
    } catch (e) {
      toast("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card grow col project-detail" style={{ gap: 13 }}>
      <div className="row center between wrap" style={{ gap: 8 }}>
        <ProjectStatusChip status={p.user_status} />
        <div className="row center tight"><span className="pill accent">+{p.xp_reward} XP</span><ProjectDiff n={p.difficulty || 1} /></div>
      </div>
      <h2 className="h2 project-title">{p.title}</h2>
      {p.description && <div className="dim" style={{ fontSize: 13 }}>{p.description}</div>}

      <div className="subject">
        <div className={"subj-head" + (subjectOpen ? "" : " closed")} onClick={() => setSubjectOpen((v) => !v)}>
          <span className="lbl">{t("subjectHow")}</span>
          <span className="dim" style={{ fontSize: 12 }}>{subjectOpen ? t("hide") : t("show")}</span>
        </div>
        {subjectOpen && (
          <div className="subj-body">
            <div className="dim" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{p.instructions}</div>
            {(p.tools || []).length > 0 && (
              <div className="row wrap center" style={{ gap: 6, marginTop: 8 }}>
                <span className="lbl">{t("suggestedTools")}</span>
                {p.tools.map((tname) => <Pill key={tname}>{tname}</Pill>)}
              </div>
            )}
          </div>
        )}
      </div>

      <label className="col" style={{ gap: 7 }}>
        <span className="lbl">{t("yourNotes")}</span>
        <textarea className="notes" value={notes}
          disabled={p.user_status === "submitted" || p.user_status === "not_started"}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")} />
      </label>

      {p.user_status === "completed" && p.my_grade && (
        <div className="card tint flat col" style={{ gap: 7, padding: 12 }}>
          <div className="row center between"><span className="lbl">{t("yourGrade")}</span><Stars n={Math.round(p.my_grade)} /></div>
        </div>
      )}

      {p.user_status === "submitted" && (
        <div className="card tint flat col review-box" style={{ gap: 8, padding: 12 }}>
          <span className="lbl">{t("waitingPeerEval")}</span>
          <span style={{ fontSize: 13 }}>{t("autoMatchPeer")}</span>
          <button className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => openSlots(p)}>{t("manageEvalSlots")}</button>
        </div>
      )}

      <div className="row wrap" style={{ gap: 9, marginTop: 2 }}>
        {p.user_status === "not_started" && (
          <button className="btn primary" onClick={() => onStart(p.id)}>{t("startProject")}</button>
        )}
        {p.user_status === "doing" && (
          <>
            <button className="btn" onClick={handleSaveNotes} disabled={saving}>{saving ? "…" : t("saveNotes")}</button>
            <button className="btn primary" onClick={() => onSubmit(p, notes)}>{t("closeRequestEval")}</button>
          </>
        )}
        {p.user_status === "submitted" && (
          <button className="btn" onClick={async () => { await onRetry(p.id); }}>{t("reopenSubmission")}</button>
        )}
        {p.user_status === "completed" && (
          <button className="btn" onClick={() => onRetry(p.id)}>{t("retryImprove")}</button>
        )}
      </div>
    </div>
  );
}

function RequestProjectEvaluationModal({ p, slots: initSlots, onClose, onConfirm }) {
  const { t } = useApp();
  const [slots, setSlots] = React.useState(initSlots || {});
  const openCount = Object.values(slots).filter((v) => v === "open").length;
  return (
    <ProjectModal
      title={t("closeProjectSlots")}
      sub={p.title}
      onClose={onClose}
      foot={[
        <button key="c" className="btn sm" onClick={onClose}>{t("cancel")}</button>,
        <button key="o" className="btn primary sm" onClick={() => onConfirm(slots)}>
          {t(openCount === 1 ? "openSlotRequestOne" : "openSlotRequestMany", { count: openCount || "" })}
        </button>,
      ]}
    >
      <div className="card tint flat" style={{ padding: 11 }}>
        <span className="dim" style={{ fontSize: 12 }}>{t("closeProjectHelp", { cat: p.category || "" })}</span>
      </div>
      <span className="lbl">{t("openAvailabilityWeek")}</span>
      <ProjectSlotScheduler slots={slots} setSlots={setSlots} />
    </ProjectModal>
  );
}

function ProjectsPage() {
  const { t } = useApp();
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selId, setSelId] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const [reqProj, setReqProj] = React.useState(null);
  const [slotProj, setSlotProj] = React.useState(null);
  const [currentSlots, setCurrentSlots] = React.useState({});
  const [toastNode, toast] = ProjectToast();

  const loadProjects = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.projects.list();
      setProjects(data);
      if (!selId && data.length > 0) {
        // Default-select first in-progress, else first not_started, else first
        const doing = data.find((p) => p.user_status === "doing");
        const ns = data.find((p) => p.user_status === "not_started");
        setSelId((doing || ns || data[0]).id);
      }
    } catch (e) {
      toast("Failed to load projects: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadProjects(); }, [loadProjects]);

  // Load availability slots for the modal
  React.useEffect(() => {
    API.availability.get().then((a) => setCurrentSlots(a.slots || {})).catch(() => {});
  }, []);

  const sel = projects.find((x) => x.id === selId) || projects[0];
  const shown = projects.filter((p) => filter === "all" || p.user_status === filter);
  const counts = (s) => s === "all" ? projects.length : projects.filter((p) => p.user_status === s).length;
  const done = projects.filter((p) => p.user_status === "completed").length;

  const handleStart = async (id) => {
    try {
      await API.projects.start(id);
      toast(t("toastStarted"));
      await loadProjects();
      setSelId(id);
    } catch (e) {
      toast("Error: " + e.message);
    }
  };

  const handleSaveNotes = async (id, notes) => {
    await API.projects.saveNotes(id, notes);
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, my_notes: notes } : p));
  };

  const handleSubmit = async (p, notes) => {
    setReqProj({ ...p, pendingNotes: notes });
  };

  const confirmSubmit = async (slots) => {
    if (!reqProj) return;
    try {
      // Save availability slots
      if (Object.keys(slots).length > 0) {
        await API.availability.set(slots);
        setCurrentSlots(slots);
      }
      await API.projects.submit(reqProj.id, reqProj.pendingNotes);
      toast(t("toastClosedEval"));
      setReqProj(null);
      await loadProjects();
    } catch (e) {
      toast("Error: " + e.message);
      setReqProj(null);
    }
  };

  const handleRetry = async (id) => {
    try {
      await API.projects.retry(id);
      toast(t("toastRetry"));
      await loadProjects();
      setSelId(id);
    } catch (e) {
      // If retry fails (e.g. not completed), just move back to doing for submitted
      toast(t("toastReopened"));
    }
  };

  if (loading) {
    return (
      <div className="col projects-page">
        <div className="card dim" style={{ padding: 24, textAlign: "center" }}>Loading projects…</div>
      </div>
    );
  }

  return (
    <div className="col projects-page">
      <div className="row center between wrap" style={{ gap: 10 }}>
        <div>
          <h1 className="h1">{t("projects")}</h1>
          <div className="dim" style={{ fontSize: 12.5, marginTop: 4 }}>{t("projectsSub")}</div>
        </div>
        <div className="row center" style={{ gap: 14 }}>
          <div className="kv"><span className="v">{done}/{projects.length}</span><span className="k">{t("completed")}</span></div>
        </div>
      </div>

      <div className="ptabs">
        {PROJECT_FILTERS.map(([k, labelKey]) => (
          <button key={k} className={"ptab" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>
            {t(labelKey)} <span className="cnt">{counts(k)}</span>
          </button>
        ))}
      </div>

      <div className="project-layout">
        <div className="project-list">
          <div className="pgraph">
            {shown.map((p, i) => (
              <React.Fragment key={p.id}>
                <ProjectNode p={p} on={p.id === selId} onClick={(p) => setSelId(p.id)} />
                {i < shown.length - 1 && <span className="gconn" />}
              </React.Fragment>
            ))}
            {shown.length === 0 && <div className="card tint dim" style={{ padding: 16, textAlign: "center" }}>{t("noProjectsInView")}</div>}
          </div>
        </div>
        {sel && (
          <ProjectDetail
            p={sel}
            onStart={handleStart}
            onSaveNotes={handleSaveNotes}
            onSubmit={handleSubmit}
            onRetry={handleRetry}
            openSlots={setSlotProj}
            toast={toast}
          />
        )}
      </div>

      {reqProj && (
        <RequestProjectEvaluationModal
          p={reqProj}
          slots={currentSlots}
          onClose={() => setReqProj(null)}
          onConfirm={confirmSubmit}
        />
      )}
      {slotProj && (
        <ProjectModal title={t("evalSlots")} sub={slotProj.title} onClose={() => setSlotProj(null)}
          foot={[<button key="d" className="btn primary sm" onClick={() => setSlotProj(null)}>{t("done")}</button>]}>
          <ProjectSlotScheduler slots={currentSlots} setSlots={setCurrentSlots} />
        </ProjectModal>
      )}
      {toastNode}
    </div>
  );
}

Object.assign(window, { ProjectsPage });

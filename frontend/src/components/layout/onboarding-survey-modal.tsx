"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ICONS } from "@/components/ui/icons";
import { useApp } from "@/providers/app-context";
import { API } from "@/lib/api";

const GOAL_OPTIONS = [
  { id: "emails", labelKey: "onboardGoalEmails" },
  { id: "excel", labelKey: "onboardGoalExcel" },
  { id: "market", labelKey: "onboardGoalMarket" },
  { id: "tools", labelKey: "onboardGoalTools" },
  { id: "slides", labelKey: "onboardGoalSlides" },
  { id: "workshops", labelKey: "onboardGoalWorkshops" },
  { id: "methodical", labelKey: "onboardGoalMethodical" },
] as const;

// Static fallback list — no /departments endpoint is wired client-side,
// and the field is free-form so we just suggest common teams.
const DEPT_SUGGESTIONS = [
  "Marketing",
  "Sales",
  "HR",
  "Engineering",
  "Operations",
  "Finance",
  "Legal",
  "Customer Success",
];

const COMFORT_LABELS = ["new", "curious", "trying", "comfy", "fluent"] as const;

export function OnboardingSurveyModal() {
  const { t, profile, startHacking, completeOnboarding } = useApp();
  const firstName = (profile.name || "").split(" ")[0] || profile.name;
  const [step, setStep] = useState(0);
  const [department, setDepartment] = useState(profile.department || "");
  const [goals, setGoals] = useState<string[]>([]);
  const [comfort, setComfort] = useState<number>(3);
  const [peerCount, setPeerCount] = useState<number | null>(null);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Debounced peer-count lookup whenever department changes on step 1.
  const peerReqRef = useRef(0);
  useEffect(() => {
    if (step !== 1) return;
    const dept = department.trim();
    if (!dept) {
      setPeerCount(null);
      return;
    }
    setLoadingPeers(true);
    const reqId = ++peerReqRef.current;
    const id = window.setTimeout(() => {
      API.teams
        .peerCount(dept)
        .then((res) => {
          if (peerReqRef.current !== reqId) return;
          setPeerCount(res?.peer_count ?? null);
        })
        .catch(() => {
          if (peerReqRef.current !== reqId) return;
          setPeerCount(null);
        })
        .finally(() => {
          if (peerReqRef.current === reqId) setLoadingPeers(false);
        });
    }, 350);
    return () => window.clearTimeout(id);
  }, [department, step]);

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await startHacking({
        department: department.trim(),
        goals: [...goals, `comfort:${comfort}`],
      });
    } finally {
      setSaving(false);
    }
  };

  const canNextDept = department.trim().length > 0;
  const canFinish = goals.length > 0 && !saving;

  const peerLine = useMemo(() => {
    if (!department.trim()) return null;
    if (loadingPeers && peerCount === null) return t("onboardPeerLoading");
    if (peerCount === null) return null;
    return t("onboardPeerCount", { count: peerCount, dept: department.trim() });
  }, [department, loadingPeers, peerCount, t]);

  return (
    <div className="eval-overlay onboard-overlay" role="dialog" aria-modal="true">
      <div
        className="eval-modal onboard-modal onboard-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        {/* step indicator */}
        <div className="row center onboard-dots" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`dot${i === step ? " on" : ""}${i < step ? " done" : ""}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="col g3">
            <h1 className="display d2" style={{ textAlign: "center" }}>
              {t("onboardWelcomeDisplay")}
            </h1>
            <p className="onboard-body" style={{ textAlign: "center", margin: 0 }}>
              {t("tagline")}
            </p>
            <p className="onboard-body" style={{ textAlign: "center", margin: 0 }}>
              {t("onboardWelcomeReassure")}
            </p>
            <div className="row center" style={{ justifyContent: "center", marginTop: 4 }}>
              <button type="button" className="btn primary" onClick={() => setStep(1)}>
                {t("onboardStart")}
              </button>
            </div>
            <button
              type="button"
              className="btn tiny onboard-skip"
              onClick={() => completeOnboarding()}
            >
              {t("onboardSkip")}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="col g3">
            <h2 className="d3" style={{ margin: 0 }}>{t("onboardDeptTitle")}</h2>
            <p className="onboard-body" style={{ margin: 0 }}>{t("onboardDeptSub")}</p>

            <div className="field">
              <span className="field-label lbl">{t("onboardDeptLabel")}</span>
              <input
                className="inp"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={t("onboardDeptPlaceholder")}
                autoFocus
                list="onboard-dept-suggest"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canNextDept) setStep(2);
                }}
              />
              <datalist id="onboard-dept-suggest">
                {DEPT_SUGGESTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div className="row g2" style={{ flexWrap: "wrap" }}>
              {DEPT_SUGGESTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`pill${department.trim().toLowerCase() === d.toLowerCase() ? " on" : ""}`}
                  onClick={() => setDepartment(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            {peerLine && (
              <p className="lbl onboard-peer" aria-live="polite">{peerLine}</p>
            )}

            <div className="row between" style={{ marginTop: 4 }}>
              <button type="button" className="btn sm" onClick={() => setStep(0)}>
                {t("onboardBack")}
              </button>
              <button
                type="button"
                className="btn primary sm"
                disabled={!canNextDept}
                onClick={() => setStep(2)}
              >
                {t("onboardNext")}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="col g3">
            <h2 className="d3" style={{ margin: 0 }}>{t("onboardGoalsTitle")}</h2>
            <p className="onboard-body" style={{ margin: 0 }}>{t("onboardGoalsHelper", { name: firstName })}</p>

            <div className="row g2" style={{ flexWrap: "wrap" }}>
              {GOAL_OPTIONS.map((opt) => {
                const selected = goals.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`pill${selected ? " on" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleGoal(opt.id)}
                  >
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
            <p className="lbl" style={{ margin: 0 }}>
              {t("onboardGoalsPicked", { n: goals.length })}
            </p>

            <div className="col g2" style={{ marginTop: 4 }}>
              <div className="row between">
                <span className="lbl">{t("onboardComfortLabel")}</span>
                <span className="num">{comfort} / 5</span>
              </div>
              <input
                className="onboard-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={comfort}
                onChange={(e) => setComfort(Number(e.target.value))}
                aria-label={t("onboardComfortLabel")}
              />
              <div className="row between mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {COMFORT_LABELS.map((k, i) => (
                  <span key={k} aria-current={i + 1 === comfort ? "true" : undefined}>
                    {t(`onboardComfort_${k}`)}
                  </span>
                ))}
              </div>
            </div>

            <div className="row between" style={{ marginTop: 4 }}>
              <button type="button" className="btn sm" onClick={() => setStep(1)}>
                {t("onboardBack")}
              </button>
              {/* Rationed AI gradient moment: the final commit-to-learn CTA. */}
              <button
                type="button"
                className="btn ai sm"
                disabled={!canFinish}
                onClick={finish}
              >
                {ICONS.spark} {saving ? "…" : t("onboardStartHacking")}
              </button>
            </div>
            <button
              type="button"
              className="btn tiny onboard-skip"
              onClick={() => completeOnboarding()}
            >
              {t("onboardSkip")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

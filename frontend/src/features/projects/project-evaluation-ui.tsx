// @ts-nocheck — shared with legacy projects page; tighten types incrementally.
"use client";

import React, { useState } from "react";
import { useApp } from "@/providers/app-context";
import { ICONS } from "@/components/ui/icons";

export const PROJECT_SLOT_DAYS = [
  ["Mon", "dayMon"],
  ["Tue", "dayTue"],
  ["Wed", "dayWed"],
  ["Thu", "dayThu"],
  ["Fri", "dayFri"],
];
export const PROJECT_SLOT_TIMES = ["09:00", "11:00", "13:00", "15:00"];

export function ProjectModal({ title, sub, onClose, children, foot }) {
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
        {foot && (
          <div className="row wrap" style={{ gap: 9, justifyContent: "flex-end", marginTop: 2 }}>
            {foot}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectSlotScheduler({ slots, setSlots, readOnly }) {
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
        {PROJECT_SLOT_DAYS.map(([d, key]) => (
          <span key={d} className="gh">{t(key)}</span>
        ))}
        {PROJECT_SLOT_TIMES.map((tm) => (
          <React.Fragment key={tm}>
            <span className="gt">{tm}</span>
            {PROJECT_SLOT_DAYS.map(([d]) => {
              const key = d + "|" + tm;
              const v = slots[key];
              const booked = v === "booked";
              const cls = "slot " + (booked ? "booked" : v === "open" ? "open" : "off");
              return (
                <div
                  key={key}
                  className={cls}
                  onClick={() => toggle(key)}
                  title={
                    booked
                      ? t("bookedBy", { by: "peer" })
                      : v === "open"
                        ? t("openClickClose")
                        : t("clickOpenSlot")
                  }
                >
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

export function RequestProjectEvaluationModal({ p, slots: initSlots, onClose, onConfirm }) {
  const { t } = useApp();
  const [slots, setSlots] = useState(initSlots || {});
  const openCount = Object.values(slots).filter((v) => v === "open").length;
  return (
    <ProjectModal
      title={t("closeProjectSlots")}
      sub={p.title}
      onClose={onClose}
      foot={[
        <button key="c" className="btn sm" onClick={onClose}>{t("cancel")}</button>,
        <button key="o" className="btn primary sm" onClick={() => onConfirm(slots)}>
          {t(openCount === 1 ? "openSlotRequestOne" : "openSlotRequestMany", {
            count: openCount || "",
          })}
        </button>,
      ]}
    >
      <div className="card tint flat" style={{ padding: 11 }}>
        <span className="dim" style={{ fontSize: 12 }}>
          {t("closeProjectHelp", { cat: p.category || "" })}
        </span>
      </div>
      <span className="lbl">{t("openAvailabilityWeek")}</span>
      <ProjectSlotScheduler slots={slots} setSlots={setSlots} />
    </ProjectModal>
  );
}

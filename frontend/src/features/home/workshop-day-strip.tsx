"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API, type ProjectRead } from "@/lib/api";
import { RISK_CURRICULUM_PATH, RISK_TRACK_TOOL, dayTool } from "@/lib/curriculum/constants";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/providers/app-context";
import { ICONS } from "@/components/ui/icons";

const DAY_META = [
  { day: 1, key: "workshopDay1", missions: ["Hello AI", "Explore tools"] },
  { day: 2, key: "workshopDay2", missions: ["Simplify work"] },
  { day: 3, key: "workshopDay3", missions: ["Build & share"] },
  { day: 4, key: "workshopDay4", missions: ["Wrap-up"] },
] as const;

function statusChip(status: ProjectRead["user_status"] | undefined): string {
  if (!status || status === "not_started") return "todo";
  if (status === "doing") return "now";
  if (status === "submitted") return "review";
  return "done";
}

export function WorkshopDayStrip() {
  const { t } = useApp();
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [all, risk] = await Promise.all([
          API.projects.list() as Promise<ProjectRead[]>,
          API.projects.list({ tool: RISK_TRACK_TOOL }) as Promise<ProjectRead[]>,
        ]);
        if (!cancelled) {
          const byId = new Map<number, ProjectRead>();
          for (const p of [...all, ...risk]) byId.set(p.id, p);
          setProjects([...byId.values()]);
        }
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onboarding = useMemo(
    () => projects.find((p) => p.position === 0),
    [projects],
  );

  const missionsByDay = useMemo(() => {
    const map: Record<number, { title: string; status: string; href: string }[]> = {};
    for (const { day } of DAY_META) {
      const dayTasks = projects
        .filter((p) => (p.tools || []).includes(dayTool(day)))
        .sort((a, b) => a.position - b.position)
        .slice(0, 2)
        .map((p) => ({
          title: p.title,
          status: statusChip(p.user_status),
          href: `${RISK_CURRICULUM_PATH}/tasks/${p.id}`,
        }));
      if (day === 1 && onboarding) {
        dayTasks.unshift({
          title: onboarding.title,
          status: statusChip(onboarding.user_status),
          href: ROUTES.exerciseWhatIsPrompting,
        });
      }
      map[day] = dayTasks;
    }
    return map;
  }, [projects, onboarding]);

  return (
    <div className="card col" style={{ gap: 14 }}>
      <div className="sect-head">
        <span className="lbl">{t("workshopStripTitle")}</span>
        <Link href={RISK_CURRICULUM_PATH} className="pill accent" style={{ textDecoration: "none" }}>
          {t("riskCurriculum")}
        </Link>
      </div>
      {loading ? (
        <div className="dim" style={{ fontSize: 12 }}>{t("loading")}</div>
      ) : (
        <div className="path" style={{ flexWrap: "wrap", gap: 12 }}>
          {DAY_META.map(({ day, key }, i) => {
            const missions = missionsByDay[day] || [];
            const anyActive = missions.some((m) => m.status === "now" || m.status === "review");
            const allDone = missions.length > 0 && missions.every((m) => m.status === "done");
            const nodeSt = allDone ? "done" : anyActive ? "now" : "todo";
            return (
              <div key={day} className="col" style={{ gap: 6, minWidth: 140, flex: "1 1 140px" }}>
                <div className="node" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                  <div className={"pin " + nodeSt}>
                    {nodeSt === "done" ? <span style={{ display: "flex" }}>{ICONS.check}</span> : day}
                  </div>
                  <span className="cap">{t(key)}</span>
                </div>
                <div className="col" style={{ gap: 4, paddingLeft: 4 }}>
                  {missions.length === 0 && (
                    <span className="dim" style={{ fontSize: 11 }}>{t("workshopNoMissions")}</span>
                  )}
                  {missions.map((m) => (
                    <Link
                      key={m.href}
                      href={m.href}
                      className="row center tight"
                      style={{ fontSize: 11, textDecoration: "none", color: "inherit", gap: 6 }}
                    >
                      <span className={"pill" + (m.status === "done" ? " accent" : m.status === "now" ? " accent" : "")} style={{ fontSize: 9, padding: "1px 6px" }}>
                        {m.status === "done" ? "✓" : m.status === "review" ? "…" : m.status === "now" ? "●" : "○"}
                      </span>
                      <span className="grow" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.title}
                      </span>
                    </Link>
                  ))}
                </div>
                {i < DAY_META.length - 1 && <div className="seg done" style={{ height: 2, marginTop: 4 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

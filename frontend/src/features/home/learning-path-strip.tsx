"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { API, type ProjectRead } from "@/lib/api";
import {
  countCompletedProjects,
  filterGeneralCurriculum,
  findCurrentProjectId,
  pathPinStatus,
  projectPathHref,
  pathNodeLabel,
} from "@/features/projects/learning-path";
import { useApp } from "@/providers/app-context";
import { ICONS } from "@/components/ui/icons";

export function LearningPathStrip() {
  const { t } = useApp();
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = (await API.projects.list()) as ProjectRead[];
        if (!cancelled) setProjects(filterGeneralCurriculum(all));
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentId = useMemo(() => findCurrentProjectId(projects), [projects]);
  const doneCount = useMemo(() => countCompletedProjects(projects), [projects]);

  return (
    <div className="card col" style={{ gap: 14 }}>
      <div className="sect-head">
        <span className="lbl">{t("learningPath")}</span>
        {projects.length > 0 && (
          <span className="pill accent">
            {t("learningPathProgress", { done: doneCount, total: projects.length })}
          </span>
        )}
      </div>
      {loading ? (
        <div className="dim" style={{ fontSize: 12 }}>{t("loading")}</div>
      ) : projects.length === 0 ? (
        <div className="dim" style={{ fontSize: 12 }}>{t("learningPathEmpty")}</div>
      ) : (
        <div className="path path--scroll">
          {projects.map((project, i) => {
            const st = pathPinStatus(project, projects, currentId);
            const pinClass = st === "locked" ? "todo" : st === "review" ? "review" : st;
            const href = st === "locked" ? null : projectPathHref(project);
            const segDone =
              st === "done" &&
              (i === projects.length - 1 ||
                pathPinStatus(projects[i + 1], projects, currentId) !== "locked");
            const node = (
              <div className="node" title={project.title}>
                <div className={"pin " + pinClass}>
                  {st === "done" ? (
                    <span style={{ display: "flex" }}>{ICONS.check}</span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="cap">{pathNodeLabel(project, t)}</span>
                {st === "now" && (
                  <span className="pill accent" style={{ fontSize: 9, padding: "1px 7px" }}>
                    {t("youAreHere")}
                  </span>
                )}
              </div>
            );
            return (
              <Fragment key={project.id}>
                {href ? (
                  <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
                    {node}
                  </Link>
                ) : (
                  node
                )}
                {i < projects.length - 1 && (
                  <div className={"seg" + (segDone ? " done" : "")} />
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

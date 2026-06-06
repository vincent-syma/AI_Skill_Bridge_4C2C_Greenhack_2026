import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const legacy = path.join(root, "legacy-cdn");

const PAGE_IMPORTS = `// @ts-nocheck — legacy port; tighten types incrementally per feature.
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useApp } from "@/providers/app-context";
import { API, Auth } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { ApiLoader } from "@/components/api/api-loader";
import { Av, Pill, Bar, Stars, Badge, Ring, ImgPh, Mark, TrustPanel } from "@/components/ui";
import { ICONS } from "@/components/ui/icons";
import { DICT, LANG_META, lx } from "@/lib/i18n";

`;

const CHROME_IMPORTS = `// @ts-nocheck — legacy port; tighten types incrementally per feature.
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/providers/app-context";
import { API, Auth } from "@/lib/api";
import { Av, Bar, Mark, TrustPanel } from "@/components/ui";
import { ICONS } from "@/components/ui/icons";
import { DICT, LANG_META } from "@/lib/i18n";
import type { PageKey } from "@/lib/routes";
import { routePath } from "@/lib/routes";

`;

const TWEAKS_IMPORTS = `// @ts-nocheck — legacy port; tighten types incrementally per feature.
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

`;

function stripLegacy(src) {
  return src
    .replace(/^\/\*[\s\S]*?\*\/\s*/, "")
    .replace(/\nObject\.assign\(window[\s\S]*$/, "")
    .replace(/React\.useState/g, "useState")
    .replace(/React\.useEffect/g, "useEffect")
    .replace(/React\.useCallback/g, "useCallback")
    .replace(/React\.useMemo/g, "useMemo")
    .replace(/React\.useRef/g, "useRef");
}

function exportNamed(code, names) {
  const out = code.trimEnd() + "\n\n";
  return out + names.map((n) => `export { ${n} };`).join("\n") + "\n";
}

const jobs = [
  {
    src: "page-home.jsx",
    dest: "src/features/home/home-page.tsx",
    imports: PAGE_IMPORTS,
    exports: ["HomePage"],
    fix: (c) => c.replace('setPage("peereval")', 'setPage("peerEvaluation")'),
  },
  {
    src: "page-projects.jsx",
    dest: "src/features/projects/projects-page.tsx",
    imports: PAGE_IMPORTS,
    exports: ["ProjectsPage"],
  },
  {
    src: "page-peereval.jsx",
    dest: "src/features/peer-eval/peer-eval-page.tsx",
    imports: PAGE_IMPORTS,
    exports: ["PeerEvaluationPage"],
  },
  {
    src: "page-auth.jsx",
    dest: "src/features/auth/auth-page.tsx",
    imports: PAGE_IMPORTS,
    exports: ["AuthPage"],
  },
  {
    src: "appchrome.jsx",
    dest: "src/components/layout/app-chrome.tsx",
    imports: CHROME_IMPORTS,
    exports: ["Sidebar", "TopBar", "SettingsSheet", "OnboardingModal", "ACCENTS"],
    transform: (c) =>
      c.replace(
        /\{items\.map\(\(k\) => \(\s*<a key=\{k\} className=\{page === k \? "on" : ""\} onClick=\{\(\) => setPage\(k\)\}>\{ICONS\[k\]\} \{t\(k\)\}<\/a>\s*\)\)\}/,
        `{items.map((k) => (
          <Link key={k} className={page === k ? "on" : ""} href={routePath(k as PageKey)}>
            {ICONS[k as keyof typeof ICONS]} {t(k)}
          </Link>
        ))}`,
      ),
  },
  {
    src: "tweaks-panel.jsx",
    dest: "src/components/dev/tweaks-panel.tsx",
    imports: TWEAKS_IMPORTS,
    exports: [
      "useTweaks",
      "TweaksPanel",
      "TweakSection",
      "TweakRow",
      "TweakSlider",
      "TweakToggle",
      "TweakRadio",
      "TweakColor",
      "TweakSelect",
    ],
  },
];

for (const job of jobs) {
  let code = fs.readFileSync(path.join(legacy, job.src), "utf8");
  code = stripLegacy(code);
  if (job.fix) code = job.fix(code);
  if (job.transform) code = job.transform(code);
  const body = exportNamed(code, job.exports);
  const outPath = path.join(root, job.dest);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, job.imports + body);
  console.log("ported", job.dest);
}

// Exercise page (Mantine submit)
const exercise = `"use client";

import { Button } from "@mantine/core";
import { useApp } from "@/providers/app-context";

export function ExerciseWhatIsPromptingPage() {
  const { t } = useApp();
  return (
    <div className="page exercise-page">
      <div className="page-head">
        <h1 className="h1">{t("exerciseWhatIsPromptingTitle")}</h1>
      </div>
      <Button className="exercise-submit-btn" type="button">
        {t("exerciseSubmit")}
      </Button>
    </div>
  );
}
`;
fs.writeFileSync(
  path.join(root, "src/features/exercises/what-is-prompting/exercise-page.tsx"),
  exercise,
);
console.log("ported exercise-page.tsx");

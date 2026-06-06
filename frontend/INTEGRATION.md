# Aurora — design system handoff

A drop-in **CSS override layer** that re-skins the existing AI Skill Bridge frontend
to the **Aurora** design language: a cool enterprise base, **green** as the primary
action color, a serif / sans / mono type system, and a blue→violet **"AI aurora"**
that activates only on AI moments.

It rides the **token + class system you already have** (`--accent`, `--surface`,
`.dark`, `.density-*`, `.card`, `.pill`, `.btn`, `.featured.shiny`, …) — so the base
skin lands with **zero component (`.tsx`) changes**.

---

## Install (2 steps, ~2 min)

**1. Add the stylesheet**

Copy `aurora.css` into the frontend:

```
frontend/src/styles/aurora.css
```

**2. Import it AFTER legacy.css**

In `frontend/src/app/layout.tsx`:

```diff
  import "@mantine/core/styles.css";
  import "@/styles/legacy.css";
+ import "@/styles/aurora.css";   // must come AFTER legacy.css — order matters
```

That's the whole base skin. Reload `next dev` and the app is Aurora.

---

## One recommended edit (make green the default accent)

The app stores the live accent on `--accent` via an inline style on `.app-root`, seeded
from `TWEAK_DEFAULTS` — that inline value **wins over CSS**, so update the default in
`frontend/src/providers/app-provider.tsx`:

```diff
  const TWEAK_DEFAULTS = {
-   accent: "#0ea5b5",
+   accent: "#0f9d6b",   // Aurora green
    density: "compact",
    dark: true,
  };
```

…and (optional) swap the accent swatches in the same file to the Aurora set:

```diff
- options={["#2f9e72", "#4f63d6", "#d9663f", "#8a5ad0", "#0ea5b5", "#c2410c"]}
+ options={["#0f9d6b", "#0d9488", "#3b6dff", "#6d5cff", "#9b4dff", "#cf9019"]}
```

If a saved user setting exists in the DB it will still override this default on login —
that's expected.

---

## Fonts

`aurora.css` pulls the three families via `@import` at the top — works immediately, no
extra wiring. For production (no flash, self-hosted), prefer `next/font/google` in
`layout.tsx` instead and delete the `@import` line:

```ts
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--f-serif" });
const sans  = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--f-sans" });
const mono  = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500","600"], variable: "--f-mono" });
// add `${serif.variable} ${sans.variable} ${mono.variable}` to <body className=...>
// then in aurora.css set: --serif: var(--f-serif); --sans: var(--f-sans); --font: var(--f-mono);
```

---

## What changes automatically (no markup edits)

| Area | Before | After |
|---|---|---|
| Neutrals | warm paper (#f1efe8) | cool enterprise grey (#f5f6f9) |
| Primary accent | green #2f9e72 | green #0f9d6b (deeper hover) |
| Headings (`.h1/.h2`, `.project-title`, `.lp-node-title`) | mono | **Source Serif 4** |
| Reading copy (`.fb-quote`, `.onboard-body`, `.lp-node-desc`, `.eval-text`, `.notes`) | mono | **IBM Plex Sans** |
| Labels, nav, pills, chips, numbers, buttons | mono | mono (unchanged — stays the workhorse) |
| Brand mark | flat | blue→violet gradient chip + glow |
| "Most helpful this week" (`.featured.shiny`) | green spinning edge | **AI spectrum** edge + glow |
| Inputs on focus | accent border | aurora-indigo focus ring |
| Exercise submit CTA | flat indigo | aurora gradient |
| Dark mode | warm charcoal | deep cool charcoal, aurora pops |

---

## Opt-in AI moments (add a class when you want one)

Ration these — one aurora moment per view, maybe two. Green stays the everyday color.

```tsx
<span className="ai-text">Most helpful</span>          {/* gradient text */}
<span className="pill ai">Claude</span>                {/* AI tool tag */}
<span className="badge ai">✦</span>                    {/* AI achievement */}
<div className="bar ai"><i style={{width:'42%'}}/></div>{/* AI progress (e.g. usage budget) */}
<button className="btn ai">Generate with AI</button>   {/* reserved for AI generation */}
<div className="card ai glow">…</div>                  {/* gradient-hairline AI card */}
<div className="ai-surface">…</div>                    {/* corner-glow assist panel */}
<div className="au-mesh">…</div>                       {/* faint grid-mesh substrate */}
```

**Suggested first placements** (highest impact, lowest effort):
- Sidebar AI-usage bar → `className="bar ai"` (the one metric that IS about AI).
- An "Ask the AI Coach" button in the home header → `className="btn ai"`.
- The AI-suggested-next-task card → wrap in `ai-surface` with a `pill ai` label.

---

## The energy dial

The matrix layer (grid mesh + button shimmer) scales on a single token:

```css
:root { --energy: .45; }   /* 0 = pure enterprise · 1 = full matrix */
```

Set it once globally, or expose it as a Tweak.

---

## Tokens reference (added by Aurora)

```
--ai-cyan #1fc4e0  --ai-blue #3b6dff  --ai-indigo #6d5cff  --ai-violet #9b4dff  --ai-magenta #c44be0
--ai-grad / --ai-grad-tri / --ai-spectrum     gradients (AI only ever appears as a gradient)
--ai-soft / --ai-line / --ai-ink              tint, hairline, text
--glow-ai / --glow-green                       colored elevation
--serif / --sans                               (mono stays on --font)
--energy                                        matrix intensity 0–1
```

Full visual reference: the **Aurora Design System** page (`AI Skill Bridge - Design System.html`).

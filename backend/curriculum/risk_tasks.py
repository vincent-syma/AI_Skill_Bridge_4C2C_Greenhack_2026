"""Risk Management team curriculum — seed data.

`category` = task type (prompt_lab, vibecode_spa, scenario_review, …).
`tools` always includes `track:risk-management` and `day:N` for workshop grouping.
Positions 100+ keep the general employee track (0–7) untouched.
"""

TRACK = "track:risk-management"

RISK_TASKS: list[dict] = [
    {
        "title": "Prompt lab: weak vs strong risk review",
        "description": "Compare a vague prompt with a two-shot system+user prompt for reviewing AI-generated risk summaries.",
        "category": "prompt_lab",
        "difficulty": 1,
        "xp_reward": 80,
        "estimated_time": "45 min",
        "tools": [TRACK, "day:1", "Claude", "ChatGPT"],
        "position": 100,
        "evaluator_guide": (
            "Focus on reasoning, not polish. Did they show a clear before/after? "
            "Does the strong prompt define role, output format, and verification steps?"
        ),
        "instructions": """## Goal
Learn why governance work needs structured prompts — not one-line asks.

## Compare these two approaches
**Weak prompt:** `Review this AI output for risks.`

**Strong two-shot pattern:**
- **System:** You are a risk reviewer. Flag hallucination, missing citations, bias, and overconfidence. Output: (1) risk level LOW/MED/HIGH with rationale, (2) three verification questions, (3) what a human must still decide.
- **User:** [paste AI output + business context]

## Steps
1. Run the weak prompt on a sample AI paragraph (use the sample in the Prompt Lab panel or your own).
2. Run the strong two-shot pattern on the same text.
3. Document what improved: specificity, traceability, escalation hooks.
4. Paste both prompts and a 3–5 sentence reflection in your notes.

## Submission
Final strong prompt, both outputs (or summaries), and what you would require before any approval.""",
        "rubric": [
            ("Both weak and strong prompts are included", "bool"),
            ("Strong prompt uses system + user roles clearly", "bool"),
            ("Reflection explains governance value (not just 'better wording')", "scale"),
            ("Verification / escalation hooks are present", "scale"),
        ],
    },
    {
        "title": "Prompt lab: critique GenAI with a reusable template",
        "description": "Build a copy-paste template for challenging vendor or internal GenAI outputs.",
        "category": "prompt_lab",
        "difficulty": 2,
        "xp_reward": 100,
        "estimated_time": "1 hour",
        "tools": [TRACK, "day:1", "Claude"],
        "position": 101,
        "evaluator_guide": "Template should be reusable across use cases. Peer review: would you trust this on a real intake?",
        "instructions": """## Goal
Create a **reusable critique template** your team can paste into any LLM.

## Must include
- Context block (use case, decision impact, data sensitivity)
- Output schema (findings, severity, owner, evidence needed)
- Explicit "stop conditions" (when to escalate, when to reject)

## Steps
1. Draft system + user messages for reviewing a **customer-facing chatbot answer**.
2. Test on one good and one bad example.
3. Iterate once — tighten anything that produced vague scores.

## Submission
Template text, one test run, and one sentence on who should own the final decision.""",
        "rubric": [
            ("Template is reusable (placeholders, not one-off text)", "bool"),
            ("Output schema forces evidence and ownership", "scale"),
            ("Stop / escalation conditions are explicit", "scale"),
        ],
    },
    {
        "title": "Scenario review: productivity AI vs decision AI",
        "description": "Classify sample use cases and justify control depth — judgment exercise, not tool demo.",
        "category": "scenario_review",
        "difficulty": 1,
        "xp_reward": 90,
        "estimated_time": "40 min",
        "tools": [TRACK, "day:1", "Claude"],
        "position": 102,
        "evaluator_guide": "Grade the rationale. Penalize blanket 'high risk' without proportionate controls.",
        "instructions": """## Goal
Separate **productivity AI** (drafting, summarising) from **decision AI** (scores, approvals, customer commitments).

## Classify each (LOW / MED / HIGH) with one-line rationale
1. Copilot drafts internal meeting notes.
2. Model ranks loan applications with auto-decline above a threshold.
3. GenAI answers HR policy questions to employees.
4. AI summarises a 200-page vendor contract for legal review.
5. Chatbot promises refund eligibility to customers in chat.

## Submission
Table of classifications + for the highest-risk item, list three controls you would require before go-live.""",
        "rubric": [
            ("All five scenarios classified with rationale", "bool"),
            ("Distinguishes productivity vs decision impact", "scale"),
            ("Controls are proportionate to stated risk", "scale"),
        ],
    },
    {
        "title": "Control mapping: risks to preventive & detective controls",
        "description": "Map AI failure modes to a lightweight control set your team can defend.",
        "category": "control_mapping",
        "difficulty": 2,
        "xp_reward": 110,
        "estimated_time": "1 hour",
        "tools": [TRACK, "day:2", "Claude", "Notion AI"],
        "position": 103,
        "evaluator_guide": "Look for preventive vs detective balance. Avoid checkbox controls with no owner.",
        "instructions": """## Goal
For one **medium-risk** use case you chose yesterday, map:

| Failure mode | Preventive control | Detective control | Owner |
|---|---|---|---|

Cover at least: hallucination, bias/drift, data leakage, overreliance.

## Submission
Completed table + one paragraph on what you would monitor monthly.""",
        "rubric": [
            ("At least four failure modes mapped", "bool"),
            ("Each row has named owner role", "scale"),
            ("Detective controls are testable", "scale"),
        ],
    },
    {
        "title": "Policy intake: from abstract rules to a checklist",
        "description": "Turn AI policy language into questions business owners must answer before approval.",
        "category": "policy_intake",
        "difficulty": 2,
        "xp_reward": 100,
        "estimated_time": "1 hour",
        "tools": [TRACK, "day:2", "Claude"],
        "position": 104,
        "evaluator_guide": "Checklist should be usable by non-technical owners. Questions must force evidence.",
        "instructions": """## Goal
Rewrite abstract AI policy into a **10-question intake checklist**.

Each question must demand evidence (data types, human review, logging, vendor contract clause, etc.).

## Submission
Checklist + example answers for a fictional 'marketing email copilot' use case.""",
        "rubric": [
            ("10 concrete questions with evidence asks", "bool"),
            ("Example answers are realistic", "scale"),
            ("Questions cover ownership and escalation", "scale"),
        ],
    },
    {
        "title": "Vendor review: spot gaps in an AI vendor pack",
        "description": "Simulated diligence — what's missing from a fake vendor security & model card pack?",
        "category": "vendor_review",
        "difficulty": 2,
        "xp_reward": 120,
        "estimated_time": "1.5 hours",
        "tools": [TRACK, "day:3", "Claude"],
        "position": 105,
        "evaluator_guide": "Reward specific missing artifacts (eval reports, data retention, subprocessors), not generic worry.",
        "instructions": """## Goal
Review the sample vendor pack in your notes template (or use a public model card) and list **gaps**.

## Must address
- Training data provenance & PII handling
- Evaluation methodology & bias testing
- Incident response & model update cadence
- Subprocessors & data residency

## Submission
Gap list prioritized HIGH/MED/LOW + three questions you would send the vendor.""",
        "rubric": [
            ("Gap list is specific (not generic 'needs more security')", "scale"),
            ("Priorities match business impact", "scale"),
            ("Vendor questions are answerable and auditable", "bool"),
        ],
    },
    {
        "title": "Vibecode: use-case triage single-page app",
        "description": "Use AI-assisted coding to ship a tiny SPA for LOW/MED/HIGH triage — deployable to GitHub Pages.",
        "category": "vibecode_spa",
        "difficulty": 2,
        "xp_reward": 150,
        "estimated_time": "2 hours",
        "tools": [TRACK, "day:3", "Claude", "Cursor"],
        "position": 106,
        "evaluator_guide": "Working link or repo matters less than documented prompt chain and control logic encoded in the app.",
        "instructions": """## Goal
Build a **single HTML file** (or small static site) that lets a business owner:

1. Describe an AI use case in plain language
2. Answer 5–8 intake questions
3. See a suggested risk tier + required controls checklist

## Vibecoding workflow
1. Write a **system prompt** for your coding agent: stack (plain HTML/CSS/JS), no backend, accessibility basics.
2. Two-shot: first generate scaffold, second refine control checklist logic.
3. Deploy to **GitHub Pages** (or share repo link).

## Submission
Repo or Pages URL, the prompts you used, and what you would harden before production.""",
        "rubric": [
            ("Artifact is shareable (URL or repo)", "bool"),
            ("Prompt chain documented (system + user)", "bool"),
            ("Triage logic matches risk taxonomy from Day 1", "scale"),
        ],
    },
    {
        "title": "Vibecode: control-mapping micro-tool",
        "description": "Extend or fork your SPA into a control-mapping worksheet peers can reuse.",
        "category": "vibecode_spa",
        "difficulty": 3,
        "xp_reward": 180,
        "estimated_time": "2.5 hours",
        "tools": [TRACK, "day:4", "Claude", "Cursor"],
        "position": 107,
        "evaluator_guide": "Peer eval: would another risk analyst adopt this without explanation?",
        "instructions": """## Goal
Ship a second single-page tool OR extend task 106:

- Rows: failure mode → preventive → detective → owner
- Export/copy markdown for audit trail

## Submission
URL, README with setup for peers, and one paragraph on maintainability.""",
        "rubric": [
            ("Shareable static deploy", "bool"),
            ("README explains how to run locally and publish to GitHub Pages", "bool"),
            ("Export or copy path for audit trail", "scale"),
        ],
    },
    {
        "title": "Tabletop: harmful AI output incident",
        "description": "Practice escalation when a customer-facing model gives dangerous advice.",
        "category": "tabletop",
        "difficulty": 2,
        "xp_reward": 130,
        "estimated_time": "1 hour",
        "tools": [TRACK, "day:4", "Claude"],
        "position": 108,
        "evaluator_guide": "Grade timeline clarity and role ownership. No heroics without comms plan.",
        "instructions": """## Scenario
A customer-facing chatbot gave incorrect medical/financial advice. Screenshot on social media. Regulator inquiry possible.

## Deliverable (30 min tabletop)
1. First 60 minutes: who does what?
2. What do you tell the business owner vs legal vs comms?
3. What logs/evidence do you pull immediately?
4. What interim control until root cause is known?

## Submission
Incident timeline + draft stakeholder messages (bullet form).""",
        "rubric": [
            ("Timeline includes first hour actions", "bool"),
            ("Roles and escalation paths are explicit", "scale"),
            ("Evidence / logging asks are concrete", "scale"),
        ],
    },
    {
        "title": "Capstone: mini governance playbook",
        "description": "Synthesize the week into a one-pager your risk team can actually use.",
        "category": "policy_intake",
        "difficulty": 3,
        "xp_reward": 200,
        "estimated_time": "2 hours",
        "tools": [TRACK, "day:4", "Claude", "Gamma"],
        "position": 109,
        "evaluator_guide": "Playbook must be actionable: intake, triage, validation, monitoring, incident — not theory.",
        "instructions": """## Goal
One-page **Risk team AI governance playbook** covering:

- Intake checklist (from Day 2)
- Triage tiers (Day 1)
- Minimum controls by tier
- Vendor diligence triggers
- Monitoring KRIs (2–3 metrics)
- Incident escalation (Day 4 tabletop)

## Submission
PDF or markdown link + optional link to your vibecode tools.""",
        "rubric": [
            ("All five playbook sections present", "bool"),
            ("Links to reusable artifacts (templates / SPAs)", "scale"),
            ("Readable by non-specialists on the business side", "scale"),
        ],
    },
]

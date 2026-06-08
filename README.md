# AI Skill Bridge

> A peer-to-peer learning platform that teaches non-technical employees to use AI tools responsibly and effectively. Employees complete practical tasks, evaluate each other's work against a configurable rubric, and earn XP as they progress.

Built at GreenHack 06/2026 hackathon — 42 Prague by 4C2C team.

<img width="1914" height="963" alt="Screenshot from 2026-06-06 10-58-45" src="https://github.com/user-attachments/assets/4f1db32a-4af4-4645-8463-d86b5c98e5ce" />

## Description

Most people who are hesitant about AI aren't hesitant because it's hard. They're hesitant because they've never had a safe, structured place to try it with someone watching their back.

This platform gives them that place. Participants pick up a practical task — summarise a meeting, draft an email, fact-check a report — and use whatever AI tool they want. They submit their attempt. A peer reviews it against a shared rubric and writes back: what worked, what didn't, what to try next.

Nobody presents to the room. Nobody's output goes on a slide. It's just two colleagues, a task they both tried, and an honest conversation about what the machine actually did.

Facilitators set the tasks and rubrics. The rest runs itself.

### Target users

People in non-technical roles who've been handed an AI tool and quietly set it aside.

The format is a facilitated session — a group in one room, working through tasks together, reading each other's attempts. Not a lecture. Not a certification course. The goal is the moment halfway through when someone says "wait, it can do that?" and shows the person next to them.

The company gets documented output — submitted work, written peer feedback, timestamps — but the more durable result is people who actually open the tool again the following week.

### Impact

Bad AI usage is inefficient at scale. Someone who doesn't know how to prompt well sends more queries, worse queries, and stops trusting the tool after it fails them twice.

One session where a person actually succeeds — and hears from a peer that it was good work — changes the habit. They come back to the tool. They prompt better. They show a colleague. That's a different outcome than a policy memo about AI adoption.

Every unnecessary query has a real cost: electricity, cooling water, compute time — paid for by the organisation and the grid. A workforce that uses AI precisely sends fewer requests, gets better answers, and reduces load on infrastructure with a physical footprint. At company scale that is a real reduction in both cost and environmental impact.

The platform follows the same principle. Row-level locking instead of polling loops, files on disk rather than in the database, a single process sized to actual load. We build it the way we teach people to use AI — without waste.

## Instructions

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker + Compose | any recent | https://docs.docker.com/get-docker |
| uv | ≥ 0.4 | `pip install uv` |
| Python | 3.12 (managed by uv) | automatic |
| Node.js | any recent | https://nodejs.org/en/download |

---

### Quick Setup backend

```bash
cd backend
make env          # copy .env.example → .env
make stack        # Postgres + API + Loki/Grafana/Promtail (detached)
make run          # API with hot reload → http://localhost:8000/docs
make seed         # admin, power user, demo tasks
```

Detail information in
```
/backend/README.md
```

### Start frontend

Run the development server:

```bash
# go into directory
cd frontend

npm install

npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Implementation

A full backend API — authentication, task and rubric management, a peer evaluation pool with concurrency-safe slot claiming, XP and badge-based progression, and a personal dashboard.

Facilitators can create and modify tasks and evaluation forms live during a session — no redeploy, no IT ticket. Each task has a configurable rubric: yes/no checks, 1–5 ratings, free text. Evaluations require a written verdict and feedback before XP is awarded.

The evaluation pool uses row-level locking on Postgres so concurrent participants never exceed the configured number of reviewers per submission. Eligibility per task is configurable — evaluating doesn't require having finished the same task, so the first participants in a session aren't stuck waiting.

Deployed with one command. Seeded with four real tasks. Six automated tests on the core invariants.


## Team
- [Martin Justa](https://github.com/Aztaban) - backend
- [Martin Man](https://github.com/mandev-1) - frontend
- [Petr Simcak](https://github.com/simcak) - frontend
- [Simona Sucha](https://github.com/vincent-syma) - backend

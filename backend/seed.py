"""Seed script — idempotent, safe to re-run.

Creates:
  - 1 admin, 1 power user, 5 demo users
  - 8 learning projects with full rubrics
  - Submissions + evaluations to populate the showcase feed
  - Notifications for the demo user

Run:  uv run python seed.py
"""
import datetime as dt
import os
import sys

# Allow running from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from app.core.db import SessionLocal, init_db
from app.core.security import hash_password
from app.models import (
    Evaluation,
    EvaluationResponse,
    Notification,
    RubricItem,
    Submission,
    Task,
    User,
    UserBadge,
    UserAvailability,
)
from app.models.enums import (
    EvaluationStatus,
    EvaluatorEligibility,
    RubricKind,
    SubmissionStatus,
    TaskStatus,
    UserRole,
)
from app.models.user_task_progress import UserTaskProgress


# ── Config ─────────────────────────────────────────────────────────────────

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@bridge.local")
ADMIN_PASS = os.getenv("SEED_ADMIN_PASSWORD", "Admin1234!")
POWER_EMAIL = os.getenv("SEED_POWER_EMAIL", "poweruser@bridge.local")
POWER_PASS = os.getenv("SEED_POWER_PASSWORD", "Power1234!")
DEMO_EMAIL = os.getenv("SEED_DEMO_EMAIL", "jana.novakova@firma.cz")
DEMO_PASS = os.getenv("SEED_DEMO_PASSWORD", "Demo1234!")


# ── Helpers ────────────────────────────────────────────────────────────────

def upsert_user(db, email, password, role, name, department, xp=0, streak=0):
    from sqlalchemy import select
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            password_hash=hash_password(password),
            role=role,
            name=name,
            department=department,
            xp=xp,
            streak=streak,
            settings={
                "theme": "dark",
                "language": "en",
                "accent": "#0ea5b5",
                "onboarding_completed": True,
            },
        )
        db.add(user)
        db.flush()
        print(f"  created {role}: {email}")
    else:
        print(f"  exists:  {email}")
    return user


def upsert_task(db, title, description, instructions, category, difficulty, xp_reward,
                estimated_time, tools, position, evaluator_guide=""):
    from sqlalchemy import select
    task = db.scalar(select(Task).where(Task.title == title))
    if task is None:
        task = Task(
            title=title,
            description=description,
            instructions=instructions,
            category=category,
            status=TaskStatus.VISIBLE,
            difficulty=difficulty,
            xp_reward=xp_reward,
            estimated_time=estimated_time,
            tools=tools,
            position=position,
            evaluator_guide=evaluator_guide,
            required_evaluations=1,
            evaluator_eligibility=EvaluatorEligibility.ANYONE,
        )
        db.add(task)
        db.flush()
        print(f"  task: {title}")
    return task


def add_rubric(db, task, items):
    from sqlalchemy import select
    existing = db.scalars(select(RubricItem).where(RubricItem.task_id == task.id)).all()
    if existing:
        return existing
    rubric = []
    for pos, (prompt, kind) in enumerate(items):
        item = RubricItem(task_id=task.id, prompt=prompt, kind=kind, position=pos)
        db.add(item)
        rubric.append(item)
    db.flush()
    return rubric


def add_submission(db, user, task, content, status, attempt=1):
    from sqlalchemy import select
    sub = db.scalar(
        select(Submission).where(
            Submission.user_id == user.id,
            Submission.task_id == task.id,
            Submission.attempt_number == attempt,
        )
    )
    if sub is None:
        sub = Submission(
            user_id=user.id,
            task_id=task.id,
            content=content,
            attempt_number=attempt,
            status=status,
        )
        db.add(sub)
        db.flush()
    return sub


def add_evaluation(db, submission, evaluator, evaluatee, rubric_items, status,
                   overall_pass, feedback, helpful=None, showcase=False, helpful_count=0):
    from sqlalchemy import select
    ev = db.scalar(
        select(Evaluation).where(
            Evaluation.submission_id == submission.id,
            Evaluation.evaluator_id == evaluator.id,
        )
    )
    if ev is None:
        now = dt.datetime.now(dt.timezone.utc)
        ev = Evaluation(
            submission_id=submission.id,
            evaluator_id=evaluator.id,
            evaluatee_id=evaluatee.id,
            status=status,
            overall_pass=overall_pass,
            feedback=feedback,
            helpful=helpful,
            xp_granted=True,
            created_at=now - dt.timedelta(days=2),
            submitted_at=now - dt.timedelta(days=1) if status in (
                EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED
            ) else None,
            confirmed_at=now if status == EvaluationStatus.CONFIRMED else None,
        )
        db.add(ev)
        db.flush()
        for i, item in enumerate(rubric_items):
            db.add(EvaluationResponse(
                evaluation_id=ev.id,
                rubric_item_id=item.id,
                value_scale=4 + (i % 2),  # 4 or 5
            ))
    if showcase:
        submission.is_showcase = True
        submission.helpful_count = helpful_count
        submission.featured_at = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)
    db.flush()
    return ev


def add_badge(db, user, code):
    from sqlalchemy import select
    exists = db.scalar(
        select(UserBadge).where(UserBadge.user_id == user.id, UserBadge.code == code)
    )
    if not exists:
        db.add(UserBadge(user_id=user.id, code=code))


def add_progress(db, user, task, notes=""):
    from sqlalchemy import select
    exists = db.scalar(
        select(UserTaskProgress).where(
            UserTaskProgress.user_id == user.id,
            UserTaskProgress.task_id == task.id,
        )
    )
    if not exists:
        db.add(UserTaskProgress(user_id=user.id, task_id=task.id, notes=notes))


def add_notification(db, user, kind, title, message, link=None):
    db.add(Notification(
        user_id=user.id,
        kind=kind,
        title=title,
        message=message,
        link=link,
        is_read=False,
    ))


# ── Main ───────────────────────────────────────────────────────────────────

def run():
    init_db()
    db = SessionLocal()
    try:
        print("→ Users")
        admin = upsert_user(db, ADMIN_EMAIL, ADMIN_PASS, UserRole.ADMIN,
                            "Admin User", "Engineering")
        power = upsert_user(db, POWER_EMAIL, POWER_PASS, UserRole.POWER_USER,
                            "Lara Content", "Product")
        demo = upsert_user(db, DEMO_EMAIL, DEMO_PASS, UserRole.USER,
                           "Jana Nováková", "Marketing", xp=620, streak=6)
        eva = upsert_user(db, "eva.dvorak@firma.cz", "Eva12345!", UserRole.USER,
                          "Eva Dvořák", "Finance", xp=980, streak=12)
        tom = upsert_user(db, "tom.bartos@firma.cz", "Tom12345!", UserRole.USER,
                          "Tom Bartoš", "Marketing", xp=1450, streak=21)
        lucie = upsert_user(db, "lucie.mala@firma.cz", "Lucie1234!", UserRole.USER,
                            "Lucie Malá", "HR", xp=750, streak=8)
        jiri = upsert_user(db, "jiri.prochazka@firma.cz", "Jiri1234!", UserRole.USER,
                           "Jiří Procházka", "HR", xp=510, streak=4)
        nora = upsert_user(db, "nora.svoboda@firma.cz", "Nora1234!", UserRole.USER,
                           "Nora Svobodová", "Operations", xp=380, streak=3)
        db.commit()

        print("→ Tasks / Projects")
        t0 = upsert_task(db,
            title="AI Basics: Your First Prompt",
            description="Learn the fundamentals of prompting and how AI models work.",
            instructions=(
                "## Goal\nWrite your first effective AI prompt to accomplish a real work task.\n\n"
                "## Steps\n1. Pick a task you do regularly at work.\n"
                "2. Write a prompt that describes the task clearly to an AI assistant.\n"
                "3. Run the prompt in ChatGPT or Claude.\n"
                "4. Iterate: refine the prompt until the output is useful.\n"
                "5. Document what worked and what didn't.\n\n"
                "## Submission\nShare your final prompt, the AI's response, and 2–3 sentences "
                "about what you learned."
            ),
            category="Basics",
            difficulty=1, xp_reward=60, estimated_time="30 min",
            tools=["ChatGPT", "Claude"],
            position=0,
            evaluator_guide="Check: is the prompt specific? Did the output match the task?",
        )
        t1 = upsert_task(db,
            title="Effective Prompting Patterns",
            description="Master role prompting, chain-of-thought, and few-shot examples.",
            instructions=(
                "## Goal\nExplore three prompting techniques and compare their outputs.\n\n"
                "## Steps\n1. **Role prompting**: Ask the AI to act as a specific expert.\n"
                "2. **Chain-of-thought**: Ask the AI to think step by step.\n"
                "3. **Few-shot**: Provide 2–3 examples before your actual request.\n"
                "4. Apply each technique to the same task.\n"
                "5. Compare the three outputs.\n\n"
                "## Submission\nShare your three prompts, their outputs, and which worked best for you."
            ),
            category="Prompting",
            difficulty=1, xp_reward=80, estimated_time="45 min",
            tools=["Claude", "ChatGPT"],
            position=1,
            evaluator_guide="Verify all three techniques are clearly shown. Assess if the comparison is thoughtful.",
        )
        t2 = upsert_task(db,
            title="Summarise a Long Document",
            description="Use AI to extract key information from a meeting transcript or report.",
            instructions=(
                "## Goal\nProduce a concise, accurate summary of a document using AI.\n\n"
                "## Steps\n1. Choose a document of at least 1 page (meeting notes, report, article).\n"
                "2. Draft a prompt that asks for a structured summary with:\n"
                "   - 3–5 key points\n   - Action items\n   - Open questions\n"
                "3. Run the prompt and review the output for accuracy.\n"
                "4. Note any hallucinations or omissions.\n\n"
                "## Submission\nShare the prompt, the AI summary, and a short note on accuracy."
            ),
            category="Summarize",
            difficulty=2, xp_reward=90, estimated_time="1 hour",
            tools=["Claude", "Notion AI"],
            position=2,
            evaluator_guide="Is the summary concise? Does it capture the main points? Are hallucinations noted?",
        )
        t3 = upsert_task(db,
            title="Automate Your Monthly Report",
            description="Build an AI-assisted workflow to generate recurring reports faster.",
            instructions=(
                "## Goal\nCreate a reusable AI prompt or workflow for a report you write regularly.\n\n"
                "## Steps\n1. Identify a report you produce at least monthly.\n"
                "2. Write a template prompt that can accept variable inputs (dates, data snippets).\n"
                "3. Use ChatGPT or Excel Copilot to generate a draft.\n"
                "4. Time yourself: how long did it take vs. without AI?\n\n"
                "## Submission\nShare your template prompt, a sample output, and the time saved."
            ),
            category="Reporting",
            difficulty=2, xp_reward=120, estimated_time="1.5 hours",
            tools=["ChatGPT", "Excel Copilot"],
            position=3,
            evaluator_guide="Is the template reusable? Is the time-saving estimate realistic?",
        )
        t4 = upsert_task(db,
            title="Create AI-Assisted Marketing Content",
            description="Generate and refine social media or email content with AI tools.",
            instructions=(
                "## Goal\nProduce a piece of marketing content with AI and reflect on the process.\n\n"
                "## Steps\n1. Choose a content type: social post, email, blog intro, or ad copy.\n"
                "2. Brief the AI as a content writer for your brand.\n"
                "3. Generate 3 variants.\n"
                "4. Edit the best one to match your voice.\n"
                "5. Reflect: what did AI get right? What needed human judgment?\n\n"
                "## Submission\nShare the prompt, all 3 variants, your edited final, and reflections."
            ),
            category="Content",
            difficulty=2, xp_reward=100, estimated_time="1 hour",
            tools=["Gamma", "ChatGPT"],
            position=4,
            evaluator_guide="Were all 3 variants generated? Does the reflection show critical thinking about AI limits?",
        )
        t5 = upsert_task(db,
            title="Build a Simple FAQ Chatbot",
            description="Design a prompt-based chatbot to answer common questions in your team.",
            instructions=(
                "## Goal\nDesign a system prompt that turns an AI into a helpful FAQ bot.\n\n"
                "## Steps\n1. Collect 5–10 common questions your team or customers ask.\n"
                "2. Write a system prompt that gives the AI context, tone, and boundaries.\n"
                "3. Test with 5 questions — including 2 it should *refuse* to answer.\n"
                "4. Iterate until the bot stays on-topic and says 'I don't know' gracefully.\n\n"
                "## Submission\nShare the system prompt, test conversation, and lessons learned."
            ),
            category="Chatbot",
            difficulty=3, xp_reward=160, estimated_time="2 hours",
            tools=["Claude", "Notion AI"],
            position=5,
            evaluator_guide="Does the bot have clear boundaries? Does it handle out-of-scope questions?",
        )
        t6 = upsert_task(db,
            title="Automate a Repetitive Workflow",
            description="Use Copilot or Zapier AI to eliminate a manual, time-consuming process.",
            instructions=(
                "## Goal\nIdentify and partially automate a repetitive task using AI tools.\n\n"
                "## Steps\n1. Document a process that takes >30 min/week with AI potential.\n"
                "2. Design the automation: input → AI step → output.\n"
                "3. Build a prototype using Copilot, Zapier AI, or similar.\n"
                "4. Estimate the weekly time saved.\n\n"
                "## Submission\nShare the process doc, automation design, prototype screenshot, "
                "and time-saving estimate."
            ),
            category="Automation",
            difficulty=3, xp_reward=180, estimated_time="3 hours",
            tools=["Copilot", "Zapier AI"],
            position=6,
        )
        t7 = upsert_task(db,
            title="Responsible AI: Spot the Risks",
            description="Identify hallucinations, bias, and privacy risks in real AI outputs.",
            instructions=(
                "## Goal\nDevelop a critical eye for AI output quality and ethical risks.\n\n"
                "## Steps\n1. Generate an AI response on a factual topic in your domain.\n"
                "2. Fact-check at least 5 specific claims.\n"
                "3. Identify any potential bias in framing or language.\n"
                "4. List any privacy risks if this prompt used real company data.\n\n"
                "## Submission\nShare the prompt, the output, your fact-check notes, and a "
                "risk assessment."
            ),
            category="Basics",
            difficulty=2, xp_reward=110, estimated_time="1 hour",
            tools=["ChatGPT", "Claude"],
            position=7,
        )
        db.commit()

        print("→ Rubric items")
        r0 = add_rubric(db, t0, [
            ("The prompt is specific and task-focused", RubricKind.BOOL),
            ("The AI output is relevant and useful", RubricKind.SCALE),
            ("Reflection explains what worked or not", RubricKind.BOOL),
        ])
        r1 = add_rubric(db, t1, [
            ("All three techniques are clearly demonstrated", RubricKind.BOOL),
            ("Quality of the prompts (clarity and specificity)", RubricKind.SCALE),
            ("Comparison is thoughtful", RubricKind.SCALE),
        ])
        r2 = add_rubric(db, t2, [
            ("Summary covers key points accurately", RubricKind.BOOL),
            ("Prompt is well-structured", RubricKind.SCALE),
            ("Hallucinations or gaps are identified", RubricKind.BOOL),
        ])
        r3 = add_rubric(db, t3, [
            ("Template prompt is reusable with variable inputs", RubricKind.BOOL),
            ("Output quality (does it look like a real report?)", RubricKind.SCALE),
            ("Time-saving estimate is realistic", RubricKind.BOOL),
        ])
        r4 = add_rubric(db, t4, [
            ("3 variants are generated and included", RubricKind.BOOL),
            ("Final edited version shows human judgment", RubricKind.SCALE),
            ("Reflection quality (honest about AI limits)", RubricKind.SCALE),
        ])
        r5 = add_rubric(db, t5, [
            ("System prompt is clear and well-scoped", RubricKind.BOOL),
            ("Chatbot handles out-of-scope questions gracefully", RubricKind.BOOL),
            ("Overall bot quality", RubricKind.SCALE),
        ])
        db.commit()

        print("→ Submissions, evaluations, and showcase items")

        # Eva: t0 completed (showcase-featured), t1 completed, t2 completed, t3 doing
        sub_eva_t0 = add_submission(db, eva, t0,
            "I prompted ChatGPT to summarise weekly status emails into bullet points. "
            "Prompt: 'You are an executive assistant. Summarise this email in 3 bullets...'",
            SubmissionStatus.COMPLETED)
        sub_eva_t1 = add_submission(db, eva, t1,
            "Compared role, chain-of-thought, and few-shot for writing a finance memo. "
            "Chain-of-thought was best for complex analysis.",
            SubmissionStatus.COMPLETED)
        sub_eva_t2 = add_submission(db, eva, t2,
            "Summarised our Q2 budget review meeting. Found 2 minor factual errors in AI output.",
            SubmissionStatus.COMPLETED)
        add_submission(db, eva, t3, "Working on my report automation draft.", SubmissionStatus.DRAFT)
        eva.xp = 980

        # Tom: t0-t4 completed (showcase featured)
        sub_tom_t0 = add_submission(db, tom, t0,
            "Used Claude to draft customer feedback analysis. Iterating on tone and format.",
            SubmissionStatus.COMPLETED)
        sub_tom_t1 = add_submission(db, tom, t1,
            "Role prompting with 'marketing expert' gave best ad copy. Few-shot was great for tone.",
            SubmissionStatus.COMPLETED)
        sub_tom_t4 = add_submission(db, tom, t4,
            "Generated 3 LinkedIn posts for a product launch. Human editing made it authentic.",
            SubmissionStatus.COMPLETED)
        tom.xp = 1450

        # Lucie: t0-t1 completed, t2 ready for eval
        sub_lucie_t0 = add_submission(db, lucie, t0,
            "First prompt for HR onboarding FAQs. Claude understood context well.",
            SubmissionStatus.COMPLETED)
        sub_lucie_t2 = add_submission(db, lucie, t2,
            "Summarised 4-page onboarding guide. Key points extracted cleanly.",
            SubmissionStatus.READY)

        # Jiří: t0 completed, t1 in review
        sub_jiri_t0 = add_submission(db, jiri, t0,
            "Prompted for meeting summary. Works great for standup notes.",
            SubmissionStatus.COMPLETED)
        sub_jiri_t1 = add_submission(db, jiri, t1,
            "Chain-of-thought blew my mind for a complex HR policy analysis.",
            SubmissionStatus.READY)

        # Nora: t0 completed
        sub_nora_t0 = add_submission(db, nora, t0,
            "Used AI for an ops report template. Saved 20 minutes.",
            SubmissionStatus.COMPLETED)
        nora.xp = 380

        db.commit()

        print("→ Evaluations")
        add_evaluation(db, sub_eva_t0, tom, eva, r0,
                       EvaluationStatus.CONFIRMED, True,
                       "Great first prompt. Very specific and the reflection shows real insight.",
                       helpful=True, showcase=True, helpful_count=5)
        add_evaluation(db, sub_eva_t1, jiri, eva, r1,
                       EvaluationStatus.CONFIRMED, True,
                       "Clear comparison. Chain-of-thought choice is well-justified.",
                       helpful=True, showcase=True, helpful_count=3)
        add_evaluation(db, sub_eva_t2, demo, eva, r2,
                       EvaluationStatus.CONFIRMED, True,
                       "Thorough fact-check. Good catch on the two errors.",
                       helpful=True, showcase=False, helpful_count=2)
        add_evaluation(db, sub_tom_t4, eva, tom, r4,
                       EvaluationStatus.CONFIRMED, True,
                       "All 3 variants present and the final edit is noticeably better.",
                       helpful=True, showcase=True, helpful_count=11)
        add_evaluation(db, sub_lucie_t0, nora, lucie, r0,
                       EvaluationStatus.CONFIRMED, True,
                       "Solid first prompt. The FAQ use case is very practical.",
                       helpful=True, showcase=False, helpful_count=0)
        add_evaluation(db, sub_jiri_t0, lucie, jiri, r0,
                       EvaluationStatus.CONFIRMED, True,
                       "Great use case. Would have loved more detail on iteration.",
                       helpful=True, showcase=False, helpful_count=0)
        add_evaluation(db, sub_nora_t0, jiri, nora, r0,
                       EvaluationStatus.CONFIRMED, True,
                       "Nice template approach. The 20-min saving claim is believable.",
                       helpful=True, showcase=False, helpful_count=0)

        # Demo user (Jana) progress
        add_progress(db, demo, t0, notes="Done — ChatGPT for weekly email digest")
        add_progress(db, demo, t1, notes="Done — love chain-of-thought for complex things")
        add_progress(db, demo, t2, notes=(
            "Working on summarising our brand guidelines doc. "
            "Prompt so far: 'You are a brand expert. Extract key messaging pillars...'"))
        add_progress(db, demo, t3, notes="")

        sub_demo_t0 = add_submission(db, demo, t0,
            "Prompted ChatGPT to turn long email threads into 3-bullet summaries. "
            "Prompt: 'Act as an executive assistant. Given this email thread, extract: "
            "(1) decisions made, (2) action items, (3) open questions.'",
            SubmissionStatus.COMPLETED)
        sub_demo_t1 = add_submission(db, demo, t1,
            "Tested role, chain-of-thought, and few-shot on writing a campaign brief. "
            "Chain-of-thought gave the most structured output for strategy work.",
            SubmissionStatus.COMPLETED)
        sub_demo_t2 = add_submission(db, demo, t2,
            "Summarised our 8-page brand guidelines into a 1-page brief using Claude.",
            SubmissionStatus.READY)
        demo.xp = 620
        db.commit()

        # Evaluate demo submissions
        add_evaluation(db, sub_demo_t0, eva, demo, r0,
                       EvaluationStatus.CONFIRMED, True,
                       "Excellent prompt structure. The three-part output format is very practical.",
                       helpful=True, showcase=True, helpful_count=4)
        add_evaluation(db, sub_demo_t1, tom, demo, r1,
                       EvaluationStatus.CONFIRMED, True,
                       "Great systematic comparison. The chain-of-thought insight is spot on.",
                       helpful=True, showcase=False, helpful_count=2)

        # Pending eval for demo user to confirm
        ev_for_demo_t2 = add_evaluation(db, sub_demo_t2, lucie, demo, r2,
                       EvaluationStatus.SUBMITTED, True,
                       "Solid summary. Noted the brand voice wasn't fully preserved in two sections — "
                       "consider adding tone examples to the prompt.",
                       helpful=None, showcase=False, helpful_count=0)

        db.commit()

        print("→ Badges for demo users")
        for code in ["FIRST_SUBMISSION", "FIRST_EVAL", "TASK_COMPLETE"]:
            add_badge(db, demo, code)
        for code in ["FIRST_SUBMISSION", "FIRST_EVAL", "EVAL_5", "TASK_COMPLETE", "TASK_5"]:
            add_badge(db, eva, code)
        for code in ["FIRST_SUBMISSION", "FIRST_EVAL", "EVAL_5", "EVAL_10", "TASK_COMPLETE", "TASK_5"]:
            add_badge(db, tom, code)
        for code in ["FIRST_SUBMISSION", "TASK_COMPLETE"]:
            add_badge(db, lucie, code)
        for code in ["FIRST_SUBMISSION", "TASK_COMPLETE"]:
            add_badge(db, jiri, code)
        for code in ["FIRST_SUBMISSION"]:
            add_badge(db, nora, code)
        db.commit()

        print("→ Availability for demo user")
        from sqlalchemy import select
        avail = db.scalar(
            select(UserAvailability).where(UserAvailability.user_id == demo.id)
        )
        if not avail:
            db.add(UserAvailability(
                user_id=demo.id,
                slots={
                    "Wed|13:00": "open",
                    "Thu|15:00": "open",
                    "Fri|11:00": "open",
                }
            ))
        db.commit()

        print("→ Notifications for demo user")
        from sqlalchemy import func
        notif_count = db.scalar(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == demo.id
            )
        ) or 0
        if notif_count == 0:
            add_notification(db, demo, "eval_received",
                "New peer evaluation",
                "Lucie Malá evaluated your 'Summarise a Long Document' submission.",
                "/peer-evaluations")
            add_notification(db, demo, "submission_completed",
                "Project completed",
                "Your 'Effective Prompting Patterns' submission has been approved!",
                "/projects")
            add_notification(db, demo, "badge_earned",
                "Badge unlocked: Graduate",
                "You completed your first learning project. Keep it up!",
                "/home")
            add_notification(db, demo, "xp_milestone",
                "+120 XP earned",
                "You earned 120 XP for completing 'Automate Your Monthly Report'.",
                "/home")
            db.commit()

        print("→ Done! Summary:")
        print(f"   Demo login: {DEMO_EMAIL} / {DEMO_PASS}")
        print(f"   Admin login: {ADMIN_EMAIL} / {ADMIN_PASS}")
        print(f"   Power user: {POWER_EMAIL} / {POWER_PASS}")

    finally:
        db.close()


if __name__ == "__main__":
    run()

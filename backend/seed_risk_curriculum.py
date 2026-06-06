"""Seed the Risk Management curriculum (idempotent).

Run from backend/:
    uv run python seed_risk_curriculum.py
"""

from __future__ import annotations

from app.models.enums import RubricKind
from curriculum.risk_tasks import RISK_TASKS
from seed import SessionLocal, add_rubric, init_db, upsert_task

_KIND = {"bool": RubricKind.BOOL, "scale": RubricKind.SCALE}


def seed_risk_curriculum() -> None:
    init_db()
    db = SessionLocal()
    try:
        for raw in RISK_TASKS:
            spec = dict(raw)
            rubric = spec.pop("rubric", [])
            task = upsert_task(db, **spec)
            items = [(label, _KIND.get(kind, RubricKind.SCALE)) for label, kind in rubric]
            add_rubric(db, task, items)
        db.commit()
        print(f"Risk curriculum: {len(RISK_TASKS)} tasks upserted.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_risk_curriculum()

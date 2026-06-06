"""Domain enums and a column helper.

We store enums as their string *value* in a VARCHAR with a CHECK
constraint (native_enum=False) rather than a Postgres native ENUM type.
Native PG enums are painful to alter later; VARCHAR+CHECK is portable
(works on SQLite in tests too) and a power user adding states won't fight
a migration.
"""
from enum import StrEnum

from sqlalchemy import Enum as SAEnum


class UserRole(StrEnum):
    USER = "user"
    POWER_USER = "power_user"
    ADMIN = "admin"


class TaskStatus(StrEnum):
    VISIBLE = "visible"
    HIDDEN = "hidden"


class SubmissionStatus(StrEnum):
    DRAFT = "draft"        # being worked on, not in the pool
    READY = "ready"        # in the matching pool, waiting for a peer
    MATCHED = "matched"    # paired, evaluation in progress
    COMPLETED = "completed"  # evaluation cycle finished




def enum_col(enum_cls: type[StrEnum]) -> SAEnum:
    """Build a portable enum column that stores the member *value*."""
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=20,
        values_callable=lambda e: [m.value for m in e],
    )


class EvaluatorEligibility(StrEnum):
    ANYONE = "anyone"        # anyone except the submission author
    STARTED = "started"      # must have at least one submission for this task
    COMPLETED = "completed"  # must have completed this task


class RubricKind(StrEnum):
    BOOL = "bool"    # yes / no tick
    SCALE = "scale"  # 1 – 5 slider
    TEXT = "text"    # free-text comment


class EvaluationStatus(StrEnum):
    CLAIMED = "claimed"      # slot claimed, form not yet submitted
    SUBMITTED = "submitted"  # evaluator submitted the form
    CONFIRMED = "confirmed"  # evaluatee confirmed feedback was helpful

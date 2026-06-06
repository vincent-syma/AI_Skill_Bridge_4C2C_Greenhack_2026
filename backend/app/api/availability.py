"""Availability API — /api/v1/availability.

Users mark which time slots they are open for peer evaluation calls.
The slot grid is stored as a single JSON blob; the UI is a day × time
matrix. For MVP only GET / PUT /me are required.

`/peers` surfaces who is reachable *right now* by combining two signals:
a declared open window covering the current time, and a recent presence
heartbeat (User.last_active). Either is enough to appear; both is strongest.
"""
import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import User
from app.models.availability import UserAvailability
from app.schemas.availability import (
    AvailabilityRead,
    AvailabilityWrite,
    AvailablePeer,
)

router = APIRouter(prefix="/availability", tags=["availability"])
logger = get_logger(__name__)

# Mirror of the frontend grid (peer-eval-page.tsx). Slots are 2h blocks keyed
# "Mon|09:00". Keep these in sync if the UI grid changes.
_SLOT_DAYS = ("Mon", "Tue", "Wed", "Thu", "Fri")
_SLOT_TIMES = ("09:00", "11:00", "13:00", "15:00")
_SLOT_SPAN_HOURS = 2
# A heartbeat within this window counts as "live". Generous enough to cover a
# user idling on a page between polls, tight enough to mean "actually here now".
_LIVE_WINDOW = dt.timedelta(minutes=5)


def _current_slot_key(now: dt.datetime) -> str | None:
    """Map a wall-clock time to the open-window slot key it falls inside.

    Returns None outside the Mon-Fri 09:00-17:00 grid (weekends / nights),
    where declared windows can't match by definition.
    """
    day = _SLOT_DAYS[now.weekday()] if now.weekday() < len(_SLOT_DAYS) else None
    if day is None:
        return None
    for start in _SLOT_TIMES:
        sh = int(start[:2])
        if sh <= now.hour < sh + _SLOT_SPAN_HOURS:
            return f"{day}|{start}"
    return None


def _peer_view(user: User, via: str) -> AvailablePeer:
    name = user.name
    initials = (
        "".join(w[0] for w in name.split()[:2]).upper() if name else "??"
    )
    return AvailablePeer(
        id=user.id,
        name=name,
        department=user.department,
        initials=initials,
        via=via,  # type: ignore[arg-type]
        last_active=user.last_active,
    )


@router.get("/me", response_model=AvailabilityRead)
def get_my_availability(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AvailabilityRead:
    row = db.scalar(
        select(UserAvailability).where(UserAvailability.user_id == user.id)
    )
    return AvailabilityRead(slots=row.slots if row else {})


@router.put("/me", response_model=AvailabilityRead)
def set_my_availability(
    data: AvailabilityWrite,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AvailabilityRead:
    row = db.scalar(
        select(UserAvailability).where(UserAvailability.user_id == user.id)
    )
    if row is None:
        row = UserAvailability(user_id=user.id, slots=data.slots)
        db.add(row)
        created = True
    else:
        row.slots = data.slots
        created = False
    db.commit()
    slot_count = len(data.slots) if isinstance(data.slots, dict) else 0
    logger.info(
        "event=availability_updated user_id=%s created=%s slot_keys=%s",
        user.id,
        created,
        slot_count,
    )
    return AvailabilityRead(slots=row.slots)


@router.get("/peers", response_model=list[AvailablePeer])
def peers_available_now(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AvailablePeer]:
    """Who can I reach for a live evaluation right now (excluding myself).

    Two independent signals, merged so the strongest ("both") wins per peer:
      - window: declared an "open" slot covering the current 2h block
      - live:   presence heartbeat within the last few minutes
    """
    now = dt.datetime.utcnow()
    slot_key = _current_slot_key(now)

    # via per peer id; we upgrade to "both" if a peer matches twice.
    via: dict[int, str] = {}
    users: dict[int, User] = {}

    # 1) Declared open windows for the current slot. JSON filtering in Python
    #    keeps this DB-agnostic (Postgres + SQLite) at hackathon scale.
    if slot_key is not None:
        rows = db.scalars(select(UserAvailability)).all()
        open_ids = [
            r.user_id
            for r in rows
            if isinstance(r.slots, dict) and r.slots.get(slot_key) == "open"
        ]
        if open_ids:
            for u in db.scalars(
                select(User).where(User.id.in_(open_ids))
            ).all():
                users[u.id] = u
                via[u.id] = "window"

    # 2) Recent presence heartbeat.
    cutoff = now - _LIVE_WINDOW
    for u in db.scalars(
        select(User).where(User.last_active.is_not(None), User.last_active >= cutoff)
    ).all():
        users[u.id] = u
        via[u.id] = "both" if via.get(u.id) == "window" else "live"

    peers = [
        _peer_view(users[uid], v)
        for uid, v in via.items()
        if uid != user.id  # never surface myself
    ]
    # Strongest signal first, then most-recently-active.
    rank = {"both": 0, "live": 1, "window": 2}
    peers.sort(
        key=lambda p: (rank[p.via], -(p.last_active.timestamp() if p.last_active else 0))
    )
    logger.info(
        "event=peers_available_now user_id=%s slot=%s count=%s",
        user.id,
        slot_key,
        len(peers),
    )
    return peers

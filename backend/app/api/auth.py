from datetime import datetime, timezone

from fastapi import APIRouter

from app.models.models import Role
from app.schemas.schemas import LoginRequest, SessionOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

DISPLAY_ROLE = {
    Role.FARMER: "Farmer",
    Role.COLLECTION: "Collection",
    Role.WAREHOUSE: "Warehouse",
    Role.TRANSPORT: "Transport",
    Role.RETAILER: "Retailer",
}


@router.post(
    "/login",
    response_model=SessionOut,
    summary="Open a demo session",
    description=(
        "Name plus role sign-in for the prototype. No password is used and no "
        "token is issued. The client stores the returned session locally and "
        "the role decides which dashboard opens."
    ),
)
def login(payload: LoginRequest) -> SessionOut:
    name = payload.name.strip()
    return SessionOut(
        user_id=f"{payload.role.value.lower()}-{name.lower().replace(' ', '-')}",
        name=name,
        role=payload.role,
        display_role=DISPLAY_ROLE[payload.role],
        issued_at=datetime.now(timezone.utc),
    )


@router.get("/roles", summary="List the roles a demo user can pick")
def roles() -> list[dict]:
    return [
        {"value": role.value, "label": DISPLAY_ROLE[role]} for role in Role
    ]

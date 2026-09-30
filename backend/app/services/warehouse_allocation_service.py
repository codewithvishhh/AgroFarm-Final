"""Smart warehouse allocation.

Deterministic scoring, no model. Each factor is normalised to 0..1 and
weighted, so an ML ranker can later replace `score_warehouse` alone.
"""

from sqlalchemy.orm import Session

from app.models.models import InventoryItem, Warehouse
from app.schemas.schemas import AllocationCandidate, AllocationResult
from app.services.geo import haversine_km

# Produce that must sit in a cold room to survive the wait.
COLD_PRODUCE = {
    "Tomato",
    "Apple",
    "Banana",
    "Grapes",
    "Leafy Greens",
    "Milk",
    "Mango",
}

WEIGHTS = {
    "capacity": 0.35,
    "distance": 0.30,
    "utilization": 0.20,
    "compatibility": 0.15,
}

MAX_USEFUL_DISTANCE_KM = 250.0


def needs_cold_storage(produce_type: str) -> bool:
    return produce_type in COLD_PRODUCE


def score_warehouse(
    warehouse: Warehouse,
    produce_type: str,
    quantity: float,
    latitude: float,
    longitude: float,
    already_stocked: bool,
) -> AllocationCandidate:
    distance = haversine_km(
        latitude, longitude, warehouse.latitude, warehouse.longitude
    )
    fits = warehouse.available_capacity >= quantity

    capacity_score = min(1.0, warehouse.available_capacity / max(quantity, 1.0) / 3)
    distance_score = max(0.0, 1 - distance / MAX_USEFUL_DISTANCE_KM)
    utilization_score = max(0.0, 1 - warehouse.current_utilization / 100)

    cold_needed = needs_cold_storage(produce_type)
    is_cold = warehouse.storage_type == "COLD_STORAGE"
    compatibility_score = 1.0 if (is_cold or not cold_needed) else 0.15
    if already_stocked:
        compatibility_score = min(1.0, compatibility_score + 0.15)

    score = (
        WEIGHTS["capacity"] * capacity_score
        + WEIGHTS["distance"] * distance_score
        + WEIGHTS["utilization"] * utilization_score
        + WEIGHTS["compatibility"] * compatibility_score
    )
    if not fits:
        score *= 0.25

    reasons: list[str] = []
    reasons.append(
        f"{warehouse.available_capacity:,.0f} kg free, load needs {quantity:,.0f} kg"
    )
    reasons.append(f"{distance:.1f} km from the pickup point")
    reasons.append(f"Currently {warehouse.current_utilization:.0f}% full")
    if cold_needed:
        reasons.append(
            "Cold storage available" if is_cold else "No cold room for this produce"
        )
    if already_stocked:
        reasons.append(f"Already stores {produce_type}")
    if not fits:
        reasons.append("Not enough free space for the full load")

    return AllocationCandidate(
        warehouse_id=warehouse.warehouse_id,
        name=warehouse.name,
        location=warehouse.location,
        distance_km=round(distance, 1),
        available_capacity=round(warehouse.available_capacity, 1),
        utilization=round(warehouse.current_utilization, 1),
        storage_type=warehouse.storage_type,
        score=round(score * 100, 1),
        reasons=reasons,
        fits=fits,
    )


def allocate(
    db: Session,
    produce_type: str,
    quantity: float,
    latitude: float,
    longitude: float,
) -> AllocationResult:
    warehouses = db.query(Warehouse).all()
    stocked = {
        row.warehouse_id
        for row in db.query(InventoryItem)
        .filter(InventoryItem.produce_type == produce_type, InventoryItem.quantity > 0)
        .all()
    }

    candidates = sorted(
        (
            score_warehouse(
                warehouse,
                produce_type,
                quantity,
                latitude,
                longitude,
                warehouse.warehouse_id in stocked,
            )
            for warehouse in warehouses
        ),
        key=lambda candidate: candidate.score,
        reverse=True,
    )

    best = candidates[0] if candidates else None
    if best is None:
        explanation = "No warehouses are registered yet."
    else:
        explanation = (
            f"{best.name} scores highest on free space, distance, and storage type "
            f"for {quantity:,.0f} kg of {produce_type}. It is {best.distance_km} km "
            f"away, {best.utilization:.0f}% full, and holds "
            f"{best.available_capacity:,.0f} kg of free capacity."
        )

    return AllocationResult(
        produce_type=produce_type,
        quantity=quantity,
        recommended=best,
        candidates=candidates,
        explanation=explanation,
    )

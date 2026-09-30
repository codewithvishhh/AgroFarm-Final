"""Demand forecasting.

Statistical only: a weighted moving average plus a linear trend term. This is
not machine learning and is not described as such anywhere in the product.
Swap `project` for a trained model later; the response shape stays the same.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.models import DemandRecord, InventoryItem
from app.schemas.schemas import ForecastOut, ForecastPoint

METHOD = "Weighted moving average with linear trend"
WEIGHTS = [0.1, 0.15, 0.2, 0.25, 0.3]  # oldest to newest of the last five days
SAFETY_STOCK_FACTOR = 1.15


def _weighted_average(values: list[float]) -> float:
    window = values[-len(WEIGHTS) :]
    weights = WEIGHTS[-len(window) :]
    total = sum(weights)
    return sum(value * weight for value, weight in zip(window, weights)) / total


def _trend_per_day(values: list[float]) -> float:
    """Least squares slope over the series. Zero when the series is short."""
    count = len(values)
    if count < 3:
        return 0.0
    mean_x = (count - 1) / 2
    mean_y = sum(values) / count
    numerator = sum((i - mean_x) * (value - mean_y) for i, value in enumerate(values))
    denominator = sum((i - mean_x) ** 2 for i in range(count))
    return numerator / denominator if denominator else 0.0


def project(values: list[float], horizon: int = 7) -> list[float]:
    """Return `horizon` future values from a daily history."""
    if not values:
        return [0.0] * horizon
    base = _weighted_average(values)
    slope = _trend_per_day(values)
    return [max(0.0, base + slope * (step + 1)) for step in range(horizon)]


def forecast(
    db: Session,
    produce_type: str,
    history_days: int = 14,
    horizon: int = 7,
) -> ForecastOut:
    since = datetime.now(timezone.utc) - timedelta(days=history_days)
    rows = (
        db.query(DemandRecord)
        .filter(
            DemandRecord.produce_type == produce_type,
            DemandRecord.recorded_on >= since.replace(tzinfo=None),
        )
        .order_by(DemandRecord.recorded_on)
        .all()
    )

    history = [
        ForecastPoint(date=row.recorded_on.date().isoformat(), actual=row.quantity)
        for row in rows
    ]
    values = [row.quantity for row in rows]
    projected = project(values, horizon)

    last_date = rows[-1].recorded_on.date() if rows else datetime.now().date()
    forecast_points = [
        ForecastPoint(
            date=(last_date + timedelta(days=step + 1)).isoformat(),
            forecast=round(value, 1),
        )
        for step, value in enumerate(projected)
    ]

    expected = sum(projected)
    recommended = expected * SAFETY_STOCK_FACTOR
    current_stock = sum(
        row.quantity
        for row in db.query(InventoryItem)
        .filter(InventoryItem.produce_type == produce_type)
        .all()
    )

    first_half = values[: len(values) // 2]
    second_half = values[len(values) // 2 :]
    trend = 0.0
    if first_half and second_half:
        start = sum(first_half) / len(first_half)
        end = sum(second_half) / len(second_half)
        trend = round((end - start) / start * 100, 1) if start else 0.0

    unit = rows[0].unit if rows else "kg"
    return ForecastOut(
        produce_type=produce_type,
        unit=unit,
        method=METHOD,
        history=history,
        forecast=forecast_points,
        expected_demand=round(expected, 1),
        recommended_stock=round(recommended, 1),
        current_stock=round(current_stock, 1),
        potential_shortage=round(max(0.0, recommended - current_stock), 1),
        potential_surplus=round(max(0.0, current_stock - recommended), 1),
        trend_percentage=trend,
    )


def tracked_produce(db: Session) -> list[str]:
    return sorted(
        {row.produce_type for row in db.query(DemandRecord.produce_type).distinct()}
    )

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.schemas import ForecastOut
from app.services import demand_forecasting_service

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get(
    "/produce",
    summary="Produce types with demand history",
)
def produce_types(db: Session = Depends(get_db)) -> list[str]:
    return demand_forecasting_service.tracked_produce(db)


@router.get(
    "",
    response_model=ForecastOut,
    summary="Demand forecast for one produce type",
    description=(
        "Statistical forecast from recorded daily demand: weighted moving average "
        "plus a linear trend. Not a machine learning model."
    ),
)
def forecast(
    produce_type: str,
    db: Session = Depends(get_db),
    history_days: int = Query(14, ge=5, le=90),
    horizon: int = Query(7, ge=1, le=30),
):
    return demand_forecasting_service.forecast(db, produce_type, history_days, horizon)


@router.get(
    "/summary",
    response_model=list[ForecastOut],
    summary="Forecast for every tracked produce type",
)
def forecast_summary(db: Session = Depends(get_db), horizon: int = 7):
    return [
        demand_forecasting_service.forecast(db, produce, horizon=horizon)
        for produce in demand_forecasting_service.tracked_produce(db)
    ]

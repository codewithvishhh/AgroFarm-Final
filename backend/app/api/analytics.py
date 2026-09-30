from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.service import analytics, dashboard_stats
from app.database.session import get_db
from app.models.models import Role
from app.schemas.schemas import AnalyticsOut, DashboardStats
from app.services import demand_forecasting_service, inventory_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats, summary="KPI counters")
def get_dashboard_stats(db: Session = Depends(get_db)):
    return dashboard_stats(db)


@router.get("/analytics", response_model=AnalyticsOut, summary="Charts data")
def get_analytics(db: Session = Depends(get_db), days: int = Query(14, ge=3, le=60)):
    return analytics(db, days=days)


@router.get(
    "/role/{role}",
    summary="Role-shaped overview",
    description="KPI set trimmed to what one role needs on its landing page.",
)
def role_overview(role: Role, db: Session = Depends(get_db)):
    stats = dashboard_stats(db)
    payload: dict = {"role": role.value, "stats": stats.model_dump()}

    if role == Role.WAREHOUSE:
        payload["low_stock"] = [
            {
                "warehouse_id": item.warehouse_id,
                "produce_type": item.produce_type,
                "quantity": item.quantity,
                "reorder_level": item.reorder_level,
            }
            for item in inventory_service.low_stock(db)
        ]
    if role in (Role.RETAILER, Role.WAREHOUSE):
        payload["tracked_produce"] = demand_forecasting_service.tracked_produce(db)
    return payload

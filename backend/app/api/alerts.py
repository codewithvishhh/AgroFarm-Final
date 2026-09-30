from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Alert, AlertSeverity, Role
from app.schemas.schemas import AlertCreate, AlertOut
from app.services.alert_service import raise_alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut], summary="List alerts")
def list_alerts(
    db: Session = Depends(get_db),
    severity: AlertSeverity | None = None,
    alert_type: str | None = None,
    audience: Role | None = None,
    is_resolved: bool | None = None,
    shipment_id: str | None = None,
    limit: int = 200,
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if audience:
        query = query.filter((Alert.audience == audience) | (Alert.audience.is_(None)))
    if is_resolved is not None:
        query = query.filter(Alert.is_resolved.is_(is_resolved))
    if shipment_id:
        query = query.filter(Alert.shipment_id == shipment_id)
    return query.order_by(Alert.created_at.desc()).limit(limit).all()


@router.post("", response_model=AlertOut, status_code=201, summary="Raise an alert")
async def create_alert(payload: AlertCreate, db: Session = Depends(get_db)):
    return await raise_alert(
        db,
        payload.shipment_id,
        payload.alert_type,
        payload.severity,
        payload.message,
        audience=payload.audience,
        deduplicate=False,
    )


@router.patch(
    "/{alert_id}/read", response_model=AlertOut, summary="Mark an alert as read"
)
def mark_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


@router.patch(
    "/{alert_id}/resolve", response_model=AlertOut, summary="Resolve an alert"
)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert

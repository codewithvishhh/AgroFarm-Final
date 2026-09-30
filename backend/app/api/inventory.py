from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import (
    InventoryItem,
    InventoryTransaction,
    TransactionType,
)
from app.schemas.schemas import (
    InventoryItemOut,
    InventoryMoveRequest,
    InventoryTransactionOut,
)
from app.services import inventory_service
from app.websocket import events
from app.websocket.manager import manager

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get(
    "",
    response_model=list[InventoryItemOut],
    summary="Current stock",
    description="Stock per produce type, optionally for one warehouse.",
)
def current_inventory(
    db: Session = Depends(get_db), warehouse_id: str | None = None
):
    query = db.query(InventoryItem)
    if warehouse_id:
        query = query.filter(InventoryItem.warehouse_id == warehouse_id)
    return query.order_by(InventoryItem.produce_type).all()


@router.get(
    "/history",
    response_model=list[InventoryTransactionOut],
    summary="Inventory track record",
    description="Every quantity movement, newest first. Filterable.",
)
def history(
    db: Session = Depends(get_db),
    warehouse_id: str | None = None,
    produce_type: str | None = None,
    transaction_type: TransactionType | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(200, le=1000),
):
    query = db.query(InventoryTransaction)
    if warehouse_id:
        query = query.filter(InventoryTransaction.warehouse_id == warehouse_id)
    if produce_type:
        query = query.filter(InventoryTransaction.produce_type == produce_type)
    if transaction_type:
        query = query.filter(
            InventoryTransaction.transaction_type == transaction_type
        )
    if date_from:
        query = query.filter(
            InventoryTransaction.timestamp >= date_from.replace(tzinfo=None)
        )
    if date_to:
        query = query.filter(
            InventoryTransaction.timestamp <= date_to.replace(tzinfo=None)
        )
    return (
        query.order_by(InventoryTransaction.timestamp.desc()).limit(limit).all()
    )


@router.post(
    "/movements",
    response_model=InventoryTransactionOut,
    status_code=201,
    summary="Record a stock movement",
)
async def record_movement(
    payload: InventoryMoveRequest, db: Session = Depends(get_db)
):
    transaction = inventory_service.record_movement(
        db,
        warehouse_id=payload.warehouse_id,
        produce_type=payload.produce_type,
        quantity=payload.quantity,
        transaction_type=payload.transaction_type,
        unit=payload.unit,
        reference_shipment=payload.reference_shipment,
        note=payload.note,
    )
    await manager.broadcast(
        events.INVENTORY_UPDATED,
        InventoryTransactionOut.model_validate(transaction).model_dump(),
    )
    return transaction


@router.get(
    "/low-stock",
    response_model=list[InventoryItemOut],
    summary="Items under their reorder level",
)
def low_stock(db: Session = Depends(get_db), warehouse_id: str | None = None):
    return inventory_service.low_stock(db, warehouse_id)

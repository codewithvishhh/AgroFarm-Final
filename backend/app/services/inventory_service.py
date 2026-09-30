"""Warehouse stock plus an immutable movement ledger.

Every quantity change writes one InventoryTransaction row, so the warehouse
inventory history is always reconstructable.
"""

from sqlalchemy.orm import Session

from app.models.models import (
    AlertSeverity,
    InventoryItem,
    InventoryTransaction,
    TransactionType,
    Warehouse,
)

# Transaction types that increase stock. Everything else decreases it.
INBOUND = {TransactionType.RECEIVED, TransactionType.STORED}


def get_item(db: Session, warehouse_id: str, produce_type: str) -> InventoryItem:
    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.warehouse_id == warehouse_id,
            InventoryItem.produce_type == produce_type,
        )
        .first()
    )
    if item is None:
        item = InventoryItem(
            warehouse_id=warehouse_id, produce_type=produce_type, quantity=0.0
        )
        db.add(item)
        db.commit()
        db.refresh(item)
    return item


def signed(transaction_type: TransactionType, quantity: float) -> float:
    return quantity if transaction_type in INBOUND else -quantity


def record_movement(
    db: Session,
    warehouse_id: str,
    produce_type: str,
    quantity: float,
    transaction_type: TransactionType,
    unit: str = "kg",
    reference_shipment: str | None = None,
    note: str | None = None,
) -> InventoryTransaction:
    """Apply one movement to stock and append it to the ledger."""
    item = get_item(db, warehouse_id, produce_type)
    item.quantity = max(0.0, item.quantity + signed(transaction_type, quantity))
    item.unit = unit

    transaction = InventoryTransaction(
        warehouse_id=warehouse_id,
        produce_type=produce_type,
        quantity=quantity,
        unit=unit,
        transaction_type=transaction_type,
        reference_shipment=reference_shipment,
        note=note,
        balance_after_transaction=item.quantity,
    )
    db.add(transaction)

    _sync_warehouse_capacity(db, warehouse_id)
    db.commit()
    db.refresh(transaction)
    return transaction


def _sync_warehouse_capacity(db: Session, warehouse_id: str) -> None:
    """Keep warehouse free space in step with the stock rows it holds."""
    warehouse = (
        db.query(Warehouse).filter(Warehouse.warehouse_id == warehouse_id).first()
    )
    if warehouse is None:
        return
    stored = (
        db.query(InventoryItem)
        .filter(InventoryItem.warehouse_id == warehouse_id)
        .all()
    )
    used = sum(row.quantity for row in stored)
    warehouse.available_capacity = max(0.0, warehouse.total_capacity - used)
    warehouse.current_utilization = (
        round(used / warehouse.total_capacity * 100, 1)
        if warehouse.total_capacity
        else 0.0
    )


def low_stock(db: Session, warehouse_id: str | None = None) -> list[InventoryItem]:
    query = db.query(InventoryItem)
    if warehouse_id:
        query = query.filter(InventoryItem.warehouse_id == warehouse_id)
    return [row for row in query.all() if row.quantity < row.reorder_level]


def capacity_severity(utilization: float) -> AlertSeverity:
    if utilization >= 92:
        return AlertSeverity.CRITICAL
    if utilization >= 80:
        return AlertSeverity.WARNING
    return AlertSeverity.INFO

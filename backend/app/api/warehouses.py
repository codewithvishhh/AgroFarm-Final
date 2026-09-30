from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import CollectionPoint, Farmer, Retailer, Warehouse
from app.schemas.schemas import (
    AllocationRequest,
    AllocationResult,
    CollectionPointOut,
    FarmerOut,
    RetailerOut,
    WarehouseCreate,
    WarehouseOut,
)
from app.services.shipment_service import generate_id
from app.services.warehouse_allocation_service import allocate

router = APIRouter(tags=["warehouses"])


def _utilization(total: float, available: float) -> float:
    if total <= 0:
        return 0.0
    return round((total - available) / total * 100, 1)


@router.get(
    "/api/warehouses", response_model=list[WarehouseOut], summary="List warehouses"
)
def list_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).order_by(Warehouse.name).all()


@router.post(
    "/api/warehouses",
    response_model=WarehouseOut,
    status_code=201,
    summary="Add a warehouse",
)
def create_warehouse(payload: WarehouseCreate, db: Session = Depends(get_db)):
    available = (
        payload.available_capacity
        if payload.available_capacity is not None
        else payload.total_capacity
    )
    warehouse = Warehouse(
        warehouse_id=generate_id("WH"),
        name=payload.name,
        location=payload.location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        total_capacity=payload.total_capacity,
        available_capacity=available,
        storage_type=payload.storage_type,
        contact_phone=payload.contact_phone,
        current_utilization=_utilization(payload.total_capacity, available),
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.patch(
    "/api/warehouses/{warehouse_id}/capacity",
    response_model=WarehouseOut,
    summary="Set free capacity",
)
def update_capacity(
    warehouse_id: str, available_capacity: float, db: Session = Depends(get_db)
):
    warehouse = (
        db.query(Warehouse).filter(Warehouse.warehouse_id == warehouse_id).first()
    )
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    warehouse.available_capacity = max(
        0.0, min(available_capacity, warehouse.total_capacity)
    )
    warehouse.current_utilization = _utilization(
        warehouse.total_capacity, warehouse.available_capacity
    )
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.post(
    "/api/warehouses/allocate",
    response_model=AllocationResult,
    summary="Recommend a warehouse for a load",
    description=(
        "Deterministic scoring over free capacity, distance, current utilization, "
        "and storage compatibility. Every candidate returns its reasons."
    ),
)
def allocate_warehouse(payload: AllocationRequest, db: Session = Depends(get_db)):
    return allocate(
        db,
        payload.produce_type,
        payload.quantity,
        payload.latitude,
        payload.longitude,
    )


@router.get(
    "/api/retailers", response_model=list[RetailerOut], summary="List retailers"
)
def list_retailers(db: Session = Depends(get_db)):
    return db.query(Retailer).order_by(Retailer.name).all()


@router.get(
    "/api/collection-points",
    response_model=list[CollectionPointOut],
    summary="List collection points",
)
def list_collection_points(db: Session = Depends(get_db)):
    return db.query(CollectionPoint).order_by(CollectionPoint.name).all()


@router.get("/api/farmers", response_model=list[FarmerOut], summary="List farmers")
def list_farmers(db: Session = Depends(get_db)):
    return db.query(Farmer).order_by(Farmer.name).all()

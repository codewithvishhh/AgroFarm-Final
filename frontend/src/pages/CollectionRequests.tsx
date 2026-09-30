import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ShipmentTimeline } from "../components/ShipmentTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { useFetch } from "../hooks/useFetch";
import { mergeShipment, useLive, useLiveEvent } from "../hooks/useLive";
import { shipmentsApi, vehiclesApi, warehousesApi } from "../services/api";
import type { CollectionStatus, Shipment } from "../types";
import { formatQuantity, timeAgo, titleCase } from "../utils/format";

const STAGES: CollectionStatus[] = [
  "REQUESTED",
  "ACCEPTED",
  "PICKUP_ASSIGNED",
  "COLLECTED",
  "SENT_TO_WAREHOUSE",
];

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-1.5 text-[11px] text-husk outline-none focus:border-crop/60";

/** Collection desk: accept requests, assign pickup, record what was collected. */
export function CollectionRequests() {
  const { pushToast } = useLive();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { vehicle_id: string; quantity: string; warehouse_id: string }>
  >({});

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "collection:requests",
  );
  const vehicles = useFetch(() => vehiclesApi.list(), [], "vehicles");
  const warehouses = useFetch(() => warehousesApi.list(), [], "warehouses");

  useLiveEvent(
    ["SHIPMENT_CREATED", "SHIPMENT_UPDATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );

  const queue = shipments.filter(
    (shipment) =>
      shipment.collection_status !== "SENT_TO_WAREHOUSE" &&
      shipment.status !== "CANCELLED" &&
      shipment.status !== "DELIVERED",
  );

  const draftFor = (shipment: Shipment) =>
    drafts[shipment.shipment_id] ?? {
      vehicle_id: "",
      quantity: String(shipment.quantity),
      warehouse_id: shipment.warehouse_id ?? "",
    };

  const setDraft = (
    shipmentId: string,
    patch: Partial<{ vehicle_id: string; quantity: string; warehouse_id: string }>,
  ) =>
    setDrafts((current) => ({
      ...current,
      [shipmentId]: { ...draftFor(shipments.find((s) => s.shipment_id === shipmentId)!), ...current[shipmentId], ...patch },
    }));

  const advance = async (
    shipment: Shipment,
    next: CollectionStatus,
    extras: {
      vehicle_id?: string;
      collected_quantity?: number;
      warehouse_id?: string;
    } = {},
  ) => {
    setBusy(shipment.shipment_id);
    try {
      const updated = await shipmentsApi.advanceCollection(
        shipment.shipment_id,
        { collection_status: next, ...extras },
      );
      setShipments((current) => mergeShipment(current, updated));
      pushToast({
        title: "Collection updated",
        message: `${shipment.shipment_id} is now ${titleCase(next)}.`,
        tone: "good",
      });
    } catch (exception) {
      pushToast({
        title: "Update failed",
        message: (exception as Error).message,
        tone: "danger",
      });
    } finally {
      setBusy(null);
    }
  };

  if (state.loading && shipments.length === 0) {
    return <Loader label="Loading collection requests" />;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="glass edge-light rounded-2xl px-4 py-3"
          >
            <p className="text-[11px] text-moss">{titleCase(stage)}</p>
            <p className="mt-1 font-display text-xl tabular-nums text-husk">
              {
                shipments.filter((item) => item.collection_status === stage)
                  .length
              }
            </p>
          </div>
        ))}
      </div>

      <Panel
        title="Collection queue"
        description="Accept a request, assign a pickup vehicle, then record what was collected"
        bodyClassName="p-0"
      >
        {queue.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            hint="New farmer requests land here the moment they are raised."
          />
        ) : (
          <ul className="divide-y divide-husk/8">
            {queue.map((shipment) => {
              const draft = draftFor(shipment);
              const status = shipment.collection_status;
              return (
                <li key={shipment.shipment_id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/shipments/${shipment.shipment_id}`}
                        className="font-mono text-xs text-crop hover:underline"
                      >
                        {shipment.shipment_id}
                      </Link>
                      <p className="mt-1 text-xs text-husk">
                        {shipment.farmer_name ?? "Farmer"} ·{" "}
                        {shipment.produce_type} ·{" "}
                        {formatQuantity(
                          shipment.quantity,
                          shipment.quantity_unit,
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-moss">
                        Pickup at {shipment.source} · raised{" "}
                        {timeAgo(shipment.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  <div className="mt-3">
                    <ShipmentTimeline stage={shipment.stage} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {status === "REQUESTED" && (
                      <Button
                        disabled={busy === shipment.shipment_id}
                        onClick={() => advance(shipment, "ACCEPTED")}
                      >
                        Accept collection
                      </Button>
                    )}

                    {status === "ACCEPTED" && (
                      <>
                        <select
                          value={draft.vehicle_id}
                          onChange={(event) =>
                            setDraft(shipment.shipment_id, {
                              vehicle_id: event.target.value,
                            })
                          }
                          className={fieldClass}
                        >
                          <option value="">Pick a collection vehicle</option>
                          {(vehicles.data ?? [])
                            .filter((vehicle) => vehicle.status === "AVAILABLE")
                            .map((vehicle) => (
                              <option
                                key={vehicle.vehicle_id}
                                value={vehicle.vehicle_id}
                              >
                                {vehicle.vehicle_number} · {vehicle.driver_name}
                              </option>
                            ))}
                        </select>
                        <Button
                          disabled={
                            busy === shipment.shipment_id || !draft.vehicle_id
                          }
                          onClick={() =>
                            advance(shipment, "PICKUP_ASSIGNED", {
                              vehicle_id: draft.vehicle_id,
                            })
                          }
                        >
                          Assign pickup
                        </Button>
                      </>
                    )}

                    {status === "PICKUP_ASSIGNED" && (
                      <>
                        <input
                          value={draft.quantity}
                          onChange={(event) =>
                            setDraft(shipment.shipment_id, {
                              quantity: event.target.value,
                            })
                          }
                          inputMode="decimal"
                          className={`${fieldClass} w-32`}
                          placeholder="Collected quantity"
                        />
                        <Button
                          disabled={busy === shipment.shipment_id}
                          onClick={() =>
                            advance(shipment, "COLLECTED", {
                              collected_quantity: Number(draft.quantity),
                            })
                          }
                        >
                          Record collected
                        </Button>
                      </>
                    )}

                    {status === "COLLECTED" && (
                      <>
                        <select
                          value={draft.warehouse_id}
                          onChange={(event) =>
                            setDraft(shipment.shipment_id, {
                              warehouse_id: event.target.value,
                            })
                          }
                          className={fieldClass}
                        >
                          <option value="">Send to which warehouse</option>
                          {(warehouses.data ?? []).map((warehouse) => (
                            <option
                              key={warehouse.warehouse_id}
                              value={warehouse.warehouse_id}
                            >
                              {warehouse.name} ·{" "}
                              {warehouse.current_utilization.toFixed(0)}% full
                            </option>
                          ))}
                        </select>
                        <Button
                          disabled={
                            busy === shipment.shipment_id || !draft.warehouse_id
                          }
                          onClick={() =>
                            advance(shipment, "SENT_TO_WAREHOUSE", {
                              warehouse_id: draft.warehouse_id,
                            })
                          }
                        >
                          Send to warehouse
                        </Button>
                        <Link
                          to="/allocation"
                          className="text-[11px] text-moss hover:text-crop"
                        >
                          Need a recommendation?
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

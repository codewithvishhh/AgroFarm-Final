import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ShipmentForm } from "../components/ShipmentForm";
import { ShipmentTimeline } from "../components/ShipmentTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../hooks/useLive";
import { shipmentsApi, vehiclesApi, warehousesApi } from "../services/api";
import type { Shipment } from "../types";
import { formatQuantity, formatRupees, timeAgo } from "../utils/format";

/** Farmer view of their own produce, grouped by crop. */
export function Produce() {
  const { session } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "produce:shipments",
  );
  const vehicles = useFetch(() => vehiclesApi.list(), [], "vehicles");
  const retailers = useFetch(() => warehousesApi.retailers(), [], "retailers");
  const warehouses = useFetch(() => warehousesApi.list(), [], "warehouses");

  useLiveEvent(
    ["SHIPMENT_CREATED", "SHIPMENT_UPDATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );

  const mine = shipments.filter(
    (shipment) => !session || shipment.created_by === session.name,
  );
  const scope = mine.length > 0 ? mine : shipments;

  const grouped = scope.reduce<Record<string, Shipment[]>>((acc, shipment) => {
    acc[shipment.produce_type] = acc[shipment.produce_type] ?? [];
    acc[shipment.produce_type].push(shipment);
    return acc;
  }, {});

  if (state.loading && shipments.length === 0) {
    return <Loader label="Loading your produce" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>Add produce request</Button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            title="No produce raised yet"
            hint="Raise your first request and follow it from collection to the retailer."
            action={
              <Button onClick={() => setFormOpen(true)}>
                Add produce request
              </Button>
            }
          />
        </Panel>
      ) : (
        Object.entries(grouped).map(([produce, rows]) => {
          const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
          const value = rows.reduce((sum, row) => sum + row.estimated_value, 0);
          return (
            <Panel
              key={produce}
              title={produce}
              description={`${rows.length} requests · ${formatQuantity(
                quantity,
                rows[0].quantity_unit,
              )} · ${formatRupees(value)} estimated`}
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-husk/8">
                {rows.map((shipment) => (
                  <li key={shipment.shipment_id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          to={`/shipments/${shipment.shipment_id}`}
                          className="font-mono text-xs text-crop hover:underline"
                        >
                          {shipment.shipment_id}
                        </Link>
                        <p className="mt-1 text-xs text-husk">
                          {formatQuantity(
                            shipment.quantity,
                            shipment.quantity_unit,
                          )}{" "}
                          · {shipment.source} to {shipment.destination}
                        </p>
                        <p className="mt-0.5 text-[11px] text-moss">
                          Raised {timeAgo(shipment.created_at)}
                        </p>
                      </div>
                      <StatusBadge
                        status={shipment.status}
                        pulse={shipment.status === "IN_TRANSIT"}
                      />
                    </div>
                    <div className="mt-3">
                      <ShipmentTimeline stage={shipment.stage} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })
      )}

      <ShipmentForm
        open={formOpen}
        vehicles={vehicles.data ?? []}
        retailers={retailers.data ?? []}
        warehouses={warehouses.data ?? []}
        onClose={() => setFormOpen(false)}
        onCreated={(shipment) =>
          setShipments((current) => [shipment, ...current])
        }
      />
    </div>
  );
}

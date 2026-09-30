import { useCallback, useMemo, useState } from "react";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ShipmentForm } from "../components/ShipmentForm";
import { ShipmentTable } from "../components/ShipmentTable";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../hooks/useLive";
import { shipmentsApi, vehiclesApi, warehousesApi } from "../services/api";
import type { Shipment, ShipmentStatus } from "../types";

const FILTERS: (ShipmentStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELAYED",
  "DELIVERED",
];

export function Shipments() {
  const { session } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filter, setFilter] = useState<ShipmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "shipments",
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

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const statusMatch = filter === "ALL" || shipment.status === filter;
      const searchMatch =
        term.length === 0 ||
        [
          shipment.shipment_id,
          shipment.produce_type,
          shipment.source,
          shipment.destination,
          shipment.farmer_name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return statusMatch && searchMatch;
    });
  }, [shipments, filter, search]);

  const canCreate = session?.role === "FARMER" || session?.role === "COLLECTION";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                filter === option
                  ? "border-crop/40 bg-crop/10 text-crop"
                  : "border-husk/12 bg-husk/4 text-moss backdrop-blur hover:border-husk/25 hover:text-husk"
              }`}
            >
              {option === "ALL"
                ? "All"
                : option.charAt(0) +
                  option.slice(1).toLowerCase().replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search produce, hub, farmer, or ID"
            className="w-full rounded-lg border border-husk/12 bg-soil-800/55 backdrop-blur px-3 py-2 text-xs text-husk outline-none transition-colors placeholder:text-moss/60 focus:border-crop/60 sm:w-64"
          />
          {canCreate && (
            <Button onClick={() => setFormOpen(true)}>New shipment</Button>
          )}
        </div>
      </div>

      {state.error && state.fromCache && (
        <p className="rounded-lg border border-harvest/35 bg-harvest/10 px-3 py-2 text-[11px] text-harvest">
          Showing cached shipments. {state.error}
        </p>
      )}

      <Panel bodyClassName="p-0">
        {state.loading && shipments.length === 0 ? (
          <div className="px-5">
            <Loader label="Loading shipments" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="No shipments match"
            hint="Change the filter, or create a request to move produce from a farm gate to a retailer."
            action={
              canCreate ? (
                <Button onClick={() => setFormOpen(true)}>New shipment</Button>
              ) : undefined
            }
          />
        ) : (
          <ShipmentTable shipments={visible} />
        )}
      </Panel>

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

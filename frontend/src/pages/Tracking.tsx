import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ProgressTrack } from "../components/ProgressTrack";
import { StatusBadge } from "../components/StatusBadge";
import { TruckMap } from "../components/TruckMap";
import { useFetch } from "../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../hooks/useLive";
import { shipmentsApi } from "../services/api";
import type { Shipment } from "../types";
import { formatEta } from "../utils/format";

export function Tracking() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "tracking:shipments",
  );

  useLiveEvent(
    ["SHIPMENT_UPDATED", "SHIPMENT_CREATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );

  const moving = shipments.filter((shipment) =>
    ["IN_TRANSIT", "DELAYED", "ASSIGNED"].includes(shipment.status),
  );
  const onMap = selected
    ? moving.filter((shipment) => shipment.shipment_id === selected)
    : moving;

  if (state.loading && shipments.length === 0) {
    return <Loader label="Loading live fleet" />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
      <Panel bodyClassName="p-4">
        {moving.length === 0 ? (
          <EmptyState
            title="No trucks on the road"
            hint="Assign a vehicle to a shipment and dispatch it to watch the route fill in."
          />
        ) : (
          <TruckMap
            shipments={onMap}
            height="34rem"
            onSelect={(shipment) => setSelected(shipment.shipment_id)}
          />
        )}
      </Panel>

      <Panel
        title="Fleet in motion"
        description="Select one truck to follow it alone"
        bodyClassName="p-0"
        action={
          selected && (
            <button
              onClick={() => setSelected(null)}
              className="text-[11px] text-moss hover:text-crop"
            >
              Show all
            </button>
          )
        }
      >
        <ul className="max-h-[32rem] divide-y divide-husk/8 overflow-y-auto">
          {moving.map((shipment) => (
            <li
              key={shipment.shipment_id}
              className={`cursor-pointer px-5 py-4 transition-colors hover:bg-husk/4 ${
                selected === shipment.shipment_id ? "bg-husk/6" : ""
              }`}
              onClick={() => setSelected(shipment.shipment_id)}
            >
              <div className="flex items-center justify-between gap-3">
                <Link
                  to={`/shipments/${shipment.shipment_id}`}
                  className="font-mono text-xs text-crop hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {shipment.shipment_id}
                </Link>
                <StatusBadge
                  status={shipment.status}
                  pulse={shipment.status === "IN_TRANSIT"}
                />
              </div>
              <p className="mt-1 text-[11px] text-moss">
                {shipment.vehicle?.vehicle_number ?? "No vehicle"} ·{" "}
                {shipment.produce_type} · to {shipment.destination}
              </p>
              <div className="mt-3">
                <ProgressTrack
                  value={shipment.progress_percentage}
                  label={`${shipment.progress_percentage.toFixed(0)}% · ${shipment.speed_kmph.toFixed(
                    0,
                  )} km/h · ETA ${formatEta(shipment.eta_minutes)} · ${
                    shipment.temperature?.toFixed(1) ?? "—"
                  }°C`}
                />
              </div>
            </li>
          ))}
          {moving.length === 0 && (
            <li className="px-5 py-8 text-center text-xs text-moss">
              No active vehicles.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

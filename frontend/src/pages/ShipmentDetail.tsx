import { ArrowLeft, Thermometer } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ProgressTrack } from "../components/ProgressTrack";
import { ShipmentTimeline } from "../components/ShipmentTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { TelemetryChart } from "../components/TelemetryChart";
import { TruckMap } from "../components/TruckMap";
import { useFetch } from "../hooks/useFetch";
import { useLive, useLiveEvent } from "../hooks/useLive";
import { shipmentsApi, vehiclesApi } from "../services/api";
import type { Shipment, Telemetry } from "../types";
import {
  formatDateTime,
  formatEta,
  formatQuantity,
  formatRupees,
  titleCase,
} from "../utils/format";

export function ShipmentDetail() {
  const { shipmentId = "" } = useParams();
  const { pushToast } = useLive();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [readings, setReadings] = useState<Telemetry[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [busy, setBusy] = useState(false);

  const state = useFetch(
    () => shipmentsApi.get(shipmentId).then((row) => (setShipment(row), row)),
    [shipmentId],
    `shipment:${shipmentId}`,
  );
  useFetch(
    () =>
      shipmentsApi
        .telemetry(shipmentId)
        .then((rows) => (setReadings(rows), rows)),
    [shipmentId],
    `telemetry:${shipmentId}`,
  );
  const vehicles = useFetch(() => vehiclesApi.list(), [], "vehicles");
  const risk = useFetch(
    () => shipmentsApi.spoilageRisk(shipmentId),
    [shipmentId],
  );

  useLiveEvent(
    ["SHIPMENT_UPDATED"],
    useCallback(
      (message) => {
        const updated = message.data as Shipment;
        if (updated.shipment_id === shipmentId) setShipment(updated);
      },
      [shipmentId],
    ),
  );
  useLiveEvent(
    ["TELEMETRY_UPDATED"],
    useCallback(
      (message) => {
        const reading = message.data as Telemetry;
        if (reading.shipment_id === shipmentId) {
          setReadings((current) => [...current.slice(-119), reading]);
        }
      },
      [shipmentId],
    ),
  );

  const act = async (label: string, action: () => Promise<Shipment>) => {
    setBusy(true);
    try {
      setShipment(await action());
      pushToast({ title: label, message: `${shipmentId} updated.`, tone: "good" });
    } catch (exception) {
      pushToast({
        title: "Action failed",
        message: (exception as Error).message,
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  if (state.loading && !shipment) return <Loader label="Loading shipment" />;

  if (!shipment) {
    return (
      <Panel bodyClassName="p-0">
        <EmptyState
          title="Shipment not found"
          hint={state.error ?? "It may have been removed."}
          action={
            <Link to="/shipments">
              <Button variant="ghost">Back to shipments</Button>
            </Link>
          }
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/shipments"
          className="inline-flex items-center gap-2 text-[11px] text-moss transition-colors hover:text-crop"
        >
          <ArrowLeft size={13} />
          All shipments
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {shipment.status === "PENDING" && (
            <>
              <select
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
                className="rounded-lg border border-husk/12 bg-soil-800/55 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60"
              >
                <option value="">Assign a vehicle</option>
                {(vehicles.data ?? [])
                  .filter((vehicle) => vehicle.status === "AVAILABLE")
                  .map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                      {vehicle.vehicle_number} · {vehicle.driver_name}
                    </option>
                  ))}
              </select>
              <Button
                disabled={busy || !vehicleId}
                onClick={() =>
                  act("Vehicle assigned", () =>
                    shipmentsApi.assignVehicle(shipmentId, vehicleId),
                  )
                }
              >
                Assign vehicle
              </Button>
            </>
          )}

          {shipment.status === "ASSIGNED" && (
            <Button
              disabled={busy}
              onClick={() =>
                act("Shipment dispatched", () =>
                  shipmentsApi.dispatch(shipmentId),
                )
              }
            >
              Dispatch
            </Button>
          )}

          {["IN_TRANSIT", "DELAYED"].includes(shipment.status) && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() =>
                act("Marked delivered", () =>
                  shipmentsApi.setStatus(shipmentId, "DELIVERED"),
                )
              }
            >
              Mark delivered
            </Button>
          )}

          {!["DELIVERED", "CANCELLED"].includes(shipment.status) && (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                act("Shipment cancelled", () =>
                  shipmentsApi.setStatus(shipmentId, "CANCELLED"),
                )
              }
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Panel bodyClassName="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-crop">{shipment.shipment_id}</p>
            <h2 className="mt-1 font-display text-xl text-husk">
              {shipment.produce_type} ·{" "}
              {formatQuantity(shipment.quantity, shipment.quantity_unit)}
            </h2>
            <p className="mt-1 text-xs text-moss">
              {shipment.source} to {shipment.destination} ·{" "}
              {formatRupees(shipment.estimated_value)} estimated value
            </p>
          </div>
          <StatusBadge
            status={shipment.status}
            pulse={shipment.status === "IN_TRANSIT"}
          />
        </div>

        <div className="mt-4">
          <ShipmentTimeline stage={shipment.stage} />
        </div>

        <div className="mt-5">
          <ProgressTrack
            value={shipment.progress_percentage}
            label={`${shipment.progress_percentage.toFixed(0)}% covered · ${shipment.speed_kmph.toFixed(
              0,
            )} km/h · ETA ${formatEta(shipment.eta_minutes)}`}
          />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-moss">Farmer</dt>
            <dd className="mt-1 text-husk">{shipment.farmer_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-moss">Vehicle</dt>
            <dd className="mt-1 text-husk">
              {shipment.vehicle?.vehicle_number ?? "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-moss">Driver</dt>
            <dd className="mt-1 text-husk">
              {shipment.vehicle?.driver_name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-moss">Collection stage</dt>
            <dd className="mt-1 text-husk">
              {titleCase(shipment.collection_status)}
            </dd>
          </div>
          <div>
            <dt className="text-moss">Temperature</dt>
            <dd className="mt-1 tabular-nums text-husk">
              {shipment.temperature?.toFixed(1) ?? "—"}°C
            </dd>
          </div>
          <div>
            <dt className="text-moss">Humidity</dt>
            <dd className="mt-1 tabular-nums text-husk">
              {shipment.humidity?.toFixed(0) ?? "—"}%
            </dd>
          </div>
          <div>
            <dt className="text-moss">Departed</dt>
            <dd className="mt-1 text-husk">
              {formatDateTime(shipment.departure_time)}
            </dd>
          </div>
          <div>
            <dt className="text-moss">Deadline</dt>
            <dd className="mt-1 text-husk">
              {formatDateTime(shipment.delivery_deadline)}
            </dd>
          </div>
        </dl>

        {risk.data && (
          <p className="mt-5 flex items-start gap-2 rounded-lg border border-soil-600 bg-husk/4 px-3 py-2 text-[11px] text-moss">
            <Thermometer size={13} className="mt-0.5 shrink-0 text-chill" />
            Spoilage risk {risk.data.risk.toLowerCase()} (score{" "}
            {risk.data.score}). Safe band for {shipment.produce_type} is{" "}
            {risk.data.band[0]}°C to {risk.data.band[1]}°C. Rule based for now; a
            shelf-life model can replace it later.
          </p>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Live map"
          description="Source, destination, route, and the truck"
          bodyClassName="p-4"
        >
          <TruckMap shipments={[shipment]} height="22rem" />
        </Panel>

        <Panel
          title="Cold chain readings"
          description="Simulated IoT sensors on board"
        >
          {readings.length === 0 ? (
            <EmptyState
              title="No readings yet"
              hint="Sensor values start streaming once the shipment is dispatched."
            />
          ) : (
            <TelemetryChart readings={readings} />
          )}
        </Panel>
      </div>
    </div>
  );
}

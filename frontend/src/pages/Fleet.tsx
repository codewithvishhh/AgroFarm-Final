import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "../components/Button";
import { EmergencyDialog } from "../components/EmergencyDialog";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ProgressTrack } from "../components/ProgressTrack";
import { StatusBadge } from "../components/StatusBadge";
import { useFetch } from "../hooks/useFetch";
import { useLive, useLiveEvent } from "../hooks/useLive";
import { shipmentsApi, vehiclesApi } from "../services/api";
import type { Shipment, VehicleStatus } from "../types";
import { formatEta, titleCase } from "../utils/format";

export function Fleet() {
  const { pushToast } = useLive();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fleet = useFetch(() => vehiclesApi.fleetStatus(), [], "fleet");
  const shipments = useFetch(() => shipmentsApi.list(), [], "fleet:shipments");

  useLiveEvent(
    ["SHIPMENT_UPDATED", "EMERGENCY_CREATED", "EMERGENCY_UPDATED"],
    useCallback(() => {
      void fleet.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const rows = fleet.data ?? [];
  const assignable = (shipments.data ?? []).filter(
    (shipment: Shipment) =>
      shipment.status === "PENDING" && shipment.vehicle_id === null,
  );

  const setStatus = async (vehicleId: string, status: VehicleStatus) => {
    setBusy(vehicleId);
    try {
      await vehiclesApi.setStatus(vehicleId, status);
      await fleet.reload();
      pushToast({
        title: "Vehicle updated",
        message: `Status set to ${titleCase(status)}.`,
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

  const assign = async (vehicleId: string, shipmentId: string) => {
    setBusy(vehicleId);
    try {
      await shipmentsApi.assignVehicle(shipmentId, vehicleId);
      await Promise.all([fleet.reload(), shipments.reload()]);
      pushToast({
        title: "Vehicle assigned",
        message: `${shipmentId} now has a truck.`,
        tone: "good",
      });
    } catch (exception) {
      pushToast({
        title: "Assignment failed",
        message: (exception as Error).message,
        tone: "danger",
      });
    } finally {
      setBusy(null);
    }
  };

  const start = async (vehicleId: string, shipmentId: string) => {
    setBusy(vehicleId);
    try {
      await shipmentsApi.dispatch(shipmentId);
      await fleet.reload();
      pushToast({
        title: "Shipment started",
        message: `${shipmentId} is moving. Watch it on the live map.`,
        tone: "good",
      });
    } catch (exception) {
      pushToast({
        title: "Dispatch failed",
        message: (exception as Error).message,
        tone: "danger",
      });
    } finally {
      setBusy(null);
    }
  };

  if (fleet.loading && rows.length === 0) return <Loader label="Loading fleet" />;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="danger" onClick={() => setDialogOpen(true)}>
          Report emergency
        </Button>
      </div>

      <Panel
        title="Fleet"
        description="Vehicle, driver, status, location, load, and progress"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] text-left text-sm">
            <thead>
              <tr className="text-[11px] text-moss">
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Driver</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Current location</th>
                <th className="px-5 py-3 font-medium">Assigned shipment</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-husk/8">
              {rows.map((row) => (
                <tr key={row.vehicle_id} className="hover:bg-husk/4">
                  <td className="px-5 py-3">
                    <p className="text-xs text-husk">{row.vehicle_number}</p>
                    <p className="text-[11px] text-moss">
                      {titleCase(row.vehicle_type)} ·{" "}
                      {row.capacity.toLocaleString()} kg
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs text-husk">{row.driver_name}</p>
                    <p className="text-[11px] text-moss">
                      {row.driver_phone ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      status={row.status}
                      pulse={row.status === "IN_TRANSIT"}
                    />
                  </td>
                  <td className="px-5 py-3 text-[11px] tabular-nums text-moss">
                    {row.current_latitude?.toFixed(3) ?? "—"},{" "}
                    {row.current_longitude?.toFixed(3) ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {row.shipment_id ? (
                      <>
                        <Link
                          to={`/shipments/${row.shipment_id}`}
                          className="font-mono text-crop hover:underline"
                        >
                          {row.shipment_id}
                        </Link>
                        <p className="text-[11px] text-moss">
                          {row.produce_type} to {row.destination}
                        </p>
                      </>
                    ) : (
                      <span className="text-moss">Idle</span>
                    )}
                  </td>
                  <td className="w-40 px-5 py-3">
                    <ProgressTrack
                      value={row.progress_percentage ?? 0}
                      label={`${row.speed_kmph.toFixed(0)} km/h · ETA ${formatEta(
                        row.eta_minutes,
                      )}`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.status === "AVAILABLE" && assignable[0] && (
                        <Button
                          variant="ghost"
                          disabled={busy === row.vehicle_id}
                          onClick={() =>
                            assign(row.vehicle_id, assignable[0].shipment_id)
                          }
                        >
                          Assign load
                        </Button>
                      )}
                      {row.status === "ASSIGNED" && row.shipment_id && (
                        <Button
                          disabled={busy === row.vehicle_id}
                          onClick={() => start(row.vehicle_id, row.shipment_id!)}
                        >
                          Start shipment
                        </Button>
                      )}
                      {row.status !== "MAINTENANCE" ? (
                        <Button
                          variant="quiet"
                          disabled={busy === row.vehicle_id}
                          onClick={() =>
                            setStatus(row.vehicle_id, "MAINTENANCE")
                          }
                        >
                          Maintenance
                        </Button>
                      ) : (
                        <Button
                          variant="quiet"
                          disabled={busy === row.vehicle_id}
                          onClick={() => setStatus(row.vehicle_id, "AVAILABLE")}
                        >
                          Back in service
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <EmergencyDialog
        open={dialogOpen}
        fleet={rows}
        onClose={() => setDialogOpen(false)}
        onCreated={() => fleet.reload()}
      />
    </div>
  );
}

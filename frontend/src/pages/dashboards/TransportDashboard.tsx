import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { listStagger } from "../../animations/variants";
import { Button } from "../../components/Button";
import { EmergencyDialog } from "../../components/EmergencyDialog";
import { EmptyState } from "../../components/EmptyState";
import { Loader } from "../../components/Loader";
import { Panel } from "../../components/Panel";
import { ProgressTrack } from "../../components/ProgressTrack";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { TruckMap } from "../../components/TruckMap";
import { useFetch } from "../../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../../hooks/useLive";
import { emergenciesApi, shipmentsApi, vehiclesApi } from "../../services/api";
import type { Emergency, Shipment } from "../../types";
import { formatEta, timeAgo, titleCase } from "../../utils/format";

export function TransportDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "transport:shipments",
  );
  const fleet = useFetch(() => vehiclesApi.fleetStatus(), [], "fleet");
  useFetch(
    () =>
      emergenciesApi.list().then((rows) => (setEmergencies(rows), rows)),
    [],
    "emergencies",
  );

  useLiveEvent(
    ["SHIPMENT_UPDATED", "SHIPMENT_CREATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );
  useLiveEvent(
    ["EMERGENCY_CREATED", "EMERGENCY_UPDATED"],
    useCallback((message) => {
      const emergency = message.data as Emergency;
      setEmergencies((current) => {
        const exists = current.some(
          (row) => row.emergency_id === emergency.emergency_id,
        );
        return exists
          ? current.map((row) =>
              row.emergency_id === emergency.emergency_id ? emergency : row,
            )
          : [emergency, ...current];
      });
      void fleet.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const rows = fleet.data ?? [];
  const moving = shipments.filter((shipment) =>
    ["IN_TRANSIT", "DELAYED"].includes(shipment.status),
  );
  const active = emergencies.filter(
    (row) => !["RESOLVED", "CANCELLED"].includes(row.status),
  );

  const count = (status: string) =>
    rows.filter((row) => row.status === status).length;

  if (state.loading && shipments.length === 0) {
    return <Loader label="Loading fleet" />;
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 lg:grid-cols-5"
      >
        <StatCard label="Total vehicles" value={rows.length} />
        <StatCard
          label="Available"
          value={count("AVAILABLE")}
          tone="crop"
          hint={`${count("ASSIGNED")} assigned`}
        />
        <StatCard label="In transit" value={count("IN_TRANSIT")} tone="chill" />
        <StatCard
          label="Maintenance"
          value={count("MAINTENANCE")}
          tone="harvest"
        />
        <StatCard
          label="Active emergencies"
          value={active.length}
          tone={active.length ? "rot" : "neutral"}
        />
      </motion.div>

      <div className="flex flex-wrap justify-end gap-2">
        <Link to="/fleet">
          <Button variant="ghost">Open fleet table</Button>
        </Link>
        <Button variant="danger" onClick={() => setDialogOpen(true)}>
          Report emergency
        </Button>
      </div>

      {active.length > 0 && (
        <Panel
          title="Active emergencies"
          description="Trucks waiting for assistance"
          bodyClassName="p-0"
          action={
            <Link
              to="/emergencies"
              className="px-5 text-[11px] text-moss transition-colors hover:text-rot"
            >
              Manage
            </Link>
          }
        >
          <ul className="divide-y divide-husk/8">
            {active.map((emergency) => (
              <li
                key={emergency.emergency_id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-xs text-husk">
                    {titleCase(emergency.emergency_type)} ·{" "}
                    {emergency.vehicle_id}
                  </p>
                  <p className="mt-0.5 text-[11px] text-moss">
                    Nearest help: {emergency.nearest_warehouse ?? "searching"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={emergency.severity} />
                  <span className="text-[10px] text-moss">
                    {timeAgo(emergency.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="Live fleet"
        description="Trucks moving right now, facing their direction of travel"
        bodyClassName="p-4"
        action={
          <Link
            to="/tracking"
            className="text-[11px] text-moss transition-colors hover:text-crop"
          >
            Open live map
          </Link>
        }
      >
        {moving.length === 0 ? (
          <EmptyState
            title="No trucks on the road"
            hint="Dispatch an assigned shipment and it appears here within seconds."
          />
        ) : (
          <TruckMap shipments={moving} height="22rem" />
        )}
      </Panel>

      <Panel
        title="Fleet status"
        description="Vehicle, driver, load, and progress"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="text-[11px] text-moss">
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Driver</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Shipment</th>
                <th className="px-5 py-3 font-medium">Progress</th>
                <th className="px-5 py-3 font-medium">ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-husk/8">
              {rows.slice(0, 8).map((row) => (
                <tr key={row.vehicle_id} className="hover:bg-husk/4">
                  <td className="px-5 py-3 text-xs text-husk">
                    {row.vehicle_number}
                  </td>
                  <td className="px-5 py-3 text-xs text-moss">
                    {row.driver_name}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      status={row.status}
                      pulse={row.status === "IN_TRANSIT"}
                    />
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {row.shipment_id ? (
                      <Link
                        to={`/shipments/${row.shipment_id}`}
                        className="font-mono text-crop hover:underline"
                      >
                        {row.shipment_id}
                      </Link>
                    ) : (
                      <span className="text-moss">Idle</span>
                    )}
                  </td>
                  <td className="w-40 px-5 py-3">
                    <ProgressTrack value={row.progress_percentage ?? 0} />
                  </td>
                  <td className="px-5 py-3 text-xs tabular-nums text-moss">
                    {formatEta(row.eta_minutes)}
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
        onCreated={(detail) =>
          setEmergencies((current) => [detail.emergency, ...current])
        }
      />
    </div>
  );
}

import { AlertOctagon, PhoneCall } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "../components/Button";
import { EmergencyDialog } from "../components/EmergencyDialog";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useFetch } from "../hooks/useFetch";
import { useLive, useLiveEvent } from "../hooks/useLive";
import { emergenciesApi, vehiclesApi } from "../services/api";
import type { Emergency, NearbyFacility } from "../types";
import { formatDateTime, timeAgo, titleCase } from "../utils/format";

export function Emergencies() {
  const { pushToast } = useLive();
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyFacility[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const state = useFetch(
    () => emergenciesApi.list().then((rows) => (setEmergencies(rows), rows)),
    [],
    "emergencies:all",
  );
  const fleet = useFetch(() => vehiclesApi.fleetStatus(), [], "fleet");

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
    }, []),
  );

  const active = emergencies.filter(
    (row) => !["RESOLVED", "CANCELLED"].includes(row.status),
  );

  useEffect(() => {
    if (!selected && active[0]) setSelected(active[0].emergency_id);
  }, [active, selected]);

  useEffect(() => {
    if (!selected) return;
    emergenciesApi
      .get(selected)
      .then((detail) => setNearby(detail.nearby))
      .catch(() => setNearby([]));
  }, [selected]);

  const current = emergencies.find((row) => row.emergency_id === selected);

  const contact = async (facility: NearbyFacility) => {
    if (!current) return;
    setBusy(true);
    try {
      const updated = await emergenciesApi.requestAssistance(
        current.emergency_id,
        facility.name,
      );
      setEmergencies((rows) =>
        rows.map((row) =>
          row.emergency_id === updated.emergency_id ? updated : row,
        ),
      );
      pushToast({
        title: "Assistance request sent",
        message: `${facility.name} was contacted, about ${facility.eta_minutes} minutes away.`,
        tone: "good",
      });
    } catch (exception) {
      pushToast({
        title: "Could not contact",
        message: (exception as Error).message,
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (emergency: Emergency) => {
    setBusy(true);
    try {
      const updated = await emergenciesApi.setStatus(
        emergency.emergency_id,
        "RESOLVED",
      );
      setEmergencies((rows) =>
        rows.map((row) =>
          row.emergency_id === updated.emergency_id ? updated : row,
        ),
      );
      pushToast({
        title: "Emergency resolved",
        message: `${emergency.emergency_id} is closed and the vehicle is released.`,
        tone: "good",
      });
    } finally {
      setBusy(false);
    }
  };

  if (state.loading && emergencies.length === 0) {
    return <Loader label="Loading emergencies" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active cases"
          value={active.length}
          tone={active.length ? "rot" : "neutral"}
        />
        <StatCard
          label="Awaiting responder"
          value={
            emergencies.filter((row) => row.status === "ASSISTANCE_REQUESTED")
              .length
          }
          tone="harvest"
        />
        <StatCard
          label="Resolved"
          value={emergencies.filter((row) => row.status === "RESOLVED").length}
          tone="crop"
        />
        <StatCard label="Total logged" value={emergencies.length} />
      </div>

      <div className="flex justify-end">
        <Button variant="danger" onClick={() => setDialogOpen(true)}>
          <AlertOctagon size={14} />
          Report emergency
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Panel
          title="Emergency log"
          description="Newest first. Select a case to see nearby help."
          bodyClassName="p-0"
        >
          {emergencies.length === 0 ? (
            <EmptyState
              title="No emergencies"
              hint="Report one from the fleet page to see the nearby facility lookup."
            />
          ) : (
            <ul className="divide-y divide-husk/8">
              {emergencies.map((emergency) => (
                <li
                  key={emergency.emergency_id}
                  onClick={() => setSelected(emergency.emergency_id)}
                  className={`cursor-pointer px-5 py-4 transition-colors hover:bg-husk/4 ${
                    selected === emergency.emergency_id ? "bg-husk/6" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-crop">
                        {emergency.emergency_id}
                      </p>
                      <p className="mt-1 text-xs text-husk">
                        {titleCase(emergency.emergency_type)} ·{" "}
                        {emergency.vehicle_id}
                      </p>
                      <p className="mt-0.5 text-[11px] text-moss">
                        {emergency.description ?? "No description"}
                      </p>
                      <p className="mt-1 text-[11px] text-moss">
                        GPS {emergency.latitude.toFixed(3)},{" "}
                        {emergency.longitude.toFixed(3)} ·{" "}
                        {timeAgo(emergency.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={emergency.severity} />
                      <span className="text-[11px] text-moss">
                        {titleCase(emergency.status)}
                      </span>
                    </div>
                  </div>

                  {!["RESOLVED", "CANCELLED"].includes(emergency.status) && (
                    <div className="mt-3">
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={(event) => {
                          event.stopPropagation();
                          void resolve(emergency);
                        }}
                      >
                        Mark resolved
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Nearby assistance"
          description={
            current
              ? `Around ${current.vehicle_id}`
              : "Select a case to see responders"
          }
          bodyClassName="p-0"
        >
          {!current ? (
            <EmptyState
              title="No case selected"
              hint="Pick an emergency from the log."
            />
          ) : (
            <ul className="divide-y divide-husk/8">
              {nearby.map((facility) => (
                <li key={`${facility.kind}-${facility.reference_id}`} className="px-5 py-4">
                  <p className="text-xs text-husk">{facility.name}</p>
                  <p className="mt-0.5 text-[11px] text-moss">
                    {titleCase(facility.kind)} · {facility.location}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums text-moss">
                    Distance {facility.distance_km} km · ETA{" "}
                    {facility.eta_minutes} min
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => contact(facility)}
                    >
                      <PhoneCall size={12} />
                      Contact
                    </Button>
                    <span className="text-[11px] text-moss">
                      {facility.contact_phone ?? "No number on file"}
                    </span>
                  </div>
                </li>
              ))}
              {nearby.length === 0 && (
                <li className="px-5 py-8 text-center text-xs text-moss">
                  No facilities found near this location.
                </li>
              )}
              {current.responder && (
                <li className="px-5 py-4 text-[11px] text-crop">
                  Assistance requested from {current.responder}
                  {current.resolved_at
                    ? ` · resolved ${formatDateTime(current.resolved_at)}`
                    : ""}
                </li>
              )}
            </ul>
          )}
        </Panel>
      </div>

      <EmergencyDialog
        open={dialogOpen}
        fleet={fleet.data ?? []}
        onClose={() => setDialogOpen(false)}
        onCreated={(detail) => {
          setEmergencies((current) => [detail.emergency, ...current]);
          setSelected(detail.emergency.emergency_id);
          setNearby(detail.nearby);
        }}
      />
    </div>
  );
}

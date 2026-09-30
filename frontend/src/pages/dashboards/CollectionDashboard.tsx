import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { listStagger } from "../../animations/variants";
import { EmptyState } from "../../components/EmptyState";
import { Loader } from "../../components/Loader";
import { Panel } from "../../components/Panel";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { TruckMap } from "../../components/TruckMap";
import { useFetch } from "../../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../../hooks/useLive";
import { shipmentsApi, vehiclesApi, warehousesApi } from "../../services/api";
import type { Shipment } from "../../types";
import { formatQuantity, timeAgo, titleCase } from "../../utils/format";

export function CollectionDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "collection:shipments",
  );
  const vehicles = useFetch(() => vehiclesApi.list(), [], "vehicles");
  const points = useFetch(
    () => warehousesApi.collectionPoints(),
    [],
    "collection-points",
  );

  useLiveEvent(
    ["SHIPMENT_CREATED", "SHIPMENT_UPDATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );

  const pending = shipments.filter(
    (shipment) => shipment.collection_status === "REQUESTED",
  );
  const inProgress = shipments.filter((shipment) =>
    ["ACCEPTED", "PICKUP_ASSIGNED"].includes(shipment.collection_status),
  );
  const collected = shipments.filter((shipment) =>
    ["COLLECTED", "SENT_TO_WAREHOUSE"].includes(shipment.collection_status),
  );
  const today = new Date().toDateString();
  const todayVolume = shipments
    .filter(
      (shipment) => new Date(`${shipment.created_at}Z`).toDateString() === today,
    )
    .reduce((sum, shipment) => sum + shipment.quantity, 0);
  const activeVehicles = (vehicles.data ?? []).filter((vehicle) =>
    ["ASSIGNED", "IN_TRANSIT"].includes(vehicle.status),
  );
  const incoming = shipments.filter((shipment) =>
    ["PICKUP_ASSIGNED", "COLLECTED"].includes(shipment.collection_status),
  );

  if (state.loading && shipments.length === 0) {
    return <Loader label="Loading collection queue" />;
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={listStagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <StatCard
          label="Pending requests"
          value={pending.length}
          hint={`${inProgress.length} accepted and in progress`}
          tone="harvest"
        />
        <StatCard
          label="Today's collection volume"
          value={formatQuantity(todayVolume, "")}
          hint="Raised by farmers today"
          tone="crop"
        />
        <StatCard
          label="Completed collections"
          value={collected.length}
          hint="Collected or sent to warehouse"
          tone="chill"
        />
        <StatCard
          label="Active collection vehicles"
          value={activeVehicles.length}
          hint={`${(vehicles.data ?? []).length} vehicles in the pool`}
        />
      </motion.div>

      <Panel
        title="Pending collection requests"
        description="Farmer requests waiting for a decision"
        bodyClassName="p-0"
        action={
          <Link
            to="/collection-requests"
            className="px-5 text-[11px] text-moss transition-colors hover:text-crop"
          >
            Manage requests
          </Link>
        }
      >
        {pending.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            hint="Every farmer request has been accepted. New requests appear here live."
          />
        ) : (
          <ul className="divide-y divide-husk/8">
            {pending.slice(0, 6).map((shipment) => (
              <li
                key={shipment.shipment_id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
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
                    {formatQuantity(shipment.quantity, shipment.quantity_unit)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-moss">
                    Pickup at {shipment.source} · raised{" "}
                    {timeAgo(shipment.created_at)}
                  </p>
                </div>
                <StatusBadge status={shipment.collection_status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Incoming produce"
          description="Loads on their way to a collection point"
          bodyClassName="p-4"
        >
          {incoming.length === 0 ? (
            <EmptyState
              title="Nothing inbound"
              hint="Assign a pickup vehicle and the route shows up on this map."
            />
          ) : (
            <TruckMap shipments={incoming} height="20rem" />
          )}
        </Panel>

        <Panel
          title="Collection locations"
          description="Centres covering the farm belt"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-husk/8">
            {(points.data ?? []).map((point) => (
              <li key={point.collection_id} className="px-5 py-4">
                <p className="text-xs text-husk">{point.name}</p>
                <p className="mt-0.5 text-[11px] text-moss">
                  {point.location} · {point.contact_phone ?? "no contact"}
                </p>
              </li>
            ))}
            {(points.data ?? []).length === 0 && (
              <li className="px-5 py-8 text-center text-xs text-moss">
                No collection points registered.
              </li>
            )}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Recent collection activity"
        description="Latest status changes across the queue"
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-husk/8">
          {shipments.slice(0, 5).map((shipment) => (
            <li
              key={shipment.shipment_id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <p className="truncate text-[11px] text-husk/85">
                {shipment.shipment_id} · {shipment.produce_type} ·{" "}
                {titleCase(shipment.collection_status)}
              </p>
              <span className="shrink-0 text-[10px] text-moss">
                {timeAgo(shipment.updated_at)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

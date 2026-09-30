import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { listStagger } from "../../animations/variants";
import { EmptyState } from "../../components/EmptyState";
import { ChartViewToggle } from "../../components/ChartViewToggle";
import { Loader } from "../../components/Loader";
import { Panel } from "../../components/Panel";
import { ProgressTrack } from "../../components/ProgressTrack";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { useFetch } from "../../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../../hooks/useLive";
import {
  dashboardApi,
  inventoryApi,
  shipmentsApi,
  warehousesApi,
} from "../../services/api";
import type { Shipment } from "../../types";
import { formatQuantity, timeAgo } from "../../utils/format";

const axisStyle = { fill: "#8CA79A", fontSize: 11 };
const tooltipStyle = {
  background: "#121D18",
  border: "1px solid #274236",
  borderRadius: 12,
  fontSize: 12,
  color: "#E6EFE8",
};

export function WarehouseDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const stats = useFetch(() => dashboardApi.stats(), [], "stats");
  const warehouses = useFetch(() => warehousesApi.list(), [], "warehouses");
  const inventory = useFetch(() => inventoryApi.current(), [], "inventory");
  const lowStock = useFetch(() => inventoryApi.lowStock(), [], "low-stock");
  const history = useFetch(
    () => inventoryApi.history({}),
    [],
    "inventory-history",
  );
  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "warehouse:shipments",
  );

  useLiveEvent(
    ["SHIPMENT_UPDATED", "SHIPMENT_CREATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );
  useLiveEvent(
    ["INVENTORY_UPDATED"],
    useCallback(() => {
      void inventory.reload();
      void history.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const incoming = shipments.filter((shipment) =>
    ["ASSIGNED", "IN_TRANSIT", "DELAYED"].includes(shipment.status),
  );
  const outgoing = shipments.filter(
    (shipment) => shipment.status === "DELIVERED",
  );
  const items = inventory.data ?? [];
  const produceTypes = new Set(items.map((item) => item.produce_type));
  const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);

  const byProduce = Object.values(
    items.reduce<Record<string, { produce_type: string; quantity: number }>>(
      (acc, item) => {
        acc[item.produce_type] = acc[item.produce_type] ?? {
          produce_type: item.produce_type,
          quantity: 0,
        };
        acc[item.produce_type].quantity += item.quantity;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => b.quantity - a.quantity);

  if (state.loading && shipments.length === 0 && items.length === 0) {
    return <Loader label="Loading warehouse" />;
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
          label="Stock on hand"
          value={formatQuantity(totalStock, "")}
          hint={`${produceTypes.size} produce types stored`}
          tone="crop"
        />
        <StatCard
          label="Network utilization"
          value={`${stats.data?.warehouse_utilization ?? 0}%`}
          hint={`${stats.data?.total_warehouses ?? 0} warehouses`}
          tone="chill"
        />
        <StatCard
          label="Incoming shipments"
          value={incoming.length}
          hint={`${outgoing.length} delivered so far`}
          tone="harvest"
        />
        <StatCard
          label="Low stock items"
          value={(lowStock.data ?? []).length}
          hint="Under their reorder level"
          tone={(lowStock.data ?? []).length ? "rot" : "neutral"}
        />
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel
          title="Warehouse capacity"
          description="Used space across the network"
        >
          <ul className="space-y-4">
            {(warehouses.data ?? []).map((warehouse) => (
              <li key={warehouse.warehouse_id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs text-husk">{warehouse.name}</p>
                  <span className="text-[11px] tabular-nums text-moss">
                    {warehouse.current_utilization.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressTrack
                    value={warehouse.current_utilization}
                    label={`${warehouse.available_capacity.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 },
                    )} of ${warehouse.total_capacity.toLocaleString()} kg free · ${
                      warehouse.storage_type.replace("_", " ").toLowerCase()
                    }`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Current inventory" description="Stock by produce type">
          {byProduce.length === 0 ? (
            <EmptyState
              title="No stock recorded"
              hint="Receive a shipment or record a movement to build the inventory."
            />
          ) : (
            <ChartViewToggle
              height={260}
              pieData={byProduce.map((row) => ({
                name: row.produce_type,
                value: row.quantity,
              }))}
            >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={byProduce}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 20 }}
              >
                <CartesianGrid stroke="#1D2F27" strokeDasharray="3 6" />
                <XAxis type="number" tick={axisStyle} stroke="#274236" />
                <YAxis
                  type="category"
                  dataKey="produce_type"
                  tick={axisStyle}
                  stroke="#274236"
                  width={70}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#16241E" }} />
                <Bar dataKey="quantity" radius={[0, 6, 6, 0]}>
                  {byProduce.map((row, index) => (
                    <Cell
                      key={row.produce_type}
                      fill={index === 0 ? "#4FBF7A" : "#2F8F5B"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </ChartViewToggle>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Incoming shipments"
          description="Loads heading into storage"
          bodyClassName="p-0"
        >
          {incoming.length === 0 ? (
            <EmptyState
              title="Nothing inbound"
              hint="Dispatched shipments appear here with their live progress."
            />
          ) : (
            <ul className="divide-y divide-husk/8">
              {incoming.slice(0, 6).map((shipment) => (
                <li key={shipment.shipment_id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/shipments/${shipment.shipment_id}`}
                        className="font-mono text-xs text-crop hover:underline"
                      >
                        {shipment.shipment_id}
                      </Link>
                      <p className="mt-1 truncate text-xs text-husk">
                        {shipment.produce_type} ·{" "}
                        {formatQuantity(
                          shipment.quantity,
                          shipment.quantity_unit,
                        )}
                      </p>
                    </div>
                    <StatusBadge
                      status={shipment.status}
                      pulse={shipment.status === "IN_TRANSIT"}
                    />
                  </div>
                  <div className="mt-3">
                    <ProgressTrack value={shipment.progress_percentage} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recent stock movements"
          description="Newest entries in the track record"
          bodyClassName="p-0"
          action={
            <Link
              to="/inventory-history"
              className="px-5 text-[11px] text-moss transition-colors hover:text-crop"
            >
              Full history
            </Link>
          }
        >
          <ul className="divide-y divide-husk/8">
            {(history.data ?? []).slice(0, 7).map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs text-husk">
                    {row.produce_type} ·{" "}
                    {formatQuantity(row.quantity, row.unit)}
                  </p>
                  <p className="text-[11px] text-moss">
                    {row.transaction_type.toLowerCase()} · balance{" "}
                    {row.balance_after_transaction.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-moss">
                  {timeAgo(row.timestamp)}
                </span>
              </li>
            ))}
            {(history.data ?? []).length === 0 && (
              <li className="px-5 py-8 text-center text-xs text-moss">
                No movements recorded yet.
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

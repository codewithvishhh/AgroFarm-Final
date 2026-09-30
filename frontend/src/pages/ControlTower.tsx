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

import { EmptyState } from "../components/EmptyState";
import { ChartViewToggle } from "../components/ChartViewToggle";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { TruckMap } from "../components/TruckMap";
import { useFetch } from "../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../hooks/useLive";
import { alertsApi, dashboardApi, shipmentsApi } from "../services/api";
import type { Shipment } from "../types";
import { formatQuantity, timeAgo, titleCase } from "../utils/format";

const axisStyle = { fill: "#8CA79A", fontSize: 11 };
const tooltipStyle = {
  background: "#121D18",
  border: "1px solid #274236",
  borderRadius: 12,
  fontSize: 12,
  color: "#E6EFE8",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#8CA79A",
  ASSIGNED: "#5AA9CE",
  IN_TRANSIT: "#4FBF7A",
  DELAYED: "#E2A03F",
  DELIVERED: "#2F8F5B",
  CANCELLED: "#E2564D",
};

/** Supply chain control dashboard: one screen across the whole network. */
export function ControlTower() {
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const stats = useFetch(() => dashboardApi.stats(), [], "stats");
  const analytics = useFetch(() => dashboardApi.analytics(), [], "analytics");
  const alerts = useFetch(
    () => alertsApi.list({ is_resolved: false }),
    [],
    "open-alerts",
  );
  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "control:shipments",
  );

  useLiveEvent(
    ["SHIPMENT_UPDATED", "SHIPMENT_CREATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );

  const moving = shipments.filter((shipment) =>
    ["IN_TRANSIT", "DELAYED"].includes(shipment.status),
  );
  const kpi = stats.data;
  const statusData = (analytics.data?.status_breakdown ?? []).filter(
    (row) => row.value > 0,
  );
  const utilization = analytics.data?.warehouse_utilization ?? [];
  const critical = (alerts.data ?? [])
    .filter((alert) => alert.severity !== "INFO")
    .slice(0, 6);

  if (state.loading && !kpi) return <Loader label="Loading control tower" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Active shipments" value={kpi?.active_shipments ?? 0} tone="crop" />
        <StatCard label="Vehicles in transit" value={kpi?.in_transit ?? 0} tone="chill" />
        <StatCard label="Warehouses" value={kpi?.total_warehouses ?? 0} />
        <StatCard
          label="Total inventory"
          value={formatQuantity(kpi?.total_inventory ?? 0, "")}
        />
        <StatCard
          label="Pending collections"
          value={kpi?.pending_collections ?? 0}
          tone="harvest"
        />
        <StatCard
          label="Active alerts"
          value={kpi?.active_alerts ?? 0}
          tone={kpi?.critical_alerts ? "rot" : "neutral"}
        />
        <StatCard
          label="Emergency cases"
          value={kpi?.active_emergencies ?? 0}
          tone={kpi?.active_emergencies ? "rot" : "neutral"}
        />
      </div>

      <Panel
        title="Live fleet map"
        description="Every truck currently on the road"
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
            hint="Dispatch a shipment to populate the control tower map."
          />
        ) : (
          <TruckMap shipments={moving} height="24rem" />
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Shipment status" description="Across the whole network">
          {statusData.length === 0 ? (
            <EmptyState title="No shipments" hint="Create one to see the split." />
          ) : (
            <ChartViewToggle
              height={260}
              pieData={statusData.map((row) => ({
                name: titleCase(row.label),
                value: row.value,
                color: STATUS_COLOR[row.label] ?? "#2F8F5B",
              }))}
            >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData} margin={{ top: 8, right: 8, left: 0 }}>
                <CartesianGrid stroke="#1D2F27" strokeDasharray="3 6" />
                <XAxis
                  dataKey="label"
                  tick={axisStyle}
                  stroke="#274236"
                  tickFormatter={titleCase}
                />
                <YAxis tick={axisStyle} stroke="#274236" width={40} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#16241E" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((row) => (
                    <Cell
                      key={row.label}
                      fill={STATUS_COLOR[row.label] ?? "#2F8F5B"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </ChartViewToggle>
          )}
        </Panel>

        <Panel title="Warehouse utilization" description="Percent of space used">
          {utilization.length === 0 ? (
            <EmptyState title="No warehouses" hint="Add one to see utilization." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={utilization}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 30 }}
              >
                <CartesianGrid stroke="#1D2F27" strokeDasharray="3 6" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={axisStyle}
                  stroke="#274236"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={axisStyle}
                  stroke="#274236"
                  width={130}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#16241E" }} />
                <Bar dataKey="utilization" radius={[0, 6, 6, 0]}>
                  {utilization.map((row) => (
                    <Cell
                      key={row.name}
                      fill={row.utilization > 80 ? "#E2A03F" : "#4FBF7A"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel
        title="Latest critical alerts"
        description="Warnings and critical events still open"
        bodyClassName="p-0"
        action={
          <Link
            to="/alerts"
            className="px-5 text-[11px] text-moss transition-colors hover:text-crop"
          >
            Alert centre
          </Link>
        }
      >
        {critical.length === 0 ? (
          <EmptyState
            title="Nothing critical"
            hint="Cold chain and delivery deadlines are all inside their bands."
          />
        ) : (
          <ul className="divide-y divide-husk/8">
            {critical.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={alert.severity} />
                    <span className="text-[11px] text-moss">
                      {titleCase(alert.alert_type)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-husk">{alert.message}</p>
                </div>
                <span className="shrink-0 text-[10px] text-moss">
                  {timeAgo(alert.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

import { listStagger } from "../../animations/variants";
import { EmptyState } from "../../components/EmptyState";
import { Loader } from "../../components/Loader";
import { Panel } from "../../components/Panel";
import { ProgressTrack } from "../../components/ProgressTrack";
import { StatCard } from "../../components/StatCard";
import { StatusBadge } from "../../components/StatusBadge";
import { TruckMap } from "../../components/TruckMap";
import { useFetch } from "../../hooks/useFetch";
import { mergeShipment, useLiveEvent } from "../../hooks/useLive";
import { forecastApi, inventoryApi, shipmentsApi } from "../../services/api";
import type { Shipment } from "../../types";
import { formatEta, formatQuantity } from "../../utils/format";

export function RetailerDashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const state = useFetch(
    () => shipmentsApi.list().then((rows) => (setShipments(rows), rows)),
    [],
    "retailer:shipments",
  );
  const inventory = useFetch(() => inventoryApi.current(), [], "inventory");
  const forecasts = useFetch(() => forecastApi.summary(), [], "forecast-summary");

  useLiveEvent(
    ["SHIPMENT_UPDATED", "SHIPMENT_CREATED"],
    useCallback((message) => {
      setShipments((current) => mergeShipment(current, message.data as Shipment));
    }, []),
  );

  const incoming = shipments.filter((shipment) =>
    ["ASSIGNED", "IN_TRANSIT", "DELAYED"].includes(shipment.status),
  );
  const delayed = shipments.filter((shipment) => shipment.status === "DELAYED");
  const moving = incoming.filter((shipment) =>
    ["IN_TRANSIT", "DELAYED"].includes(shipment.status),
  );
  const items = inventory.data ?? [];
  const stock = items.reduce((sum, item) => sum + item.quantity, 0);
  const lowStock = items.filter((item) => item.quantity < item.reorder_level);
  const rows = forecasts.data ?? [];

  if (state.loading && shipments.length === 0) {
    return <Loader label="Loading store view" />;
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
          label="Incoming shipments"
          value={incoming.length}
          hint={`${moving.length} on the road now`}
          tone="crop"
        />
        <StatCard
          label="Current stock"
          value={formatQuantity(stock, "")}
          hint={`${items.length} stock lines`}
          tone="chill"
        />
        <StatCard
          label="Low stock alerts"
          value={lowStock.length}
          tone={lowStock.length ? "rot" : "neutral"}
          hint="Under the reorder level"
        />
        <StatCard
          label="Delayed shipments"
          value={delayed.length}
          tone={delayed.length ? "harvest" : "neutral"}
        />
      </motion.div>

      <Panel
        title="Demand forecast"
        description="Next seven days against the stock on hand"
        bodyClassName="p-0"
        action={
          <Link
            to="/forecast"
            className="px-5 text-[11px] text-moss transition-colors hover:text-crop"
          >
            Open forecast
          </Link>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No demand history"
            hint="Record daily sales to build the forecast series."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] text-moss">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Current stock</th>
                  <th className="px-5 py-3 font-medium">Forecast demand</th>
                  <th className="px-5 py-3 font-medium">Recommended order</th>
                  <th className="px-5 py-3 font-medium">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-husk/8">
                {rows.map((row) => (
                  <tr key={row.produce_type} className="hover:bg-husk/4">
                    <td className="px-5 py-3 text-xs text-husk">
                      {row.produce_type}
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-moss">
                      {row.current_stock.toLocaleString()} {row.unit}
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-moss">
                      {row.expected_demand.toLocaleString()} {row.unit}
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-husk">
                      {row.potential_shortage > 0
                        ? `${row.potential_shortage.toLocaleString()} ${row.unit}`
                        : "No order needed"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={
                          row.potential_shortage > 0 ? "WARNING" : "AVAILABLE"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Panel
          title="Incoming deliveries on the map"
          description="Track the loads heading to your store"
          bodyClassName="p-4"
        >
          {moving.length === 0 ? (
            <EmptyState
              title="Nothing on the road"
              hint="Dispatched loads for your store show up here with live positions."
            />
          ) : (
            <TruckMap shipments={moving} height="21rem" />
          )}
        </Panel>

        <Panel
          title="Expected deliveries"
          description="Sorted by the closest arrival"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-husk/8">
            {incoming
              .slice()
              .sort(
                (a, b) => (a.eta_minutes ?? 1e9) - (b.eta_minutes ?? 1e9),
              )
              .slice(0, 6)
              .map((shipment) => (
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
                      <p className="text-[11px] text-moss">
                        ETA {formatEta(shipment.eta_minutes)}
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
            {incoming.length === 0 && (
              <li className="px-5 py-8 text-center text-xs text-moss">
                No deliveries scheduled.
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

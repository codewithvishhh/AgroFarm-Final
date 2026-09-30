import { useCallback, useState } from "react";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ProgressTrack } from "../components/ProgressTrack";
import { StatCard } from "../components/StatCard";
import { useFetch } from "../hooks/useFetch";
import { useLive, useLiveEvent } from "../hooks/useLive";
import { inventoryApi, warehousesApi } from "../services/api";
import type { TransactionType } from "../types";
import { formatQuantity, timeAgo } from "../utils/format";

const TYPES: TransactionType[] = [
  "RECEIVED",
  "STORED",
  "TRANSFERRED",
  "DISPATCHED",
  "SPOILED",
  "ADJUSTMENT",
];

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

export function Inventory() {
  const { pushToast } = useLive();
  const [warehouseId, setWarehouseId] = useState("");
  const [produce, setProduce] = useState("");
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState<TransactionType>("RECEIVED");
  const [busy, setBusy] = useState(false);

  const warehouses = useFetch(() => warehousesApi.list(), [], "warehouses");
  const items = useFetch(
    () => inventoryApi.current(warehouseId || undefined),
    [warehouseId],
    `inventory:${warehouseId || "all"}`,
  );
  const lowStock = useFetch(() => inventoryApi.lowStock(), [], "low-stock");

  useLiveEvent(
    ["INVENTORY_UPDATED"],
    useCallback(() => {
      void items.reload();
      void lowStock.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const rows = items.data ?? [];
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);

  const record = async () => {
    const amount = Number(quantity);
    if (!warehouseId || !produce.trim() || !Number.isFinite(amount) || amount <= 0) {
      pushToast({
        title: "Check the form",
        message: "Pick a warehouse, a produce type, and a quantity above zero.",
        tone: "warn",
      });
      return;
    }
    setBusy(true);
    try {
      await inventoryApi.move({
        warehouse_id: warehouseId,
        produce_type: produce.trim(),
        quantity: amount,
        transaction_type: type,
        note: "Recorded from the inventory page",
      });
      setQuantity("");
      await Promise.all([items.reload(), lowStock.reload(), warehouses.reload()]);
      pushToast({
        title: "Movement recorded",
        message: "Stock and the track record are both updated.",
        tone: "good",
      });
    } catch (exception) {
      pushToast({
        title: "Could not record",
        message: (exception as Error).message,
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  if (items.loading && rows.length === 0) return <Loader label="Loading stock" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Stock on hand"
          value={formatQuantity(total, "")}
          tone="crop"
          hint={`${rows.length} stock lines`}
        />
        <StatCard
          label="Produce types"
          value={new Set(rows.map((row) => row.produce_type)).size}
          tone="chill"
        />
        <StatCard
          label="Low stock"
          value={(lowStock.data ?? []).length}
          tone={(lowStock.data ?? []).length ? "rot" : "neutral"}
        />
        <StatCard
          label="Warehouses"
          value={(warehouses.data ?? []).length}
          hint="Across the network"
        />
      </div>

      <Panel
        title="Record a stock movement"
        description="Every entry writes one line into the inventory track record"
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-moss">
            Warehouse
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            >
              <option value="">All warehouses</option>
              {(warehouses.data ?? []).map((warehouse) => (
                <option
                  key={warehouse.warehouse_id}
                  value={warehouse.warehouse_id}
                >
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] text-moss">
            Produce
            <input
              value={produce}
              onChange={(event) => setProduce(event.target.value)}
              placeholder="Tomato"
              className={`mt-1 block w-32 ${fieldClass} placeholder:text-moss/50`}
            />
          </label>

          <label className="text-[11px] text-moss">
            Quantity
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              inputMode="decimal"
              placeholder="500"
              className={`mt-1 block w-28 ${fieldClass} placeholder:text-moss/50`}
            />
          </label>

          <label className="text-[11px] text-moss">
            Movement
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as TransactionType)
              }
              className={`mt-1 block ${fieldClass}`}
            >
              {TYPES.map((option) => (
                <option key={option} value={option}>
                  {option.toLowerCase()}
                </option>
              ))}
            </select>
          </label>

          <Button onClick={record} disabled={busy}>
            {busy ? "Recording" : "Record movement"}
          </Button>
        </div>
      </Panel>

      <Panel
        title="Current inventory"
        description="Live quantity per produce type"
        bodyClassName="p-0"
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No stock here"
            hint="Receive a delivery or record a movement to open the first stock line."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] text-moss">
                  <th className="px-5 py-3 font-medium">Produce</th>
                  <th className="px-5 py-3 font-medium">Warehouse</th>
                  <th className="px-5 py-3 font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Against reorder level</th>
                  <th className="px-5 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-husk/8">
                {rows.map((row) => {
                  const warehouse = (warehouses.data ?? []).find(
                    (item) => item.warehouse_id === row.warehouse_id,
                  );
                  const ratio =
                    row.reorder_level > 0
                      ? Math.min(100, (row.quantity / row.reorder_level) * 50)
                      : 100;
                  return (
                    <tr key={row.id} className="hover:bg-husk/4">
                      <td className="px-5 py-3 text-xs text-husk">
                        {row.produce_type}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-moss">
                        {warehouse?.name ?? row.warehouse_id}
                      </td>
                      <td className="px-5 py-3 text-xs tabular-nums text-husk">
                        {formatQuantity(row.quantity, row.unit)}
                      </td>
                      <td className="w-56 px-5 py-3">
                        <ProgressTrack
                          value={ratio}
                          label={`Reorder at ${row.reorder_level.toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 },
                          )} ${row.unit}${
                            row.quantity < row.reorder_level
                              ? " · below level"
                              : ""
                          }`}
                        />
                      </td>
                      <td className="px-5 py-3 text-[11px] text-moss">
                        {timeAgo(row.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

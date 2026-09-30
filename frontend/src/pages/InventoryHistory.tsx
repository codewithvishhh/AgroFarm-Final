import { useState } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { useFetch } from "../hooks/useFetch";
import { inventoryApi, warehousesApi } from "../services/api";
import type { TransactionType } from "../types";
import { formatDateTime, formatQuantity, titleCase } from "../utils/format";

const TYPES: TransactionType[] = [
  "RECEIVED",
  "STORED",
  "TRANSFERRED",
  "DISPATCHED",
  "SPOILED",
  "ADJUSTMENT",
];

const TONE: Record<string, string> = {
  RECEIVED: "text-crop",
  STORED: "text-crop",
  TRANSFERRED: "text-chill",
  DISPATCHED: "text-harvest",
  SPOILED: "text-rot",
  ADJUSTMENT: "text-moss",
};

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

/** Inventory track record: one row per quantity movement, with the balance. */
export function InventoryHistory() {
  const [warehouseId, setWarehouseId] = useState("");
  const [produce, setProduce] = useState("");
  const [type, setType] = useState<TransactionType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const warehouses = useFetch(() => warehousesApi.list(), [], "warehouses");
  const history = useFetch(
    () =>
      inventoryApi.history({
        warehouse_id: warehouseId || undefined,
        produce_type: produce || undefined,
        transaction_type: (type || undefined) as TransactionType | undefined,
        date_from: from ? new Date(from).toISOString() : undefined,
        date_to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      }),
    [warehouseId, produce, type, from, to],
    "history:all",
  );

  const rows = history.data ?? [];
  const produceTypes = Array.from(
    new Set(rows.map((row) => row.produce_type)),
  ).sort();

  return (
    <div className="space-y-5">
      <Panel title="Filters" description="Narrow the track record">
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
            <select
              value={produce}
              onChange={(event) => setProduce(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            >
              <option value="">All produce</option>
              {produceTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] text-moss">
            Movement type
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as TransactionType | "")
              }
              className={`mt-1 block ${fieldClass}`}
            >
              <option value="">All types</option>
              {TYPES.map((option) => (
                <option key={option} value={option}>
                  {titleCase(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] text-moss">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            />
          </label>

          <label className="text-[11px] text-moss">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            />
          </label>

          <button
            onClick={() => {
              setWarehouseId("");
              setProduce("");
              setType("");
              setFrom("");
              setTo("");
            }}
            className="rounded-lg px-2.5 py-2 text-[11px] text-moss hover:text-husk"
          >
            Clear
          </button>
        </div>
      </Panel>

      <Panel
        title="Inventory history"
        description={`${rows.length} movements recorded`}
        bodyClassName="p-0"
      >
        {history.loading && rows.length === 0 ? (
          <div className="px-5">
            <Loader label="Loading movements" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No movements match"
            hint="Clear the filters, or record a movement on the inventory page."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] text-moss">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Produce</th>
                  <th className="px-5 py-3 font-medium">Quantity</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Shipment</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-husk/8">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-husk/4">
                    <td className="px-5 py-3 text-[11px] text-moss">
                      {formatDateTime(row.timestamp)}
                    </td>
                    <td className="px-5 py-3 text-xs text-husk">
                      {row.produce_type}
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-husk">
                      {formatQuantity(row.quantity, row.unit)}
                    </td>
                    <td
                      className={`px-5 py-3 text-xs ${TONE[row.transaction_type] ?? "text-moss"}`}
                    >
                      {titleCase(row.transaction_type)}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {row.reference_shipment ? (
                        <Link
                          to={`/shipments/${row.reference_shipment}`}
                          className="font-mono text-crop hover:underline"
                        >
                          {row.reference_shipment}
                        </Link>
                      ) : (
                        <span className="text-moss">{row.note ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs tabular-nums text-husk">
                      {row.balance_after_transaction.toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })}{" "}
                      {row.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

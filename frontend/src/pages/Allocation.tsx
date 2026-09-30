import { Check, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/Button";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { ProgressTrack } from "../components/ProgressTrack";
import { StatusBadge } from "../components/StatusBadge";
import { FARM_HUBS, PRODUCE } from "../components/ShipmentForm";
import { useFetch } from "../hooks/useFetch";
import { warehousesApi } from "../services/api";
import type { AllocationResult } from "../types";
import { titleCase } from "../utils/format";

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

/** Smart warehouse allocation: scoring, not a model, with the reasons shown. */
export function Allocation() {
  const [produce, setProduce] = useState("Tomato");
  const [quantity, setQuantity] = useState("2000");
  const [hub, setHub] = useState(FARM_HUBS[0].name);
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const warehouses = useFetch(() => warehousesApi.list(), [], "warehouses");

  const run = async () => {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a quantity above zero.");
      return;
    }
    const origin = FARM_HUBS.find((item) => item.name === hub)!;
    setBusy(true);
    setError(null);
    try {
      setResult(
        await warehousesApi.allocate({
          produce_type: produce,
          quantity: amount,
          latitude: origin.latitude,
          longitude: origin.longitude,
        }),
      );
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const best = result?.recommended;

  return (
    <div className="space-y-6">
      <Panel
        title="Find a warehouse"
        description="Scored on free capacity, distance, current utilization, and storage compatibility"
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-moss">
            Produce
            <select
              value={produce}
              onChange={(event) => setProduce(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            >
              {PRODUCE.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] text-moss">
            Quantity (kg)
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              inputMode="decimal"
              className={`mt-1 block w-28 ${fieldClass}`}
            />
          </label>

          <label className="text-[11px] text-moss">
            Pickup point
            <select
              value={hub}
              onChange={(event) => setHub(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            >
              {FARM_HUBS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <Button onClick={run} disabled={busy}>
            {busy ? "Scoring" : "Recommend warehouse"}
          </Button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-rot/40 bg-rot/10 px-3 py-2 text-[11px] text-rot">
            {error}
          </p>
        )}
      </Panel>

      {busy && !result && <Loader label="Scoring warehouses" />}

      {best && (
        <Panel
          title="Recommended warehouse"
          description={result?.explanation}
          className="border-crop/30"
        >
          <div className="grid gap-5 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <p className="font-display text-lg text-husk">{best.name}</p>
              <p className="mt-1 text-[11px] text-moss">
                {best.location} · {titleCase(best.storage_type)}
              </p>
              <ul className="mt-3 space-y-1.5">
                {best.reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-2 text-[11px] text-moss"
                  >
                    <Check size={12} className="mt-0.5 shrink-0 text-crop" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] text-moss">Available capacity</p>
              <p className="mt-1 font-display text-2xl tabular-nums text-husk">
                {best.available_capacity.toLocaleString()} kg
              </p>
              <p className="mt-4 text-[11px] text-moss">Distance</p>
              <p className="mt-1 font-display text-2xl tabular-nums text-husk">
                {best.distance_km} km
              </p>
            </div>

            <div>
              <p className="text-[11px] text-moss">Utilization</p>
              <p className="mt-1 font-display text-2xl tabular-nums text-husk">
                {best.utilization.toFixed(0)}%
              </p>
              <div className="mt-2">
                <ProgressTrack value={best.utilization} />
              </div>
              <p className="mt-4 text-[11px] text-moss">Allocation score</p>
              <p className="mt-1 font-display text-2xl tabular-nums text-crop">
                {best.score.toFixed(1)}
              </p>
            </div>
          </div>
        </Panel>
      )}

      {result && (
        <Panel
          title="All candidates"
          description="Same scoring applied to every warehouse"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] text-moss">
                  <th className="px-5 py-3 font-medium">Warehouse</th>
                  <th className="px-5 py-3 font-medium">Distance</th>
                  <th className="px-5 py-3 font-medium">Free capacity</th>
                  <th className="px-5 py-3 font-medium">Utilization</th>
                  <th className="px-5 py-3 font-medium">Storage</th>
                  <th className="px-5 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-husk/8">
                {result.candidates.map((candidate) => (
                  <tr
                    key={candidate.warehouse_id}
                    className="hover:bg-husk/4"
                  >
                    <td className="px-5 py-3">
                      <p className="text-xs text-husk">{candidate.name}</p>
                      <p className="text-[11px] text-moss">
                        {candidate.location}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-moss">
                      {candidate.distance_km} km
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-moss">
                      {candidate.available_capacity.toLocaleString()} kg
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-moss">
                      {candidate.utilization.toFixed(0)}%
                    </td>
                    <td className="px-5 py-3 text-[11px] text-moss">
                      {titleCase(candidate.storage_type)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-husk">
                          {candidate.score.toFixed(1)}
                        </span>
                        {!candidate.fits && <StatusBadge status="WARNING" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!result && (
        <Panel bodyClassName="p-5">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-moss">
            <Info size={13} className="mt-0.5 shrink-0 text-chill" />
            Scoring is deterministic and explainable: free capacity carries 35%,
            distance 30%, current utilization 20%, and storage compatibility 15%.
            A learned ranker can replace the scoring function later without
            changing this page or the API. The network currently has{" "}
            {(warehouses.data ?? []).length} warehouses.
          </p>
        </Panel>
      )}
    </div>
  );
}

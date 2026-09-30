import { Check } from "lucide-react";

import type { ShipmentStage } from "../types";

const STAGES: { key: ShipmentStage; label: string }[] = [
  { key: "FARM", label: "Farmer" },
  { key: "COLLECTION", label: "Collection" },
  { key: "WAREHOUSE", label: "Warehouse" },
  { key: "TRANSPORT", label: "Transport" },
  { key: "RETAILER", label: "Retailer" },
];

/** Farm to retail lifecycle, with the current stage highlighted. */
export function ShipmentTimeline({ stage }: { stage: ShipmentStage }) {
  const currentIndex = STAGES.findIndex((item) => item.key === stage);

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STAGES.map((item, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={item.key} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                active
                  ? "border-crop/45 bg-crop/10 text-crop"
                  : done
                    ? "border-soil-500 bg-soil-700/60 text-husk/80"
                    : "border-soil-600 text-moss"
              }`}
            >
              {done && <Check size={12} />}
              {item.label}
            </span>
            {index < STAGES.length - 1 && (
              <span
                className={`h-px w-5 ${
                  index < currentIndex ? "bg-crop/50" : "bg-soil-600"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

import type { AlertSeverity, ShipmentStatus, VehicleStatus } from "../types";
import { titleCase } from "../utils/format";

const TONES: Record<string, string> = {
  PENDING: "bg-moss/10 text-moss border-moss/25",
  ASSIGNED: "bg-chill/10 text-chill border-chill/30",
  IN_TRANSIT: "bg-crop/10 text-crop border-crop/35",
  DELAYED: "bg-harvest/10 text-harvest border-harvest/35",
  DELIVERED: "bg-crop/10 text-crop/90 border-crop/25",
  CANCELLED: "bg-rot/10 text-rot border-rot/30",
  AVAILABLE: "bg-crop/10 text-crop border-crop/30",
  MAINTENANCE: "bg-rot/10 text-rot border-rot/30",
  INFO: "bg-chill/10 text-chill border-chill/30",
  WARNING: "bg-harvest/10 text-harvest border-harvest/35",
  CRITICAL: "bg-rot/10 text-rot border-rot/40",
};

interface StatusBadgeProps {
  status: ShipmentStatus | VehicleStatus | AlertSeverity | string;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse }: StatusBadgeProps) {
  const tone = TONES[status] ?? "bg-soil-600 text-moss border-soil-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-70 animate-pulseRing" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {titleCase(status)}
    </span>
  );
}

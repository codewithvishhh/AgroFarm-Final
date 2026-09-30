import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon } from "lucide-react";
import { useState } from "react";

import { dialogMotion } from "../animations/variants";
import { emergenciesApi } from "../services/api";
import type { EmergencyDetail, EmergencyType, FleetRow } from "../types";
import { Button } from "./Button";

const TYPES: { value: EmergencyType; label: string }[] = [
  { value: "PUNCTURE", label: "Tyre puncture" },
  { value: "ACCIDENT", label: "Accident" },
  { value: "ENGINE_FAILURE", label: "Engine failure" },
  { value: "FUEL_PROBLEM", label: "Fuel problem" },
  { value: "MEDICAL_EMERGENCY", label: "Medical emergency" },
  { value: "OTHER", label: "Other" },
];

const fieldClass =
  "w-full rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-3 py-2 text-xs text-husk outline-none focus:border-crop/60";

interface EmergencyDialogProps {
  open: boolean;
  fleet: FleetRow[];
  onClose: () => void;
  onCreated: (detail: EmergencyDetail) => void;
}

export function EmergencyDialog({
  open,
  fleet,
  onClose,
  onCreated,
}: EmergencyDialogProps) {
  const [vehicleId, setVehicleId] = useState("");
  const [type, setType] = useState<EmergencyType>("PUNCTURE");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = fleet.find((row) => row.vehicle_id === vehicleId);

  const submit = async () => {
    setError(null);
    if (!vehicleId) {
      setError("Select the vehicle that needs help.");
      return;
    }
    setSaving(true);
    try {
      const detail = await emergenciesApi.create({
        vehicle_id: vehicleId,
        shipment_id: selected?.shipment_id ?? null,
        emergency_type: type,
        description: description || undefined,
      });
      onCreated(detail);
      onClose();
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-soil-900/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={dialogMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md glass-strong edge-light rounded-3xl border-rot/40"
          >
            <header className="flex items-center gap-2 border-b border-husk/8 px-5 py-4">
              <AlertOctagon size={16} className="text-rot" />
              <div>
                <h2 className="font-display text-sm text-husk">
                  Report an emergency
                </h2>
                <p className="mt-0.5 text-[11px] text-moss">
                  The current GPS position is captured and nearby help is listed
                  straight away.
                </p>
              </div>
            </header>

            <div className="space-y-4 px-5 py-5">
              <label className="block text-[11px] text-moss">
                Vehicle
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                  className={`mt-1 ${fieldClass}`}
                >
                  <option value="">Select a vehicle</option>
                  {fleet.map((row) => (
                    <option key={row.vehicle_id} value={row.vehicle_id}>
                      {row.vehicle_number} · {row.driver_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[11px] text-moss">
                Issue
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as EmergencyType)
                  }
                  className={`mt-1 ${fieldClass}`}
                >
                  {TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[11px] text-moss">
                What happened
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="Rear tyre burst near the bypass"
                  className={`mt-1 ${fieldClass} resize-none placeholder:text-moss/50`}
                />
              </label>

              {selected?.shipment_id && (
                <p className="rounded-lg border border-soil-600 bg-husk/4 px-3 py-2 text-[11px] text-moss">
                  Carrying {selected.produce_type} on {selected.shipment_id} to{" "}
                  {selected.destination}.
                </p>
              )}

              {error && (
                <p className="rounded-lg border border-rot/40 bg-rot/10 px-3 py-2 text-[11px] text-rot">
                  {error}
                </p>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-husk/8 px-5 py-4">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="danger" onClick={submit} disabled={saving}>
                {saving ? "Sending" : "Request assistance"}
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

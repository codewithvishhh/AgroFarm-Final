import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { dialogMotion } from "../animations/variants";
import { shipmentsApi } from "../services/api";
import type { Retailer, Shipment, Vehicle, Warehouse } from "../types";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./Button";

/** Farm gates used as pickup presets. */
export const FARM_HUBS = [
  { name: "Ozar, Nashik", latitude: 20.0854, longitude: 73.9285 },
  { name: "Sangamner, Ahmednagar", latitude: 19.5726, longitude: 74.2113 },
  { name: "Baramati, Pune", latitude: 18.1514, longitude: 74.5815 },
  { name: "Karad, Satara", latitude: 17.2896, longitude: 74.1845 },
  { name: "Miraj, Sangli", latitude: 16.8302, longitude: 74.6447 },
  { name: "Panhala, Kolhapur", latitude: 16.8103, longitude: 74.1103 },
];

export const PRODUCE = [
  { name: "Tomato", unit: "kg" },
  { name: "Potato", unit: "kg" },
  { name: "Onion", unit: "kg" },
  { name: "Wheat", unit: "quintal" },
  { name: "Rice", unit: "quintal" },
  { name: "Apple", unit: "kg" },
  { name: "Banana", unit: "kg" },
  { name: "Other", unit: "kg" },
];

const fieldClass =
  "w-full rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-3 py-2 text-xs text-husk outline-none transition-colors focus:border-crop/60";

interface ShipmentFormProps {
  open: boolean;
  vehicles: Vehicle[];
  retailers: Retailer[];
  warehouses: Warehouse[];
  onClose: () => void;
  onCreated: (shipment: Shipment) => void;
}

export function ShipmentForm({
  open,
  vehicles,
  retailers,
  warehouses,
  onClose,
  onCreated,
}: ShipmentFormProps) {
  const { session } = useAuth();
  const [produce, setProduce] = useState(PRODUCE[0].name);
  const [quantity, setQuantity] = useState("1500");
  const [unit, setUnit] = useState("kg");
  const [source, setSource] = useState(FARM_HUBS[0].name);
  const [retailerId, setRetailerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (retailers.length && !retailerId) setRetailerId(retailers[0].retailer_id);
  }, [retailers, retailerId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const submit = async () => {
    setError(null);
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a quantity above zero.");
      return;
    }
    const retailer = retailers.find((item) => item.retailer_id === retailerId);
    if (!retailer) {
      setError("Pick a destination retailer.");
      return;
    }
    const from = FARM_HUBS.find((hub) => hub.name === source)!;

    setSaving(true);
    try {
      const shipment = await shipmentsApi.create({
        produce_type: produce,
        quantity: amount,
        quantity_unit: unit,
        source: from.name,
        destination: retailer.location,
        source_latitude: from.latitude,
        source_longitude: from.longitude,
        destination_latitude: retailer.latitude,
        destination_longitude: retailer.longitude,
        farmer_name: session?.name,
        created_by: session?.name,
        created_by_role: session?.role,
        vehicle_id: vehicleId || null,
        warehouse_id: warehouseId || null,
        delivery_deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      onCreated(shipment);
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
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-husk/12 bg-soil-800/55 backdrop-blur shadow-panel"
          >
            <header className="border-b border-husk/8 px-5 py-4">
              <h2 className="font-display text-sm text-husk">
                Create produce shipment
              </h2>
              <p className="mt-1 text-[11px] text-moss">
                The request goes to the collection team, who assign a vehicle and
                pick up the load.
              </p>
            </header>

            <div className="grid grid-cols-2 gap-4 px-5 py-5">
              <label className="text-[11px] text-moss">
                Produce
                <select
                  value={produce}
                  onChange={(event) => {
                    setProduce(event.target.value);
                    const found = PRODUCE.find(
                      (item) => item.name === event.target.value,
                    );
                    if (found) setUnit(found.unit);
                  }}
                  className={`mt-1 ${fieldClass}`}
                >
                  {PRODUCE.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                <label className="text-[11px] text-moss">
                  Quantity
                  <input
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    inputMode="decimal"
                    className={`mt-1 ${fieldClass}`}
                  />
                </label>
                <label className="text-[11px] text-moss">
                  Unit
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    className={`mt-1 ${fieldClass}`}
                  >
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="litre">litre</option>
                  </select>
                </label>
              </div>

              <label className="text-[11px] text-moss">
                Pickup village
                <select
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className={`mt-1 ${fieldClass}`}
                >
                  {FARM_HUBS.map((hub) => (
                    <option key={hub.name} value={hub.name}>
                      {hub.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[11px] text-moss">
                Destination retailer
                <select
                  value={retailerId}
                  onChange={(event) => setRetailerId(event.target.value)}
                  className={`mt-1 ${fieldClass}`}
                >
                  {retailers.map((retailer) => (
                    <option
                      key={retailer.retailer_id}
                      value={retailer.retailer_id}
                    >
                      {retailer.name} · {retailer.location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[11px] text-moss">
                Storage warehouse
                <select
                  value={warehouseId}
                  onChange={(event) => setWarehouseId(event.target.value)}
                  className={`mt-1 ${fieldClass}`}
                >
                  <option value="">Decide later</option>
                  {warehouses.map((warehouse) => (
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
                Vehicle
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                  className={`mt-1 ${fieldClass}`}
                >
                  <option value="">Assign later</option>
                  {vehicles
                    .filter((vehicle) => vehicle.status === "AVAILABLE")
                    .map((vehicle) => (
                      <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                        {vehicle.vehicle_number} · {vehicle.driver_name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="col-span-2 text-[11px] text-moss">
                Delivery deadline
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className={`mt-1 ${fieldClass}`}
                />
              </label>

              {error && (
                <p className="col-span-2 rounded-lg border border-rot/40 bg-rot/10 px-3 py-2 text-[11px] text-rot">
                  {error}
                </p>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-husk/8 px-5 py-4">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? "Creating" : "Create shipment"}
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

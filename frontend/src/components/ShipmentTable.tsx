import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { listItem, listStagger } from "../animations/variants";
import type { Shipment } from "../types";
import { formatEta, formatQuantity, titleCase } from "../utils/format";
import { ProgressTrack } from "./ProgressTrack";
import { StatusBadge } from "./StatusBadge";

export function ShipmentTable({ shipments }: { shipments: Shipment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
        <thead>
          <tr className="text-[11px] text-moss">
            <th className="px-5 py-3 font-medium">Shipment</th>
            <th className="px-5 py-3 font-medium">Route</th>
            <th className="px-5 py-3 font-medium">Load</th>
            <th className="px-5 py-3 font-medium">Stage</th>
            <th className="px-5 py-3 font-medium">Sensors</th>
            <th className="px-5 py-3 font-medium">Progress</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <motion.tbody
          variants={listStagger}
          initial="hidden"
          animate="visible"
          className="divide-y divide-husk/8"
        >
          {shipments.map((shipment) => (
            <motion.tr
              key={shipment.shipment_id}
              variants={listItem}
              className="transition-colors duration-200 hover:bg-husk/6"
            >
              <td className="px-5 py-4 align-top">
                <Link
                  to={`/shipments/${shipment.shipment_id}`}
                  className="font-mono text-xs text-crop hover:underline"
                >
                  {shipment.shipment_id}
                </Link>
                <p className="mt-1 text-[11px] text-moss">
                  {shipment.farmer_name ?? "AgroFarm"}
                </p>
              </td>
              <td className="px-5 py-4 align-top">
                <p className="text-xs text-husk">{shipment.source}</p>
                <p className="text-[11px] text-moss">to {shipment.destination}</p>
              </td>
              <td className="px-5 py-4 align-top">
                <p className="text-xs text-husk">{shipment.produce_type}</p>
                <p className="text-[11px] text-moss">
                  {formatQuantity(shipment.quantity, shipment.quantity_unit)}
                </p>
              </td>
              <td className="px-5 py-4 align-top">
                <p className="text-xs text-husk">{titleCase(shipment.stage)}</p>
                <p className="text-[11px] text-moss">
                  {titleCase(shipment.collection_status)}
                </p>
              </td>
              <td className="px-5 py-4 align-top">
                <p className="text-xs tabular-nums text-husk">
                  {shipment.temperature?.toFixed(1) ?? "—"}°C
                </p>
                <p className="text-[11px] tabular-nums text-moss">
                  {shipment.humidity?.toFixed(0) ?? "—"}% RH
                </p>
              </td>
              <td className="w-44 px-5 py-4 align-top">
                <ProgressTrack
                  value={shipment.progress_percentage}
                  label={`${shipment.progress_percentage.toFixed(0)}% · ETA ${formatEta(
                    shipment.eta_minutes,
                  )}`}
                />
              </td>
              <td className="px-5 py-4 align-top">
                <StatusBadge
                  status={shipment.status}
                  pulse={shipment.status === "IN_TRANSIT"}
                />
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  );
}

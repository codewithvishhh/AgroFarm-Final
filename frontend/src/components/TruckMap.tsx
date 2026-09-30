import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { Shipment } from "../types";
import { formatEta, formatQuantity } from "../utils/format";
import {
  NearbyMarketsLayer,
  NearbyMarketsToggle,
  useNearbyMarkets,
  type MarketAnchor,
} from "./NearbyMarketsLayer";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#8CA79A",
  ASSIGNED: "#5AA9CE",
  IN_TRANSIT: "#4FBF7A",
  DELAYED: "#E2A03F",
  DELIVERED: "#2F8F5B",
  CANCELLED: "#E2564D",
};

/**
 * Truck marker drawn as inline SVG and rotated to the travel bearing, so the
 * cab faces the direction of movement.
 */
function truckIcon(color: string, bearing: number) {
  return L.divIcon({
    className: "truck-marker",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `
      <span style="position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px">
        <span style="position:absolute;inset:4px;border-radius:999px;background:${color};opacity:.18"></span>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
             stroke="${color}" stroke-width="1.8" stroke-linecap="round"
             stroke-linejoin="round"
             style="transform:rotate(${bearing}deg);transform-origin:50% 50%;
                    filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">
          <path d="M12 2 L12 6" />
          <rect x="6" y="6" width="12" height="11" rx="2" fill="#0D1512" />
          <path d="M6 12 h12" />
          <circle cx="9" cy="19" r="1.6" fill="${color}" />
          <circle cx="15" cy="19" r="1.6" fill="${color}" />
        </svg>
      </span>`,
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 9);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, JSON.stringify(points)]);
  return null;
}

interface TruckMapProps {
  shipments: Shipment[];
  height?: string;
  showRoutes?: boolean;
  onSelect?: (shipment: Shipment) => void;
}

export function TruckMap({
  shipments,
  height = "26rem",
  showRoutes = true,
  onSelect,
}: TruckMapProps) {
  const bounds = useMemo<[number, number][]>(() => {
    const points: [number, number][] = [];
    shipments.forEach((shipment) => {
      points.push([shipment.source_latitude, shipment.source_longitude]);
      points.push([
        shipment.destination_latitude,
        shipment.destination_longitude,
      ]);
    });
    return points;
  }, [shipments]);

  // Nearby Big Markets: optional extra layer, off by default. Markets are
  // measured from each farm pickup point shown on this map.
  const [showMarkets, setShowMarkets] = useState(false);
  const marketAnchors = useMemo<MarketAnchor[]>(() => {
    const seen = new Map<string, MarketAnchor>();
    shipments.forEach((shipment) => {
      const key = `${shipment.source_latitude.toFixed(3)},${shipment.source_longitude.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.set(key, {
          label: shipment.source,
          point: [shipment.source_latitude, shipment.source_longitude],
        });
      }
    });
    if (seen.size === 0) {
      return [{ label: "map centre", point: [19.0, 74.5] }];
    }
    return [...seen.values()];
  }, [shipments]);
  const nearbyMarkets = useNearbyMarkets(showMarkets, marketAnchors);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-soil-600/70"
      style={{ height }}
    >
      <NearbyMarketsToggle
        enabled={showMarkets}
        count={nearbyMarkets.length}
        onToggle={() => setShowMarkets((value) => !value)}
      />
      <MapContainer
        center={[19.0, 74.5]}
        zoom={7}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={bounds} />

        {showMarkets && nearbyMarkets.length > 0 && (
          <NearbyMarketsLayer nearby={nearbyMarkets} anchors={marketAnchors} />
        )}

        {shipments.map((shipment) => {
          const color = STATUS_COLOR[shipment.status] ?? "#8CA79A";
          const source: [number, number] = [
            shipment.source_latitude,
            shipment.source_longitude,
          ];
          const destination: [number, number] = [
            shipment.destination_latitude,
            shipment.destination_longitude,
          ];
          const current: [number, number] = [
            shipment.current_latitude ?? shipment.source_latitude,
            shipment.current_longitude ?? shipment.source_longitude,
          ];

          return (
            <div key={shipment.shipment_id}>
              {showRoutes && (
                <>
                  <Polyline
                    positions={[source, destination]}
                    pathOptions={{
                      color: "#274236",
                      weight: 2,
                      dashArray: "6 8",
                    }}
                  />
                  <Polyline
                    positions={[source, current]}
                    pathOptions={{ color, weight: 3, opacity: 0.85 }}
                  />
                </>
              )}

              <CircleMarker
                center={source}
                radius={5}
                pathOptions={{
                  color: "#8CA79A",
                  fillColor: "#16241E",
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Popup>Pickup: {shipment.source}</Popup>
              </CircleMarker>

              <CircleMarker
                center={destination}
                radius={5}
                pathOptions={{
                  color: "#E2A03F",
                  fillColor: "#16241E",
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Popup>Drop: {shipment.destination}</Popup>
              </CircleMarker>

              <Marker
                position={current}
                icon={truckIcon(color, shipment.bearing ?? 0)}
                eventHandlers={{ click: () => onSelect?.(shipment) }}
              >
                <Popup>
                  <div style={{ minWidth: 190, lineHeight: 1.5 }}>
                    <strong>
                      {shipment.vehicle?.vehicle_number ?? shipment.shipment_id}
                    </strong>
                    <br />
                    Driver: {shipment.vehicle?.driver_name ?? "Not assigned"}
                    <br />
                    Shipment: {shipment.shipment_id}
                    <br />
                    Produce: {shipment.produce_type} (
                    {formatQuantity(shipment.quantity, shipment.quantity_unit)})
                    <br />
                    To: {shipment.destination}
                    <br />
                    Speed: {shipment.speed_kmph.toFixed(0)} km/h · ETA{" "}
                    {formatEta(shipment.eta_minutes)}
                    <br />
                    Status: {shipment.status.replace("_", " ")} ·{" "}
                    {shipment.progress_percentage.toFixed(0)}%
                    {shipment.temperature !== null && (
                      <>
                        <br />
                        {shipment.temperature.toFixed(1)}°C ·{" "}
                        {shipment.humidity?.toFixed(0)}% RH
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}

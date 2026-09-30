import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { Circle, Marker, Popup, useMap } from "react-leaflet";

import {
  loadMarkets,
  MARKETS_ARE_SAMPLE_DATA,
  NEARBY_MARKET_RADIUS_KM,
  type AgriMarket,
} from "../data/nearbyMarkets";
import { distanceKm } from "../utils/geo";

/** A reference point (farm / pickup location) markets are measured from. */
export interface MarketAnchor {
  label: string;
  point: [number, number];
}

interface NearbyMarket {
  market: AgriMarket;
  distance: number;
  from: string;
}

const MARKET_COLOR = "#E8E2D4";

/**
 * Market marker: a rounded square "stall" pin, so it never reads as a truck,
 * a pickup dot, or a drop dot.
 */
const marketIcon = L.divIcon({
  className: "market-marker",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `
    <span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;background:rgba(13,21,18,.85);border:1.5px solid ${MARKET_COLOR};box-shadow:0 4px 12px rgba(0,0,0,.6)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${MARKET_COLOR}"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
        <path d="M5 13v7h14v-7" />
        <path d="M10 20v-4h4v4" />
      </svg>
    </span>`,
});

/** Markets within the radius of any anchor, measured to the closest anchor. */
export function findNearbyMarkets(
  markets: AgriMarket[],
  anchors: MarketAnchor[],
  radiusKm = NEARBY_MARKET_RADIUS_KM,
): NearbyMarket[] {
  if (anchors.length === 0) return [];
  const nearby: NearbyMarket[] = [];
  markets.forEach((market) => {
    let best: NearbyMarket | null = null;
    anchors.forEach((anchor) => {
      const distance = distanceKm(anchor.point, [
        market.latitude,
        market.longitude,
      ]);
      if (!best || distance < best.distance) {
        best = { market, distance, from: anchor.label };
      }
    });
    if (best && (best as NearbyMarket).distance <= radiusKm) {
      nearby.push(best);
    }
  });
  return nearby.sort((a, b) => a.distance - b.distance);
}

function FitMarkets({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    // Fit once when the layer is switched on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

/** Leaflet layer: rendered inside an existing MapContainer. */
export function NearbyMarketsLayer({
  nearby,
  anchors,
}: {
  nearby: NearbyMarket[];
  anchors: MarketAnchor[];
}) {
  const points = useMemo<[number, number][]>(
    () => [
      ...anchors.map((anchor) => anchor.point),
      ...nearby.map(({ market }) => [market.latitude, market.longitude] as [number, number]),
    ],
    [anchors, nearby],
  );

  return (
    <>
      <FitMarkets points={points} />
      {anchors.length === 1 && (
        <Circle
          center={anchors[0].point}
          radius={NEARBY_MARKET_RADIUS_KM * 1000}
          pathOptions={{
            color: MARKET_COLOR,
            weight: 1,
            opacity: 0.35,
            dashArray: "4 8",
            fillOpacity: 0.03,
          }}
          interactive={false}
        />
      )}
      {nearby.map(({ market, distance, from }) => (
        <Marker
          key={market.id}
          position={[market.latitude, market.longitude]}
          icon={marketIcon}
        >
          {/* Extra top padding keeps the popup clear of the map toggle. */}
          <Popup autoPanPaddingTopLeft={[16, 96]}>
            <div style={{ minWidth: 200, lineHeight: 1.5 }}>
              <strong>{market.name}</strong>
              <br />
              Location: {market.location}
              <br />
              Distance:{" "}
              {distance < 1 ? "under 1 km" : `~${distance.toFixed(0)} km`} from{" "}
              {from}
              <br />
              Type: {market.type}
              <br />
              Main commodities: {market.commodities.join(", ")}
              {market.tradingDays && (
                <>
                  <br />
                  Trading days: {market.tradingDays}
                </>
              )}
              {MARKETS_ARE_SAMPLE_DATA && (
                <>
                  <br />
                  <span style={{ opacity: 0.6, fontSize: 11 }}>
                    Sample market data, not live
                  </span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

/** Loads markets once and filters them against the anchors. */
export function useNearbyMarkets(enabled: boolean, anchors: MarketAnchor[]) {
  const [markets, setMarkets] = useState<AgriMarket[] | null>(null);

  useEffect(() => {
    if (!enabled || markets) return;
    let alive = true;
    loadMarkets()
      .then((rows) => alive && setMarkets(rows))
      .catch(() => alive && setMarkets([]));
    return () => {
      alive = false;
    };
  }, [enabled, markets]);

  return useMemo(
    () => (markets ? findNearbyMarkets(markets, anchors) : []),
    [markets, anchors],
  );
}

/** Toggle button drawn over the top-right corner of a map. */
export function NearbyMarketsToggle({
  enabled,
  count,
  onToggle,
}: {
  enabled: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-[650] flex max-w-[70%] flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className={`pointer-events-auto rounded-xl border px-3 py-1.5 text-[11px] font-medium shadow-glass backdrop-blur-md transition-colors ${
          enabled
            ? "border-beige/60 bg-soil-800/85 text-beige"
            : "border-husk/12 bg-soil-800/60 text-husk hover:border-crop/60 hover:text-crop"
        }`}
      >
        📍 Nearby Big Markets
      </button>
      {enabled && (
        <span className="rounded-lg bg-soil-900/80 px-2 py-1 text-right text-[10px] text-moss backdrop-blur-md">
          {count > 0
            ? `${count} market${count === 1 ? "" : "s"} within ~${NEARBY_MARKET_RADIUS_KM} km`
            : `No big markets within ~${NEARBY_MARKET_RADIUS_KM} km`}
          {MARKETS_ARE_SAMPLE_DATA && " · sample data"}
        </span>
      )}
    </div>
  );
}

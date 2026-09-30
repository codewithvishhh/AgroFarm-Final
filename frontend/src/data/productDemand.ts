/**
 * SAMPLE / DEMO DATA — not live.
 *
 * Local (India) and foreign (export) demand for farm produce, used by the
 * Farmer Dashboard "Local & Foreign Demand" section. Figures are
 * indicative monthly tonnes for demonstration only. Replace the body of
 * `loadProductDemand()` with an API call to go live; the section only
 * depends on the `ProductDemand` shape.
 */

export interface ProductDemand {
  product: string;
  local: {
    demandTonnes: number;
    supplyTonnes: number;
    markets: string[]; // main local market cities
  };
  foreign: {
    demandTonnes: number;
    supplyTonnes: number; // export-grade supply available
    markets: string[]; // top importing countries
  };
}

export type DemandLevel = "High" | "Medium" | "Low";

/** True while `loadProductDemand()` returns the bundled sample list. */
export const DEMAND_IS_SAMPLE_DATA = true;

/**
 * Demand level from how much buyers want compared with what is available.
 * More demand than supply means a stronger market for the farmer.
 */
export function demandLevel(demandTonnes: number, supplyTonnes: number): DemandLevel {
  if (supplyTonnes <= 0) return demandTonnes > 0 ? "High" : "Low";
  const ratio = demandTonnes / supplyTonnes;
  if (ratio >= 1.15) return "High";
  if (ratio >= 0.9) return "Medium";
  return "Low";
}

const SAMPLE_DEMAND: ProductDemand[] = [
  {
    product: "Tomato",
    local: { demandTonnes: 1200, supplyTonnes: 950, markets: ["Pune", "Mumbai", "Narayangaon"] },
    foreign: { demandTonnes: 850, supplyTonnes: 700, markets: ["United Arab Emirates", "Saudi Arabia", "United Kingdom"] },
  },
  {
    product: "Onion",
    local: { demandTonnes: 2600, supplyTonnes: 2500, markets: ["Lasalgaon", "Nashik", "Pune"] },
    foreign: { demandTonnes: 1900, supplyTonnes: 1400, markets: ["Bangladesh", "Malaysia", "Sri Lanka"] },
  },
  {
    product: "Potato",
    local: { demandTonnes: 1500, supplyTonnes: 1800, markets: ["Manchar", "Pune", "Mumbai"] },
    foreign: { demandTonnes: 420, supplyTonnes: 400, markets: ["Nepal", "Sri Lanka", "Oman"] },
  },
  {
    product: "Wheat",
    local: { demandTonnes: 3200, supplyTonnes: 3000, markets: ["Baramati", "Satara", "Ahmednagar"] },
    foreign: { demandTonnes: 600, supplyTonnes: 900, markets: ["Bangladesh", "Indonesia", "United Arab Emirates"] },
  },
  {
    product: "Banana",
    local: { demandTonnes: 900, supplyTonnes: 1000, markets: ["Jalgaon", "Sangli", "Mumbai"] },
    foreign: { demandTonnes: 780, supplyTonnes: 520, markets: ["Iran", "Oman", "Kuwait"] },
  },
  {
    product: "Rice",
    local: { demandTonnes: 2100, supplyTonnes: 1700, markets: ["Kolhapur", "Pune", "Solapur"] },
    foreign: { demandTonnes: 1500, supplyTonnes: 1250, markets: ["Saudi Arabia", "Qatar", "United Kingdom"] },
  },
];

export async function loadProductDemand(): Promise<ProductDemand[]> {
  return SAMPLE_DEMAND;
}

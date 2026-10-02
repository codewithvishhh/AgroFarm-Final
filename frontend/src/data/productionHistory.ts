/**
 * SAMPLE / DEMO DATA — not official statistics.
 *
 * Yearly crop production for the farm region served by AgroFarm, used by
 * the Farmer Dashboard "Production Analysis" section. The figures are
 * illustrative tonnes, shaped to show rising, falling and flat trends.
 * Replace the body of `loadProductionHistory()` with an API call or a real
 * dataset (for example district-wise crop production from data.gov.in) to
 * go live; the section only depends on the `ProductionHistory` shape.
 */

export interface ProductionHistory {
  product: string;
  /** Region the figures describe. */
  region: string;
  unit: "tonnes";
  /** One row per year, oldest first. */
  years: { year: number; production: number }[];
}

/** True while `loadProductionHistory()` returns the bundled sample list. */
export const PRODUCTION_IS_SAMPLE_DATA = true;

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

function series(product: string, values: number[]): ProductionHistory {
  return {
    product,
    region: "Pune region",
    unit: "tonnes",
    years: YEARS.map((year, index) => ({ year, production: values[index] })),
  };
}

const SAMPLE_PRODUCTION: ProductionHistory[] = [
  series("Tomato", [41200, 43800, 46500, 44100, 39800, 37200, 40500, 38900, 36100, 37800, 35400]),
  series("Onion", [98000, 104500, 92000, 101200, 88400, 95600, 99800, 86300, 90200, 84700, 82100]),
  series("Potato", [22500, 23100, 24800, 25600, 24200, 26900, 27800, 28500, 27100, 29400, 30200]),
  series("Wheat", [61000, 58400, 63200, 55700, 52300, 57800, 54900, 51200, 53600, 50400, 49800]),
  series("Banana", [33800, 35200, 36900, 38100, 37400, 40200, 41800, 43500, 42100, 44900, 46300]),
  series("Rice", [47200, 46800, 48100, 45900, 47400, 46600, 48300, 47000, 46200, 47700, 46900]),
];

export async function loadProductionHistory(): Promise<ProductionHistory[]> {
  return SAMPLE_PRODUCTION;
}

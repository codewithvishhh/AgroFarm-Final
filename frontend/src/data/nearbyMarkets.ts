/**
 * SAMPLE / DEMO DATA — not live.
 *
 * Major agricultural markets (APMC market yards) used by the
 * "Nearby Big Markets" map layer. Coordinates are approximate and the
 * commodity lists are indicative only.
 *
 * To switch to a real source later, replace the body of `loadMarkets()`
 * with an API call that resolves to `AgriMarket[]`. Nothing else in the
 * map layer needs to change.
 */

export interface AgriMarket {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  type: string;
  commodities: string[];
  tradingDays?: string;
}

/** Radius used to decide whether a market counts as "nearby". */
export const NEARBY_MARKET_RADIUS_KM = 100;

/** True while `loadMarkets()` returns the bundled sample list. */
export const MARKETS_ARE_SAMPLE_DATA = true;

const SAMPLE_MARKETS: AgriMarket[] = [
  {
    id: "MKT-PUNE-GULTEKDI",
    name: "Pune Market Yard (Gultekdi)",
    location: "Pune",
    latitude: 18.488,
    longitude: 73.868,
    type: "APMC wholesale market",
    commodities: ["Onion", "Potato", "Tomato", "Leafy vegetables", "Fruits"],
    tradingDays: "Daily",
  },
  {
    id: "MKT-MANCHAR",
    name: "Manchar APMC",
    location: "Manchar, Pune",
    latitude: 19.004,
    longitude: 73.943,
    type: "APMC market",
    commodities: ["Potato", "Onion", "Tomato"],
    tradingDays: "Daily",
  },
  {
    id: "MKT-NARAYANGAON",
    name: "Narayangaon Tomato Market",
    location: "Narayangaon, Pune",
    latitude: 19.118,
    longitude: 73.97,
    type: "APMC sub-market",
    commodities: ["Tomato", "Vegetables"],
    tradingDays: "Daily (seasonal peak Aug–Dec)",
  },
  {
    id: "MKT-BARAMATI",
    name: "Baramati APMC",
    location: "Baramati, Pune",
    latitude: 18.151,
    longitude: 74.577,
    type: "APMC market",
    commodities: ["Wheat", "Jowar", "Onion", "Pomegranate"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-LASALGAON",
    name: "Lasalgaon APMC",
    location: "Lasalgaon, Nashik",
    latitude: 20.151,
    longitude: 74.234,
    type: "APMC market (major onion hub)",
    commodities: ["Onion", "Grapes", "Soybean"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-PIMPALGAON",
    name: "Pimpalgaon Baswant APMC",
    location: "Pimpalgaon, Nashik",
    latitude: 20.17,
    longitude: 73.988,
    type: "APMC market",
    commodities: ["Onion", "Tomato", "Grapes"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-NASHIK",
    name: "Nashik APMC",
    location: "Nashik",
    latitude: 20.006,
    longitude: 73.791,
    type: "APMC wholesale market",
    commodities: ["Vegetables", "Grapes", "Onion", "Tomato"],
    tradingDays: "Daily",
  },
  {
    id: "MKT-VASHI",
    name: "Vashi APMC",
    location: "Navi Mumbai",
    latitude: 19.077,
    longitude: 73.001,
    type: "APMC terminal market",
    commodities: ["Vegetables", "Fruits", "Onion", "Potato", "Grains"],
    tradingDays: "Daily",
  },
  {
    id: "MKT-AHMEDNAGAR",
    name: "Ahmednagar APMC",
    location: "Ahmednagar",
    latitude: 19.09,
    longitude: 74.74,
    type: "APMC market",
    commodities: ["Onion", "Jowar", "Bajra", "Pulses"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-RAHURI",
    name: "Rahuri APMC",
    location: "Rahuri, Ahmednagar",
    latitude: 19.393,
    longitude: 74.649,
    type: "APMC market",
    commodities: ["Onion", "Sugarcane", "Wheat"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-SATARA",
    name: "Satara APMC",
    location: "Satara",
    latitude: 17.68,
    longitude: 74.01,
    type: "APMC market",
    commodities: ["Wheat", "Jowar", "Potato", "Ginger"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-LONAND",
    name: "Lonand APMC",
    location: "Lonand, Satara",
    latitude: 18.042,
    longitude: 74.186,
    type: "APMC market",
    commodities: ["Onion", "Vegetables"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-KARAD",
    name: "Karad APMC",
    location: "Karad, Satara",
    latitude: 17.289,
    longitude: 74.18,
    type: "APMC market",
    commodities: ["Jaggery", "Turmeric", "Wheat", "Vegetables"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-SANGLI",
    name: "Sangli APMC",
    location: "Sangli",
    latitude: 16.86,
    longitude: 74.57,
    type: "APMC market (turmeric & raisin hub)",
    commodities: ["Turmeric", "Raisins", "Jaggery", "Banana"],
    tradingDays: "Mon–Sat",
  },
  {
    id: "MKT-KOLHAPUR",
    name: "Shahu Market Yard",
    location: "Kolhapur",
    latitude: 16.705,
    longitude: 74.24,
    type: "APMC wholesale market",
    commodities: ["Jaggery", "Rice", "Vegetables", "Fruits"],
    tradingDays: "Daily",
  },
  {
    id: "MKT-SOLAPUR",
    name: "Solapur APMC",
    location: "Solapur",
    latitude: 17.66,
    longitude: 75.9,
    type: "APMC market",
    commodities: ["Onion", "Jowar", "Pomegranate"],
    tradingDays: "Mon–Sat",
  },
];

/**
 * Returns the market list. Currently resolves the bundled sample data;
 * swap for a real API call when one is available.
 */
export async function loadMarkets(): Promise<AgriMarket[]> {
  return SAMPLE_MARKETS;
}

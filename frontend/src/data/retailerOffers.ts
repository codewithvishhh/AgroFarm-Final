/**
 * SAMPLE / DEMO DATA — not live.
 *
 * Buying prices offered by retailers to farmers, used by the Farmer
 * Dashboard "Retailer Price Comparison" section. Replace the body of
 * `loadRetailerOffers()` with an API call when real offers are available;
 * the comparison logic only depends on the `RetailerOffer` shape.
 */

export interface RetailerOffer {
  id: string;
  retailerName: string;
  product: string;
  pricePerKg: number;
  quantity: number; // kg the retailer is buying in this offer
  location: string;
  date: string; // ISO date the offer was recorded
}

/** True while `loadRetailerOffers()` returns the bundled sample list. */
export const OFFERS_ARE_SAMPLE_DATA = true;

const SAMPLE_OFFERS: RetailerOffer[] = [
  // Tomato
  { id: "OF-001", retailerName: "FreshMart Retail", product: "Tomato", pricePerKg: 10, quantity: 100, location: "Pune", date: "2026-09-24" },
  { id: "OF-002", retailerName: "GreenBasket", product: "Tomato", pricePerKg: 25, quantity: 100, location: "Mumbai", date: "2026-09-25" },
  { id: "OF-003", retailerName: "AgroBuy", product: "Tomato", pricePerKg: 18, quantity: 150, location: "Nashik", date: "2026-09-25" },
  { id: "OF-004", retailerName: "NatureFresh Market", product: "Tomato", pricePerKg: 21, quantity: 120, location: "Pune", date: "2026-09-26" },
  { id: "OF-005", retailerName: "FarmLink Retail", product: "Tomato", pricePerKg: 15, quantity: 200, location: "Satara", date: "2026-09-26" },
  // Onion
  { id: "OF-006", retailerName: "FreshMart Retail", product: "Onion", pricePerKg: 22, quantity: 300, location: "Pune", date: "2026-09-23" },
  { id: "OF-007", retailerName: "GreenBasket", product: "Onion", pricePerKg: 19, quantity: 250, location: "Mumbai", date: "2026-09-24" },
  { id: "OF-008", retailerName: "AgroBuy", product: "Onion", pricePerKg: 27, quantity: 400, location: "Nashik", date: "2026-09-25" },
  { id: "OF-009", retailerName: "NatureFresh Market", product: "Onion", pricePerKg: 24, quantity: 200, location: "Pune", date: "2026-09-26" },
  { id: "OF-010", retailerName: "FarmLink Retail", product: "Onion", pricePerKg: 20, quantity: 350, location: "Ahmednagar", date: "2026-09-27" },
  // Potato
  { id: "OF-011", retailerName: "FreshMart Retail", product: "Potato", pricePerKg: 18, quantity: 250, location: "Pune", date: "2026-09-24" },
  { id: "OF-012", retailerName: "GreenBasket", product: "Potato", pricePerKg: 16, quantity: 200, location: "Mumbai", date: "2026-09-25" },
  { id: "OF-013", retailerName: "AgroBuy", product: "Potato", pricePerKg: 14, quantity: 300, location: "Nashik", date: "2026-09-26" },
  { id: "OF-014", retailerName: "FarmLink Retail", product: "Potato", pricePerKg: 20, quantity: 180, location: "Satara", date: "2026-09-27" },
  // Wheat
  { id: "OF-015", retailerName: "NatureFresh Market", product: "Wheat", pricePerKg: 28, quantity: 500, location: "Pune", date: "2026-09-22" },
  { id: "OF-016", retailerName: "AgroBuy", product: "Wheat", pricePerKg: 31, quantity: 600, location: "Nashik", date: "2026-09-24" },
  { id: "OF-017", retailerName: "FarmLink Retail", product: "Wheat", pricePerKg: 26, quantity: 450, location: "Satara", date: "2026-09-26" },
  { id: "OF-018", retailerName: "GreenBasket", product: "Wheat", pricePerKg: 29, quantity: 400, location: "Mumbai", date: "2026-09-27" },
];

export async function loadRetailerOffers(): Promise<RetailerOffer[]> {
  return SAMPLE_OFFERS;
}

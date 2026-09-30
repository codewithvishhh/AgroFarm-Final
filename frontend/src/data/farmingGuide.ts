/**
 * General crop-care reference used by the "Farming Improvement" page.
 *
 * Nutrient rates are broad, commonly used per-acre guidelines for
 * Maharashtra-type conditions. They are a starting point only; a soil
 * test (Soil Health Card) and the local Krishi Vigyan Kendra (KVK) or
 * agriculture officer give the exact dose for a field.
 */

export const SQFT_PER_ACRE = 43_560;
export const SQFT_PER_GUNTHA = 1_089;
export const SQM_PER_SQFT = 0.092903;

/** Nutrient content of common straight fertilizers. */
export const FERTILIZERS = {
  urea: { name: "Urea", nutrient: "N", share: 0.46 },
  ssp: { name: "Single Super Phosphate (SSP)", nutrient: "P₂O₅", share: 0.16 },
  mop: { name: "Muriate of Potash (MOP)", nutrient: "K₂O", share: 0.6 },
} as const;

export interface CropGuide {
  crop: string;
  season: string;
  /** Well-rotted farmyard manure / compost, tonnes per acre. */
  manureTonnesPerAcre: number;
  /** Nutrients, kg per acre: nitrogen, phosphorus (P₂O₅), potassium (K₂O). */
  npkPerAcre: { n: number; p: number; k: number };
  /** How nitrogen is split across the season. */
  nitrogenSplit: string[];
  water: {
    depthMm: number; // depth of water per irrigation
    intervalDays: number;
    note: string;
  };
  /** Row × plant spacing in metres, when counted as plants. */
  spacingM?: [number, number];
  /** Seed rate in kg per acre, when sown by seed rate. */
  seedKgPerAcre?: number;
  care: string[];
}

export const CROP_GUIDES: CropGuide[] = [
  {
    crop: "Tomato",
    season: "Kharif, rabi, or summer with irrigation",
    manureTonnesPerAcre: 8,
    npkPerAcre: { n: 100, p: 60, k: 60 },
    nitrogenSplit: [
      "One third at transplanting, with all the phosphorus and potash",
      "One third about 30 days after transplanting",
      "One third about 60 days after transplanting",
    ],
    water: {
      depthMm: 20,
      intervalDays: 5,
      note: "Keep soil evenly moist. Uneven watering causes fruit cracking and blossom end rot. Drip irrigation saves water.",
    },
    spacingM: [0.6, 0.45],
    care: [
      "Stake or trellis plants 3–4 weeks after transplanting to keep fruit off the soil.",
      "Remove lower yellow leaves and side shoots near the base for airflow.",
      "Mulch with straw or plastic to hold moisture and reduce weeds.",
      "Check twice a week for fruit borer holes and whitefly under leaves.",
    ],
  },
  {
    crop: "Onion",
    season: "Rabi (best storage), kharif, late kharif",
    manureTonnesPerAcre: 8,
    npkPerAcre: { n: 40, p: 20, k: 24 },
    nitrogenSplit: [
      "Half at transplanting, with all the phosphorus and potash",
      "Half 30–45 days after transplanting",
    ],
    water: {
      depthMm: 25,
      intervalDays: 8,
      note: "Light, frequent irrigation. Stop watering 2–3 weeks before harvest so bulbs cure and store well.",
    },
    spacingM: [0.15, 0.1],
    care: [
      "Weed early. Onion competes poorly with weeds in the first 45 days.",
      "Add sulphur (about 10 kg per acre) for better pungency and storage.",
      "Watch for thrips (silvery streaks on leaves) in dry weather.",
      "Harvest when about half the tops have fallen over.",
    ],
  },
  {
    crop: "Potato",
    season: "Rabi (October–November planting)",
    manureTonnesPerAcre: 8,
    npkPerAcre: { n: 60, p: 40, k: 40 },
    nitrogenSplit: [
      "Half at planting, with all the phosphorus and potash",
      "Half at earthing up, about 25–30 days after planting",
    ],
    water: {
      depthMm: 25,
      intervalDays: 8,
      note: "Light irrigation soon after planting, then regular. Avoid waterlogging. Stop 10 days before harvest.",
    },
    spacingM: [0.6, 0.2],
    care: [
      "Earth up soil around plants at 25–30 days so tubers stay covered and do not turn green.",
      "Use healthy, sprouted seed tubers of 30–40 g.",
      "Watch for late blight (dark, wet patches on leaves) in cool, cloudy weather.",
      "Cut the haulms (tops) 10 days before digging for firmer skins.",
    ],
  },
  {
    crop: "Wheat",
    season: "Rabi (November sowing)",
    manureTonnesPerAcre: 4,
    npkPerAcre: { n: 48, p: 24, k: 16 },
    nitrogenSplit: [
      "Half at sowing, with all the phosphorus and potash",
      "Half at the first irrigation, about 21 days after sowing",
    ],
    water: {
      depthMm: 60,
      intervalDays: 20,
      note: "About 5–6 irrigations. The most important is at crown root stage (about 21 days), then tillering, flowering, and grain filling.",
    },
    seedKgPerAcre: 40,
    care: [
      "Sow in rows about 22 cm apart for easier weeding.",
      "Remove weeds by 30–35 days after sowing.",
      "Do not skip the crown root irrigation; it decides tiller count.",
      "Harvest when grains are hard and straw turns golden.",
    ],
  },
  {
    crop: "Banana",
    season: "Year-round planting with irrigation",
    manureTonnesPerAcre: 10,
    npkPerAcre: { n: 240, p: 72, k: 240 },
    nitrogenSplit: [
      "Split nitrogen and potash into 4–6 doses from the 2nd to the 7th month",
      "Give all the phosphorus at planting",
    ],
    water: {
      depthMm: 25,
      intervalDays: 4,
      note: "Banana needs steady moisture. Drip irrigation daily in summer works best. Never let water stand around the stem.",
    },
    spacingM: [1.8, 1.8],
    care: [
      "Remove side suckers regularly and keep one follower sucker.",
      "Prop plants with bamboo when bunches form to stop them falling.",
      "Remove the male bud after the last hand opens.",
      "Cover bunches with a bag for cleaner fruit.",
    ],
  },
  {
    crop: "Rice",
    season: "Kharif (June–July transplanting)",
    manureTonnesPerAcre: 4,
    npkPerAcre: { n: 40, p: 20, k: 20 },
    nitrogenSplit: [
      "Half at transplanting, with all the phosphorus and potash",
      "One quarter at tillering",
      "One quarter at panicle initiation",
    ],
    water: {
      depthMm: 50,
      intervalDays: 5,
      note: "Keep about 5 cm of water standing after transplanting. Drain the field 10–15 days before harvest.",
    },
    spacingM: [0.2, 0.15],
    care: [
      "Transplant 2–3 seedlings per hill at 21–25 days old.",
      "Keep bunds strong to hold water.",
      "Watch for stem borer (dead hearts) and leaf folder.",
      "Add zinc sulphate if leaves show rusty brown spots.",
    ],
  },
  {
    crop: "Sugarcane",
    season: "Adsali (July), pre-seasonal (October), suru (January)",
    manureTonnesPerAcre: 10,
    npkPerAcre: { n: 100, p: 46, k: 46 },
    nitrogenSplit: [
      "10% at planting, with half the phosphorus and potash",
      "40% at 6–8 weeks",
      "10% at 12 weeks",
      "40% at earthing up, with the rest of the phosphorus and potash",
    ],
    water: {
      depthMm: 75,
      intervalDays: 10,
      note: "Water more often in summer (7–8 days) and less in winter (12–15 days). Drip irrigation can save a lot of water.",
    },
    care: [
      "Use healthy 2–3 bud setts, treated before planting.",
      "Earth up at about 4 months to prevent lodging.",
      "Remove dry leaves (trash) and use them as mulch.",
      "Watch for early shoot borer in the first 3 months.",
    ],
  },
];

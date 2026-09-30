/**
 * Common crop problems, their likely causes, and practical remedies, used
 * by the "Crop Problem Solver" page. General guidance only: always follow
 * the dose on the product label and confirm with the local Krishi Vigyan
 * Kendra (KVK) or agriculture officer before spraying.
 */

export interface LikelyIssue {
  name: string;
  check: string; // how the farmer can confirm it
  remedy: string[];
}

export interface CropProblem {
  id: string;
  title: string;
  icon: string;
  /** Crops where this problem is most common; empty means any crop. */
  crops: string[];
  issues: LikelyIssue[];
  prevention: string[];
  /** When the farmer should get expert help quickly. */
  urgent?: string;
}

export const CROP_PROBLEMS: CropProblem[] = [
  {
    id: "yellow-tomatoes",
    title: "Yellow tomatoes (fruit not turning red)",
    icon: "🍅",
    crops: ["Tomato"],
    issues: [
      {
        name: "Yellow shoulder / uneven ripening from heat",
        check: "The top of the fruit near the stem stays yellow or green while the rest turns red, mostly in hot, sunny weeks.",
        remedy: [
          "Keep more leaf cover over fruit; do not remove too many leaves.",
          "Use shade net (about 35–50%) in peak summer.",
          "Pick fruit at the colour-break stage and ripen it in the shade.",
        ],
      },
      {
        name: "Potassium shortage",
        check: "Blotchy ripening plus leaf edges turning yellow and then brown on older leaves.",
        remedy: [
          "Apply Muriate of Potash (MOP) or Sulphate of Potash as per a soil test.",
          "Spray potassium nitrate (13-0-45) at about 5 g per litre of water.",
        ],
      },
    ],
    prevention: [
      "Give balanced fertilizer with enough potash from flowering onwards.",
      "Water evenly; avoid long dry spells then heavy watering.",
    ],
  },
  {
    id: "brown-leaves",
    title: "Brown leaves or brown spots",
    icon: "🍂",
    crops: [],
    issues: [
      {
        name: "Early blight (fungus)",
        check: "Brown spots with rings like a target, starting on lower, older leaves.",
        remedy: [
          "Remove and destroy badly affected leaves; do not leave them in the field.",
          "Spray mancozeb at about 2.5 g per litre, or copper oxychloride at about 3 g per litre, following the label.",
          "Repeat after 10–12 days if new spots appear.",
        ],
      },
      {
        name: "Leaf scorch from heat or water stress",
        check: "Leaf edges and tips dry and turn brown, without rings or spots, on the sunny side.",
        remedy: [
          "Water in the early morning or evening.",
          "Mulch the soil to keep roots cool and moist.",
        ],
      },
      {
        name: "Fertilizer burn",
        check: "Browning soon after heavy fertilizer, especially if it touched leaves or was placed close to the stem.",
        remedy: [
          "Irrigate well to wash extra salts away from the roots.",
          "Next time, keep fertilizer 5–8 cm from the stem and split the dose.",
        ],
      },
    ],
    prevention: [
      "Rotate crops; do not plant tomato, potato, or chilli in the same spot every season.",
      "Avoid overhead watering late in the day.",
    ],
  },
  {
    id: "wilting",
    title: "Plants wilting or drooping",
    icon: "🥀",
    crops: [],
    issues: [
      {
        name: "Too little water",
        check: "Soil is dry 5–8 cm down, and plants recover in the evening or after watering.",
        remedy: [
          "Irrigate right away, then keep a regular schedule.",
          "Mulch to reduce water loss.",
        ],
      },
      {
        name: "Bacterial wilt",
        check: "The whole plant wilts suddenly while still green. Cut the stem and put it in clear water: milky threads flowing out mean bacterial wilt.",
        remedy: [
          "Pull out and destroy affected plants with the soil around the roots.",
          "Do not move water from affected patches to healthy ones.",
          "Apply bleaching powder to the pit (about 15 kg per acre) and rotate with a non-host crop such as maize or marigold.",
        ],
      },
      {
        name: "Fusarium wilt (fungus)",
        check: "Lower leaves yellow on one side first, then wilt. The inside of a cut stem is brown.",
        remedy: [
          "Remove affected plants.",
          "Apply Trichoderma mixed with compost to the root zone.",
          "Use resistant varieties next season.",
        ],
      },
    ],
    prevention: [
      "Improve drainage; wilts spread fast in waterlogged soil.",
      "Treat seed or seedlings with Trichoderma before planting.",
    ],
    urgent: "If many plants wilt within a few days, contact the KVK quickly; wilt can spread across the field.",
  },
  {
    id: "yellow-leaves",
    title: "Yellow leaves",
    icon: "🟡",
    crops: [],
    issues: [
      {
        name: "Nitrogen shortage",
        check: "Older, lower leaves turn evenly pale yellow first; the whole plant looks light green and slow.",
        remedy: [
          "Top dress with urea as per the crop schedule, then water.",
          "Spray 1–2% urea solution (10–20 g per litre) for quick greening.",
        ],
      },
      {
        name: "Overwatering or poor drainage",
        check: "Soil stays wet and smells sour; roots look brown and soft.",
        remedy: [
          "Stop watering until the topsoil dries.",
          "Open drainage channels between beds.",
        ],
      },
      {
        name: "Iron or zinc shortage",
        check: "New, top leaves turn yellow while the veins stay green.",
        remedy: [
          "Spray ferrous sulphate (about 5 g per litre) or zinc sulphate (about 5 g per litre) with a pinch of lime or citric acid.",
          "Add zinc sulphate to the soil at the next sowing if a soil test shows low zinc.",
        ],
      },
    ],
    prevention: [
      "Test soil every 2–3 years (Soil Health Card) and fertilize to the report.",
      "Add compost or farmyard manure every season.",
    ],
  },
  {
    id: "pest-attack",
    title: "Pest attack (insects on plants)",
    icon: "🐛",
    crops: [],
    issues: [
      {
        name: "Sucking pests: aphids, whitefly, thrips, jassids",
        check: "Tiny insects under leaves, sticky leaves, curling, or silvery streaks.",
        remedy: [
          "Put up yellow sticky traps (about 10 per acre) for whitefly and aphids, and blue traps for thrips.",
          "Spray neem oil (about 5 ml per litre with a little soap) in the evening.",
          "If numbers keep rising, use a recommended insecticide such as imidacloprid at the label dose.",
        ],
      },
      {
        name: "Fruit or pod borer caterpillars",
        check: "Round holes in fruit or pods, with droppings nearby.",
        remedy: [
          "Pick and destroy damaged fruit.",
          "Set pheromone traps (about 5 per acre) to catch moths.",
          "Spray neem seed kernel extract (5%) early; for heavy attack use a recommended insecticide such as emamectin benzoate at the label dose.",
        ],
      },
    ],
    prevention: [
      "Walk the field twice a week and check under leaves.",
      "Grow marigold as a border trap crop.",
      "Remove weeds that shelter pests.",
    ],
    urgent: "Wear gloves and a mask when spraying, never spray against the wind, and respect the waiting period before harvest.",
  },
  {
    id: "water-problems",
    title: "Water-related problems",
    icon: "💧",
    crops: [],
    issues: [
      {
        name: "Waterlogging (too much water)",
        check: "Water stands for more than a day; leaves yellow and plants look weak.",
        remedy: [
          "Dig drainage channels to let water out.",
          "Grow on raised beds or ridges in the rainy season.",
        ],
      },
      {
        name: "Water stress (too little water)",
        check: "Leaves curl or droop in the afternoon; soil cracks.",
        remedy: [
          "Water early in the morning.",
          "Switch to drip irrigation and mulch to save water.",
        ],
      },
      {
        name: "Salty or hard irrigation water",
        check: "White crust on the soil surface and leaf tips burning.",
        remedy: [
          "Get the water tested at the nearest soil and water testing lab.",
          "Irrigate a little extra now and then to push salts below the roots.",
          "Apply gypsum if the test report advises it.",
        ],
      },
    ],
    prevention: [
      "Level the field so water spreads evenly.",
      "Irrigate by crop stage rather than by fixed habit.",
    ],
  },
  {
    id: "black-bottom",
    title: "Black patch at the bottom of fruit",
    icon: "⚫",
    crops: ["Tomato"],
    issues: [
      {
        name: "Blossom end rot (calcium not reaching fruit)",
        check: "A dark, leathery patch at the flower end of the fruit, usually on the first fruits.",
        remedy: [
          "Water evenly; do not let the soil dry out and then flood.",
          "Spray calcium nitrate at about 5 g per litre, 2–3 times a week apart.",
          "Remove affected fruit.",
        ],
      },
    ],
    prevention: [
      "Mulch to keep soil moisture steady.",
      "Avoid too much nitrogen during fruiting.",
    ],
  },
  {
    id: "leaf-curl",
    title: "Leaves curling and crinkled",
    icon: "🌀",
    crops: ["Tomato"],
    issues: [
      {
        name: "Leaf curl virus (spread by whitefly)",
        check: "Leaves curl upward, become small and thick; the plant stays stunted with few flowers.",
        remedy: [
          "Pull out and destroy infected plants early; there is no cure for the virus.",
          "Control whitefly with yellow sticky traps and neem oil.",
        ],
      },
    ],
    prevention: [
      "Raise seedlings under insect-proof net.",
      "Use virus-tolerant varieties.",
    ],
  },
  {
    id: "white-powder",
    title: "White powder on leaves",
    icon: "⚪",
    crops: [],
    issues: [
      {
        name: "Powdery mildew (fungus)",
        check: "White, flour-like patches on the upper side of leaves that rub off.",
        remedy: [
          "Spray wettable sulphur at about 2–3 g per litre, following the label, not in hot midday sun.",
          "Remove badly affected leaves.",
        ],
      },
    ],
    prevention: [
      "Give plants enough spacing for air movement.",
      "Avoid too much nitrogen.",
    ],
  },
  {
    id: "fruit-cracking",
    title: "Fruit cracking",
    icon: "💔",
    crops: ["Tomato"],
    issues: [
      {
        name: "Uneven watering",
        check: "Cracks around the stem or down the sides, usually after rain or heavy watering following a dry spell.",
        remedy: [
          "Keep a steady watering schedule; drip helps most.",
          "Pick fruit a little earlier, at the colour-break stage, during rainy spells.",
        ],
      },
      {
        name: "Boron shortage",
        check: "Cracking together with corky patches on fruit.",
        remedy: ["Spray borax at about 1–2 g per litre once at flowering."],
      },
    ],
    prevention: ["Mulch and use varieties less likely to crack."],
  },
];

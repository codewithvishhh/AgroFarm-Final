import { Droplets, FlaskConical, Leaf, Sprout } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import {
  CROP_GUIDES,
  FERTILIZERS,
  SQFT_PER_ACRE,
  SQFT_PER_GUNTHA,
  SQM_PER_SQFT,
  type CropGuide,
} from "../data/farmingGuide";
import { useI18n } from "../i18n/LanguageProvider";
import { LanguageSelector } from "../components/LanguageSelector";
import { ListenButton } from "../components/ListenButton";

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

/** Kilograms shown in kg, or grams for small kitchen-garden areas. */
function formatWeight(kg: number) {
  if (kg < 1) return `${Math.max(1, Math.round(kg * 1000))} g`;
  if (kg < 10) return `${kg.toFixed(1)} kg`;
  return `${Math.round(kg).toLocaleString("en-IN")} kg`;
}

function formatLitres(litres: number) {
  return `${Math.round(litres).toLocaleString("en-IN")} L`;
}

interface Plan {
  guide: CropGuide;
  areaSqft: number;
}

/** Everything on the page is worked out from area × per-acre rates. */
function buildPlan({ guide, areaSqft }: Plan) {
  const acres = areaSqft / SQFT_PER_ACRE;
  const areaSqm = areaSqft * SQM_PER_SQFT;
  const { n, p, k } = guide.npkPerAcre;

  const nutrients = { n: n * acres, p: p * acres, k: k * acres };
  const products = [
    { ...FERTILIZERS.urea, kg: nutrients.n / FERTILIZERS.urea.share, nutrientKg: nutrients.n },
    { ...FERTILIZERS.ssp, kg: nutrients.p / FERTILIZERS.ssp.share, nutrientKg: nutrients.p },
    { ...FERTILIZERS.mop, kg: nutrients.k / FERTILIZERS.mop.share, nutrientKg: nutrients.k },
  ];

  // 1 mm of water over 1 m² is 1 litre.
  const litresPerIrrigation = guide.water.depthMm * areaSqm;
  const litresPerWeek = (litresPerIrrigation * 7) / guide.water.intervalDays;

  const plants = guide.spacingM
    ? Math.floor(areaSqm / (guide.spacingM[0] * guide.spacingM[1]))
    : null;
  const seedKg = guide.seedKgPerAcre ? guide.seedKgPerAcre * acres : null;

  return {
    acres,
    guntha: areaSqft / SQFT_PER_GUNTHA,
    areaSqm,
    manureKg: guide.manureTonnesPerAcre * 1000 * acres,
    nutrients,
    products,
    litresPerIrrigation,
    litresPerWeek,
    plants,
    seedKg,
  };
}

/** Farming Improvement: fertilizer, water, and care advice for a field. */
export function FarmingImprovement() {
  const { t } = useI18n();
  const [areaInput, setAreaInput] = useState("");
  const [crop, setCrop] = useState(CROP_GUIDES[0].crop);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  const submit = () => {
    const areaSqft = Number(areaInput);
    if (!Number.isFinite(areaSqft) || areaSqft <= 0) {
      setError(t("Enter your field area in square feet, for example 10000."));
      setPlan(null);
      return;
    }
    const guide = CROP_GUIDES.find((item) => item.crop === crop);
    if (!guide) return;
    setError("");
    setPlan({ guide, areaSqft });
  };

  const result = plan ? buildPlan(plan) : null;

  /** Plain-language summary read aloud by the 🔊 Listen button. */
  const buildSpokenSummary = () => {
    const number = (value: number) =>
      value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    if (!plan || !result) {
      return [
        t("Farming improvement summary."),
        t("Enter your field area and crop above to see fertilizer, watering, and care advice."),
      ].join(" ");
    }
    const lines = [
      t("Farming improvement summary for {crop} on {acres} acres.", {
        crop: t(plan.guide.crop),
        acres: result.acres.toFixed(2),
      }),
      t("Add about {qty} kilograms of farmyard manure or compost.", {
        qty: number(result.manureKg),
      }),
      t("Fertilizer: {items}.", {
        items: result.products
          .map((item) => `${item.name} ${number(item.kg)} ${t("kilograms")}`)
          .join(", "),
      }),
      t("Give about {litres} litres of water every {days} days.", {
        litres: number(result.litresPerIrrigation),
        days: plan.guide.water.intervalDays,
      }),
    ];
    if (plan.guide.care.length > 0) {
      lines.push(
        t("Top care tips: {tips}", {
          tips: plan.guide.care
            .slice(0, 3)
            .map((tip) => t(tip))
            .join(" "),
        }),
      );
    }
    return lines.join(" ");
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LanguageSelector />
        <ListenButton getText={buildSpokenSummary} />
      </div>

      <Panel
        title={t("Tell us about your field")}
        description={t("Enter the field area and crop to get practical recommendations")}
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-moss">
            {t("Field area (sq. ft.)")}
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="10000"
              value={areaInput}
              onChange={(event) => setAreaInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submit()}
              className={`mt-1 block w-36 ${fieldClass}`}
            />
          </label>
          <label className="text-[11px] text-moss">
            {t("Crop being grown")}
            <select
              value={crop}
              onChange={(event) => setCrop(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            >
              {CROP_GUIDES.map((item) => (
                <option key={item.crop} value={item.crop}>
                  {t(item.crop)}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={submit}>{t("Get recommendations")}</Button>
        </div>
        {error && <p className="mt-3 text-xs text-rot">{error}</p>}
        <p className="mt-3 text-[11px] text-moss">
          {t("1 acre = 43,560 sq. ft. · 1 guntha = 1,089 sq. ft.")}
        </p>
      </Panel>

      {!plan || !result ? (
        <Panel>
          <EmptyState
            title={t("No recommendations yet")}
            hint={t("Enter your field area and crop above to see fertilizer, watering, and care advice.")}
          />
        </Panel>
      ) : (
        <>
          <div className="glass rounded-2xl px-5 py-4 text-xs text-husk">
            <strong className="text-crop">{t(plan.guide.crop)}</strong> ·{" "}
            {plan.areaSqft.toLocaleString("en-IN")} sq. ft. ≈{" "}
            {result.acres.toFixed(2)} acre · {result.guntha.toFixed(1)} guntha ·{" "}
            {Math.round(result.areaSqm).toLocaleString("en-IN")} m²
            <span className="text-moss"> · {plan.guide.season}</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title={t("Fertilizer")}
              description={t("Approximate amounts for your whole field for one crop season")}
            >
              <div className="flex items-start gap-3">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-crop" aria-hidden />
                <div className="min-w-0 flex-1 space-y-3 text-xs text-husk">
                  <p>
                    <strong>{t("Farmyard manure or compost")}:</strong>{" "}
                    {formatWeight(result.manureKg)}{" "}
                    <span className="text-moss">
                      ({t("mix into soil 2–3 weeks before planting")})
                    </span>
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[11px] text-moss">
                          <th className="py-2 pr-3 font-medium">{t("Fertilizer")}</th>
                          <th className="py-2 pr-3 font-medium">{t("Gives")}</th>
                          <th className="py-2 text-right font-medium">{t("Amount")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-husk/8">
                        {result.products.map((item) => (
                          <tr key={item.name}>
                            <td className="py-2 pr-3">{item.name}</td>
                            <td className="py-2 pr-3 text-moss">
                              {formatWeight(item.nutrientKg)} {item.nutrient}
                            </td>
                            <td className="py-2 text-right font-mono">
                              {formatWeight(item.kg)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <p className="text-[11px] text-moss">{t("When to apply")}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {plan.guide.nitrogenSplit.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[11px] text-moss">
                    {t("Based on about {n}:{p}:{k} kg N:P₂O₅:K₂O per acre.", {
                      n: plan.guide.npkPerAcre.n,
                      p: plan.guide.npkPerAcre.p,
                      k: plan.guide.npkPerAcre.k,
                    })}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel
              title={t("Watering")}
              description={t("How much water and how often")}
            >
              <div className="flex items-start gap-3">
                <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-chill" aria-hidden />
                <div className="min-w-0 flex-1 space-y-3 text-xs text-husk">
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[11px] text-moss">{t("Each watering")}</dt>
                      <dd className="mt-0.5 font-display text-lg font-semibold">
                        {formatLitres(result.litresPerIrrigation)}
                      </dd>
                      <dd className="text-[11px] text-moss">
                        ≈ {plan.guide.water.depthMm} mm
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-moss">{t("How often")}</dt>
                      <dd className="mt-0.5 font-display text-lg font-semibold">
                        {t("Every {days} days", { days: plan.guide.water.intervalDays })}
                      </dd>
                      <dd className="text-[11px] text-moss">
                        ≈ {formatLitres(result.litresPerWeek)} {t("per week")}
                      </dd>
                    </div>
                  </dl>
                  <p>{plan.guide.water.note}</p>
                  <p className="text-[11px] text-moss">
                    {t("Water less after rain and more in hot, windy weather.")}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title={t("Planting")} description={t("Plants or seed for your area")}>
              <div className="flex items-start gap-3">
                <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-crop" aria-hidden />
                <div className="space-y-2 text-xs text-husk">
                  {result.plants !== null && plan.guide.spacingM && (
                    <p>
                      <strong>
                        {t("About {count} plants", {
                          count: result.plants.toLocaleString("en-IN"),
                        })}
                      </strong>{" "}
                      <span className="text-moss">
                        ({t("spacing")} {Math.round(plan.guide.spacingM[0] * 100)} ×{" "}
                        {Math.round(plan.guide.spacingM[1] * 100)} cm)
                      </span>
                    </p>
                  )}
                  {result.seedKg !== null && (
                    <p>
                      <strong>
                        {t("Seed")}: {formatWeight(result.seedKg)}
                      </strong>{" "}
                      <span className="text-moss">
                        ({plan.guide.seedKgPerAcre} kg {t("per acre")})
                      </span>
                    </p>
                  )}
                  {result.plants === null && result.seedKg === null && (
                    <p className="text-moss">
                      {t("Follow the local planting pattern for this crop.")}
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            <Panel title={t("Crop care")} description={t("Simple steps for a healthier crop")}>
              <div className="flex items-start gap-3">
                <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-crop" aria-hidden />
                <ul className="list-disc space-y-1.5 pl-4 text-xs text-husk">
                  {plan.guide.care.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>

          <p className="text-[11px] leading-relaxed text-moss">
            {t(
              "These are general guidelines. For exact doses, test your soil (Soil Health Card) and check with your local Krishi Vigyan Kendra (KVK) or agriculture officer.",
            )}
          </p>
        </>
      )}
    </div>
  );
}

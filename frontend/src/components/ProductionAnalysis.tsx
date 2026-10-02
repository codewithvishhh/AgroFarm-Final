import { TrendingDown, TrendingUp, Minus, Lightbulb } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  PRODUCTION_IS_SAMPLE_DATA,
  type ProductionHistory,
} from "../data/productionHistory";
import { useI18n } from "../i18n/LanguageProvider";
import {
  analyzeProduction,
  describeProduction,
  STEADY_PERCENT,
  type ProductionPoint,
} from "../utils/productionAnalysis";
import { EmptyState } from "./EmptyState";
import { Panel } from "./Panel";

export type ProductionSource = "region" | "mine";

const fieldClass =
  "rounded-lg border border-husk/12 bg-canopy/50 backdrop-blur px-2.5 py-2 text-[11px] text-husk outline-none focus:border-crop/60";

const axisStyle = { fill: "#8CA79A", fontSize: 11 };
const tooltipStyle = {
  background: "#121D18",
  border: "1px solid #274236",
  borderRadius: 12,
  fontSize: 12,
  color: "#E6EFE8",
};

/** Points, unit and period for the chosen product and source. */
export function productionSeries(
  source: ProductionSource,
  product: string,
  history: ProductionHistory[],
  myMonthly: Record<string, ProductionPoint[]>,
): { points: ProductionPoint[]; unit: string; period: "year" | "month" } {
  if (source === "mine") {
    return { points: myMonthly[product] ?? [], unit: "kilograms", period: "month" };
  }
  const row = history.find((item) => item.product === product);
  return {
    points: (row?.years ?? []).map((item) => ({
      label: String(item.year),
      value: item.production,
    })),
    unit: "tonnes",
    period: "year",
  };
}

/** 📈 How production changed: earlier years or months against now. */
export function ProductionAnalysis({
  history,
  myMonthly,
  product,
  onProductChange,
  source,
  onSourceChange,
}: {
  history: ProductionHistory[];
  /** The farmer's own supplied quantity per month, keyed by product. */
  myMonthly: Record<string, ProductionPoint[]>;
  product: string;
  onProductChange: (product: string) => void;
  source: ProductionSource;
  onSourceChange: (source: ProductionSource) => void;
}) {
  const { t } = useI18n();
  const products = Array.from(
    new Set([...history.map((row) => row.product), ...Object.keys(myMonthly)]),
  );
  const { points, unit, period } = productionSeries(source, product, history, myMonthly);
  const result = analyzeProduction(points);
  const insights = result
    ? describeProduction(result, { t, product, unit: t(unit), period })
    : [];
  const region = history.find((row) => row.product === product)?.region;

  const change = result?.changePercent ?? 0;
  const steady = Math.abs(change) < STEADY_PERCENT;
  const TrendIcon = steady ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const trendStyle = steady
    ? "bg-harvest/15 text-harvest"
    : change > 0
      ? "bg-crop/15 text-crop"
      : "bg-rot/15 text-rot";

  const description =
    source === "region"
      ? `${t("Yearly production in {region}, earlier years against now", {
          region: t(region ?? "your region"),
        })}${PRODUCTION_IS_SAMPLE_DATA ? t(" · sample data, not live") : ""}`
      : t("What you supplied through AgroFarm each month");

  return (
    <Panel title={t("Production Analysis")} description={description}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] text-moss">
            {t("Product")}
            <select
              value={product}
              onChange={(event) => onProductChange(event.target.value)}
              className={`mt-1 block ${fieldClass}`}
            >
              {products.map((item) => (
                <option key={item} value={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </label>

          <div
            role="radiogroup"
            aria-label={t("Data source")}
            className="flex rounded-lg border border-husk/12 bg-canopy/50 p-0.5 text-[11px]"
          >
            {(
              [
                ["region", "Region dataset"],
                ["mine", "My supply"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={source === value}
                onClick={() => onSourceChange(value)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  source === value
                    ? "bg-crop/15 text-crop"
                    : "text-moss hover:text-husk"
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>

          {result && (
            <span
              className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${trendStyle}`}
            >
              <TrendIcon size={13} aria-hidden />
              {steady
                ? t("About the same as before")
                : t("{sign}{percent}% vs earlier", {
                    sign: change > 0 ? "+" : "−",
                    percent: Math.abs(change).toFixed(0),
                  })}
            </span>
          )}
        </div>

        {!result ? (
          <EmptyState
            title={t("Not enough history yet")}
            hint={
              source === "mine"
                ? t("Supply this produce for at least 4 months to see how it changes.")
                : t("This product has no yearly records in the dataset.")
            }
          />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={points}
                margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
              >
                <CartesianGrid stroke="#1D2F27" strokeDasharray="3 6" />
                <ReferenceArea
                  x1={result.earlier.from}
                  x2={result.earlier.to}
                  fill="#5AA9CE"
                  fillOpacity={0.08}
                  label={{ value: t("Earlier"), fill: "#5AA9CE", fontSize: 10, position: "insideTop" }}
                />
                <ReferenceArea
                  x1={result.recent.from}
                  x2={result.recent.to}
                  fill="#4FBF7A"
                  fillOpacity={0.1}
                  label={{ value: t("Now"), fill: "#4FBF7A", fontSize: 10, position: "insideTop" }}
                />
                <XAxis dataKey="label" tick={axisStyle} stroke="#274236" />
                <YAxis
                  tick={axisStyle}
                  stroke="#274236"
                  width={56}
                  tickFormatter={(value: number) => value.toLocaleString("en-IN")}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [
                    `${value.toLocaleString("en-IN")} ${t(unit)}`,
                    t("Production"),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={t("Production")}
                  stroke="#4FBF7A"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#4FBF7A" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="rounded-xl border border-husk/8 bg-soil-800/40 p-4">
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-harvest">
                <Lightbulb size={13} aria-hidden />
                {t("What the data says")}
              </p>
              <ul className="list-disc space-y-1.5 pl-4 text-xs leading-5 text-husk">
                {insights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

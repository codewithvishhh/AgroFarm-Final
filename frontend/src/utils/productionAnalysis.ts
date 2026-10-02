/**
 * Earlier-vs-now analysis of a production series.
 * Pure functions: no React, so the dashboard's Listen summary and the
 * Production Analysis panel share the same numbers and wording.
 */

export interface ProductionPoint {
  /** Axis label, e.g. "2019" or "Mar 2026". */
  label: string;
  value: number;
}

export interface ProductionAnalysisResult {
  points: ProductionPoint[];
  earlier: { from: string; to: string; average: number };
  recent: { from: string; to: string; average: number };
  /** Percent change from the earlier average to the recent average. */
  changePercent: number;
  peak: ProductionPoint;
  low: ProductionPoint;
  latest: ProductionPoint;
  previous: ProductionPoint;
  /** Least-squares slope: change in value per period. */
  slopePerPeriod: number;
  /** Biggest fall from one period to the next, if any. */
  biggestDrop: { from: ProductionPoint; to: ProductionPoint; percent: number } | null;
}

/** Changes smaller than this are reported as "about the same". */
export const STEADY_PERCENT = 3;

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

const percentChange = (from: number, to: number) =>
  from === 0 ? (to === 0 ? 0 : 100) : ((to - from) / from) * 100;

/** Needs at least 4 points; returns null otherwise. */
export function analyzeProduction(
  points: ProductionPoint[],
): ProductionAnalysisResult | null {
  if (points.length < 4) return null;

  // Compare the first third with the last third (2–3 periods each).
  const window = Math.min(3, Math.max(2, Math.floor(points.length / 3)));
  const earlierPoints = points.slice(0, window);
  const recentPoints = points.slice(-window);
  const earlierAverage = average(earlierPoints.map((point) => point.value));
  const recentAverage = average(recentPoints.map((point) => point.value));

  const peak = points.reduce((best, point) => (point.value > best.value ? point : best));
  const low = points.reduce((worst, point) => (point.value < worst.value ? point : worst));

  const xs = points.map((_, index) => index);
  const meanX = average(xs);
  const meanY = average(points.map((point) => point.value));
  const numerator = points.reduce(
    (sum, point, index) => sum + (index - meanX) * (point.value - meanY),
    0,
  );
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);

  let biggestDrop: ProductionAnalysisResult["biggestDrop"] = null;
  for (let index = 1; index < points.length; index += 1) {
    const change = percentChange(points[index - 1].value, points[index].value);
    if (change < 0 && (!biggestDrop || change < biggestDrop.percent)) {
      biggestDrop = { from: points[index - 1], to: points[index], percent: change };
    }
  }

  return {
    points,
    earlier: {
      from: earlierPoints[0].label,
      to: earlierPoints[earlierPoints.length - 1].label,
      average: earlierAverage,
    },
    recent: {
      from: recentPoints[0].label,
      to: recentPoints[recentPoints.length - 1].label,
      average: recentAverage,
    },
    changePercent: percentChange(earlierAverage, recentAverage),
    peak,
    low,
    latest: points[points.length - 1],
    previous: points[points.length - 2],
    slopePerPeriod: denominator === 0 ? 0 : numerator / denominator,
    biggestDrop,
  };
}

type Translate = (text: string, vars?: Record<string, string | number>) => string;

/**
 * Plain-language insights, already translated. `unit` is a translated unit
 * word ("tonnes", "kilograms"); `period` is "year" or "month".
 */
export function describeProduction(
  result: ProductionAnalysisResult,
  {
    t,
    product,
    unit,
    period,
  }: { t: Translate; product: string; unit: string; period: "year" | "month" },
): string[] {
  const number = (value: number) =>
    Math.round(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const percent = (value: number) => Math.abs(value).toFixed(0);
  const range = (from: string, to: string) => (from === to ? from : `${from}–${to}`);
  const crop = t(product);

  const lines: string[] = [];
  const vars = {
    product: crop,
    percent: percent(result.changePercent),
    earlier: range(result.earlier.from, result.earlier.to),
    recent: range(result.recent.from, result.recent.to),
    before: number(result.earlier.average),
    now: number(result.recent.average),
    unit,
  };
  if (Math.abs(result.changePercent) < STEADY_PERCENT) {
    lines.push(
      t("{product} production is about the same as before: {now} {unit} on average in {recent}, against {before} {unit} in {earlier}.", vars),
    );
  } else if (result.changePercent > 0) {
    lines.push(
      t("{product} production is {percent}% higher now. It averaged {now} {unit} in {recent}, up from {before} {unit} in {earlier}.", vars),
    );
  } else {
    lines.push(
      t("{product} production is {percent}% lower now. It averaged {now} {unit} in {recent}, down from {before} {unit} in {earlier}.", vars),
    );
  }

  lines.push(
    t("The highest was {peak} {unit} in {peakAt}, and the lowest was {low} {unit} in {lowAt}.", {
      peak: number(result.peak.value),
      peakAt: result.peak.label,
      low: number(result.low.value),
      lowAt: result.low.label,
      unit,
    }),
  );

  const latestChange = percentChange(result.previous.value, result.latest.value);
  const latestVars = {
    latest: result.latest.label,
    previous: result.previous.label,
    percent: percent(latestChange),
  };
  if (Math.abs(latestChange) < STEADY_PERCENT) {
    lines.push(t("{latest} was about the same as {previous}.", latestVars));
  } else if (latestChange > 0) {
    lines.push(t("{latest} was {percent}% higher than {previous}.", latestVars));
  } else {
    lines.push(t("{latest} was {percent}% lower than {previous}.", latestVars));
  }

  const trendVars = {
    amount: number(Math.abs(result.slopePerPeriod)),
    unit,
    count: result.points.length,
  };
  const flat =
    Math.abs(result.slopePerPeriod) < Math.abs(result.earlier.average) * 0.005;
  if (flat) {
    lines.push(
      period === "year"
        ? t("Across {count} years the trend is flat.", trendVars)
        : t("Across {count} months the trend is flat.", trendVars),
    );
  } else if (result.slopePerPeriod > 0) {
    lines.push(
      period === "year"
        ? t("Across {count} years the trend is rising by about {amount} {unit} a year.", trendVars)
        : t("Across {count} months the trend is rising by about {amount} {unit} a month.", trendVars),
    );
  } else {
    lines.push(
      period === "year"
        ? t("Across {count} years the trend is falling by about {amount} {unit} a year.", trendVars)
        : t("Across {count} months the trend is falling by about {amount} {unit} a month.", trendVars),
    );
  }

  if (result.biggestDrop && result.biggestDrop.percent <= -STEADY_PERCENT) {
    lines.push(
      t("The biggest fall was {percent}% from {from} to {to}.", {
        percent: percent(result.biggestDrop.percent),
        from: result.biggestDrop.from.label,
        to: result.biggestDrop.to.label,
      }),
    );
  }
  return lines;
}

/** Month-by-month totals from dated quantities, with empty months as 0. */
export function monthlyTotals(
  rows: { date: Date; quantity: number }[],
  locale = "en-IN",
): ProductionPoint[] {
  const valid = rows.filter((row) => !Number.isNaN(row.date.getTime()));
  if (valid.length === 0) return [];
  const key = (date: Date) => date.getFullYear() * 12 + date.getMonth();
  const totals = new Map<number, number>();
  valid.forEach((row) => {
    const k = key(row.date);
    totals.set(k, (totals.get(k) ?? 0) + row.quantity);
  });
  const first = Math.min(...totals.keys());
  const last = Math.max(...totals.keys());
  const points: ProductionPoint[] = [];
  for (let k = first; k <= last; k += 1) {
    const date = new Date(Math.floor(k / 12), k % 12, 1);
    points.push({
      label: date.toLocaleDateString(locale, { month: "short", year: "numeric" }),
      value: totals.get(k) ?? 0,
    });
  }
  return points;
}

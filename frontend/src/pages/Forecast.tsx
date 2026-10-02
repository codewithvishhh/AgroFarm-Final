import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "../components/EmptyState";
import { ChartViewToggle } from "../components/ChartViewToggle";
import { Loader } from "../components/Loader";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import { useFetch } from "../hooks/useFetch";
import { forecastApi } from "../services/api";
import { formatDate } from "../utils/format";
import { LanguageSelector } from "../components/LanguageSelector";
import { ListenButton } from "../components/ListenButton";
import { useI18n } from "../i18n/LanguageProvider";

const axisStyle = { fill: "#8CA79A", fontSize: 11 };
const tooltipStyle = {
  background: "#121D18",
  border: "1px solid #274236",
  borderRadius: 12,
  fontSize: 12,
  color: "#E6EFE8",
};

export function Forecast() {
  const { t } = useI18n();
  const [produce, setProduce] = useState("Tomato");

  const produceTypes = useFetch(
    () => forecastApi.produceTypes(),
    [],
    "forecast:produce",
  );
  const forecast = useFetch(
    () => forecastApi.get(produce),
    [produce],
    `forecast:${produce}`,
  );

  const data = forecast.data;
  const series = data
    ? [
        ...data.history.map((point) => ({
          date: point.date,
          actual: point.actual ?? null,
          forecast: null as number | null,
        })),
        ...data.forecast.map((point, index) => ({
          date: point.date,
          actual:
            index === 0
              ? (data.history[data.history.length - 1]?.actual ?? null)
              : null,
          forecast: point.forecast ?? null,
        })),
      ]
    : [];

  /** Plain-language summary read aloud by the 🔊 Listen button. */
  const buildSpokenSummary = () => {
    const number = (value: number) =>
      value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    if (!data) {
      return [t("Demand forecast summary."), t("Forecast is still loading.")].join(" ");
    }
    const lines = [
      t("Demand forecast summary for {produce}.", { produce: t(data.produce_type) }),
      t("Expected demand is {qty} {unit}. Recommended stock is {stock} and current stock is {current}.", {
        qty: number(data.expected_demand),
        unit: data.unit,
        stock: number(data.recommended_stock),
        current: number(data.current_stock),
      }),
      data.trend_percentage >= 0
        ? t("Demand is trending up by {percent} percent.", {
            percent: Math.abs(data.trend_percentage).toFixed(0),
          })
        : t("Demand is trending down by {percent} percent.", {
            percent: Math.abs(data.trend_percentage).toFixed(0),
          }),
    ];
    if (data.potential_shortage > 0) {
      lines.push(
        t("Possible shortage of {qty} {unit}.", {
          qty: number(data.potential_shortage),
          unit: data.unit,
        }),
      );
    } else if (data.potential_surplus > 0) {
      lines.push(
        t("Possible surplus of {qty} {unit}.", {
          qty: number(data.potential_surplus),
          unit: data.unit,
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

      <div className="flex flex-wrap gap-1.5">
        {(produceTypes.data ?? []).map((item) => (
          <button
            key={item}
            onClick={() => setProduce(item)}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
              produce === item
                ? "border-crop/40 bg-crop/10 text-crop"
                : "border-husk/12 bg-husk/4 text-moss backdrop-blur hover:border-husk/25 hover:text-husk"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {forecast.loading && !data ? (
        <Loader label="Building the forecast" />
      ) : !data ? (
        <Panel bodyClassName="p-0">
          <EmptyState
            title="No demand history"
            hint="Record daily demand for this produce to build a forecast."
          />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Expected demand"
              value={`${data.expected_demand.toLocaleString()} ${data.unit}`}
              hint="Next seven days"
              tone="crop"
            />
            <StatCard
              label="Recommended stock"
              value={`${data.recommended_stock.toLocaleString()} ${data.unit}`}
              hint="Expected demand plus 15% safety stock"
              tone="chill"
            />
            <StatCard
              label="Potential shortage"
              value={`${data.potential_shortage.toLocaleString()} ${data.unit}`}
              tone={data.potential_shortage > 0 ? "rot" : "neutral"}
              hint={`Current stock ${data.current_stock.toLocaleString()} ${data.unit}`}
            />
            <StatCard
              label="Potential surplus"
              value={`${data.potential_surplus.toLocaleString()} ${data.unit}`}
              tone={data.potential_surplus > 0 ? "harvest" : "neutral"}
              hint={`Demand trend ${data.trend_percentage > 0 ? "+" : ""}${data.trend_percentage}%`}
            />
          </div>

          <Panel
            title={`${data.produce_type} demand`}
            description={`Recorded demand and the next seven days. Method: ${data.method.toLowerCase()}.`}
          >
            <ChartViewToggle
              height={320}
              pieData={series.map((point) => ({
                name: `${formatDate(point.date)}${point.forecast !== null ? " (forecast)" : ""}`,
                value: point.forecast ?? point.actual ?? 0,
              }))}
              formatValue={(value) => `${value.toLocaleString()} ${data.unit}`}
            >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={series}
                margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4FBF7A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4FBF7A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5AA9CE" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#5AA9CE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1D2F27" strokeDasharray="3 6" />
                <XAxis
                  dataKey="date"
                  tick={axisStyle}
                  stroke="#274236"
                  tickFormatter={formatDate}
                />
                <YAxis tick={axisStyle} stroke="#274236" width={60} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#8CA79A" }} />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Recorded demand"
                  stroke="#4FBF7A"
                  strokeWidth={2}
                  fill="url(#actualFill)"
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast demand"
                  stroke="#5AA9CE"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fill="url(#forecastFill)"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
            </ChartViewToggle>

            <p className="mt-4 text-[11px] leading-relaxed text-moss">
              This forecast is statistical, not a machine learning model. It
              takes a weighted moving average of recent demand and adds a linear
              trend term. The service is isolated so a trained model can replace
              it without changing this page.
            </p>
          </Panel>

          <Panel
            title="Next seven days"
            description="Day by day projection"
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <thead>
                  <tr className="text-[11px] text-moss">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Forecast demand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-husk/8">
                  {data.forecast.map((point) => (
                    <tr key={point.date} className="hover:bg-husk/4">
                      <td className="px-5 py-3 text-xs text-husk">
                        {formatDate(point.date)}
                      </td>
                      <td className="px-5 py-3 text-xs tabular-nums text-moss">
                        {point.forecast?.toLocaleString()} {data.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

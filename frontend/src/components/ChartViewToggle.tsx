import { useState, type ReactNode } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useI18n } from "../i18n/LanguageProvider";

export interface PieSlice {
  name: string;
  value: number;
  color?: string;
}

const PALETTE = [
  "#4FBF7A",
  "#5AA9CE",
  "#E2A03F",
  "#2F8F5B",
  "#8CA79A",
  "#E2564D",
  "#E8E2D4",
  "#3E7FA0",
  "#B67E2C",
  "#274236",
];

const tooltipStyle = {
  background: "#121D18",
  border: "1px solid #274236",
  borderRadius: 12,
  fontSize: 12,
  color: "#E6EFE8",
};

/**
 * Wraps an existing chart and adds a Pie Chart view of the same data.
 * The existing chart (children) is rendered unchanged and stays the
 * default view.
 */
export function ChartViewToggle({
  children,
  pieData,
  height = 260,
  formatValue,
}: {
  children: ReactNode;
  pieData: PieSlice[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"chart" | "pie">("chart");
  const slices = pieData.filter((slice) => slice.value > 0);

  const option = (key: "chart" | "pie", label: string) => (
    <button
      type="button"
      onClick={() => setView(key)}
      aria-pressed={view === key}
      className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
        view === key
          ? "bg-crop/15 text-crop"
          : "text-moss hover:text-husk"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <div className="inline-flex rounded-lg border border-husk/12 bg-soil-800/55 p-0.5 backdrop-blur">
          {option("chart", t("Chart"))}
          {option("pie", t("Pie Chart"))}
        </div>
      </div>

      {view === "chart" ? (
        children
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="0%"
              outerRadius="75%"
              stroke="#0D1512"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice, index) => (
                <Cell
                  key={`${slice.name}-${index}`}
                  fill={slice.color ?? PALETTE[index % PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={{ color: "#E6EFE8" }}
              formatter={(value) =>
                formatValue ? formatValue(Number(value)) : Number(value).toLocaleString()
              }
            />
            {slices.length <= 10 && (
              <Legend wrapperStyle={{ fontSize: 11, color: "#8CA79A" }} />
            )}
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

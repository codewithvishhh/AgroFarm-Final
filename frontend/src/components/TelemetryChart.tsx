import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Telemetry } from "../types";
import { ChartViewToggle } from "./ChartViewToggle";

interface TelemetryChartProps {
  readings: Telemetry[];
}

export function TelemetryChart({ readings }: TelemetryChartProps) {
  const data = readings.map((reading) => ({
    time: new Date(
      reading.timestamp.endsWith("Z")
        ? reading.timestamp
        : `${reading.timestamp}Z`,
    ).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    temperature: reading.temperature,
    humidity: reading.humidity,
  }));

  // Pie view: the same readings, grouped by temperature range.
  const bands = [
    { name: "Below 4°C", color: "#5AA9CE", test: (value: number) => value < 4 },
    { name: "4–8°C", color: "#4FBF7A", test: (value: number) => value >= 4 && value <= 8 },
    { name: "Above 8°C", color: "#E2A03F", test: (value: number) => value > 8 },
  ];
  const pieData = bands.map((band) => ({
    name: `${band.name} readings`,
    color: band.color,
    value: readings.filter(
      (reading) =>
        reading.temperature !== null &&
        reading.temperature !== undefined &&
        band.test(reading.temperature),
    ).length,
  }));

  return (
    <ChartViewToggle height={240} pieData={pieData}>
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#1D2F27" strokeDasharray="3 6" />
        <XAxis
          dataKey="time"
          tick={{ fill: "#8CA79A", fontSize: 11 }}
          stroke="#274236"
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#8CA79A", fontSize: 11 }}
          stroke="#274236"
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "#8CA79A", fontSize: 11 }}
          stroke="#274236"
        />
        <Tooltip
          contentStyle={{
            background: "#121D18",
            border: "1px solid #274236",
            borderRadius: 12,
            fontSize: 12,
            color: "#E6EFE8",
          }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="temperature"
          name="Temperature °C"
          stroke="#E2A03F"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="humidity"
          name="Humidity %"
          stroke="#5AA9CE"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
    </ChartViewToggle>
  );
}

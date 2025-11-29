/**
 * ValueChangeChart Component
 *
 * Displays a line chart visualizing the instrument's value changes over time.
 * Uses Recharts library for responsive, interactive data visualization.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ValueChangeDto } from "@/types";

interface ValueChangeChartProps {
  history: ValueChangeDto[];
  currentValuePln: string;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  value: number;
  formattedValue: string;
  formattedDate: string;
}

export function ValueChangeChart({ history, currentValuePln }: ValueChangeChartProps) {
  // Transform history data for the chart
  const chartData: ChartDataPoint[] = history.map((change) => ({
    date: new Date(change.created_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    timestamp: new Date(change.created_at).getTime(),
    value: parseFloat(change.after_value_pln),
    formattedValue: `${change.after_value_pln} PLN`,
    formattedDate: new Date(change.created_at).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  // Add current value as the latest data point if there's history
  if (history.length > 0) {
    chartData.push({
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      timestamp: Date.now(),
      value: parseFloat(currentValuePln),
      formattedValue: `${currentValuePln} PLN`,
      formattedDate: "Current",
    });
  }

  // Sort by timestamp to ensure correct order
  chartData.sort((a, b) => a.timestamp - b.timestamp);

  // Calculate min and max for better scaling
  const values = chartData.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || 10; // 10% padding or default 10

  if (chartData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">No data available to display chart</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Value Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
            domain={[minValue - padding, maxValue + padding]}
            tickFormatter={(value) => `${value.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "0.75rem",
            }}
            labelStyle={{
              color: "#111827",
              fontWeight: "600",
              marginBottom: "0.25rem",
            }}
            formatter={(value: number, name: string, props: any) => [`${value.toFixed(2)} PLN`, "Value"]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.formattedDate;
              }
              return label;
            }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: "1rem",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: "#2563eb", r: 4 }}
            activeDot={{ r: 6 }}
            name="Instrument Value (PLN)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import React from "react";
import { useCountUp } from "../../hooks/useCountUp";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: "teal" | "blue" | "amber" | "red";
  spark: number[];
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  spark
}) => {
  const animatedValue = useCountUp(value);

  const colors = {
    teal: "text-accent-teal border-accent-teal/20",
    blue: "text-accent-blue border-accent-blue/20",
    amber: "text-accent-amber border-accent-amber/20",
    red: "text-accent-red border-accent-red/20"
  };

  const lineColors = {
    teal: "#00d4aa",
    blue: "#378add",
    amber: "#f5a623",
    red: "#e74c3c"
  };

  // Convert spark numbers array into Recharts expected format
  const chartData = spark.map((val, idx) => ({ id: idx, value: val }));

  return (
    <div className="card-glass p-4 flex flex-col justify-between h-36">
      {/* Header */}
      <div className="flex items-center justify-between text-text-secondary text-xs uppercase tracking-wider font-semibold">
        <span>{title}</span>
        <div className={`p-1.5 rounded-lg border bg-bg-deep/40 ${colors[color]}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      {/* Body / Count */}
      <div className="flex items-baseline justify-between mt-2">
        <span className="font-mono text-3xl font-bold text-text-primary tracking-tight">
          {animatedValue}
          {title.includes("uptime") && "%"}
        </span>

        {/* Tiny Sparkline */}
        <div className="w-20 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColors[color]}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

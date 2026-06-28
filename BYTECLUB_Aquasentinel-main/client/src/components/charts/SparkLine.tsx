import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparkLineProps {
  data: number[];
  color?: string;
}

export const SparkLine: React.FC<SparkLineProps> = ({ data, color = "#00d4aa" }) => {
  const chartData = data.map((val, idx) => ({ id: idx, value: val }));

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

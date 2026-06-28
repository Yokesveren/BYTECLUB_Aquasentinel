import React from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

interface BarChartProps {
  data: { hour: string; count: number }[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" opacity={0.2} />
          <XAxis
            dataKey="hour"
            stroke="#7a8ba8"
            fontSize={9}
            tickLine={false}
            axisLine={{ stroke: "#1a2d45" }}
          />
          <YAxis
            stroke="#7a8ba8"
            fontSize={9}
            tickLine={false}
            axisLine={{ stroke: "#1a2d45" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(9, 18, 35, 0.95)",
              borderColor: "#1a2d45",
              borderRadius: "8px",
              color: "#e8edf5",
              fontFamily: "monospace",
              fontSize: "11px"
            }}
          />
          <Bar dataKey="count" fill="#e74c3c" radius={[2, 2, 0, 0]} barSize={10} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

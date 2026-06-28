import React from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

interface AreaChartProps {
  data: { time: string; messages: number; alerts: number }[];
}

export const AreaChart: React.FC<AreaChartProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTeal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="#7a8ba8"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: "#1a2d45" }}
          />
          <YAxis
            stroke="#7a8ba8"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: "#1a2d45" }}
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
          <Area
            type="monotone"
            dataKey="messages"
            stroke="#00d4aa"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTeal)"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

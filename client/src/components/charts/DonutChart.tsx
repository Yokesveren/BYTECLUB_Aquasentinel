import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[180px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
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
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-[10px] font-mono text-text-secondary uppercase">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

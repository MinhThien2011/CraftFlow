"use client"

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

interface MaterialConsumptionChartProps {
  data: any[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataObj = payload[0].payload;
    return (
      <div className="bg-card/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-black/10">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dataObj.color }} />
          <span className="text-sm font-bold text-foreground">{payload[0].name}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-muted-foreground">Tiêu hao:</span>
          <span className="text-xs font-bold text-foreground">{payload[0].value.toLocaleString()}</span>
        </div>
      </div>
    )
  }
  return null
}

export default function MaterialConsumptionChart({ data }: MaterialConsumptionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-muted-foreground">
        Không có dữ liệu tiêu hao
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry: any, index: number) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color} 
              style={{ filter: "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.05))" }}
              className="outline-none stroke-background stroke-2 hover:opacity-90 transition-opacity"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}


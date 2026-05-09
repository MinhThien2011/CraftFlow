"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

interface ProductionTrendChartProps {
  data: any[];
}

export default function ProductionTrendChart({ data }: ProductionTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-muted-foreground">
        Không có dữ liệu sản xuất
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#7A7A7A", fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#7A7A7A", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #E5DDD3",
            borderRadius: "8px",
          }}
        />
        <Bar
          dataKey="produced"
          fill="#2D5016"
          radius={[4, 4, 0, 0]}
          name="Số lượng"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

interface ProductionTrendChartProps {
  data: any[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-black/10 min-w-[150px]">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="text-xs text-muted-foreground">Đã sản xuất</span>
          </div>
          <span className="font-bold text-sm text-foreground">
            {payload[0].value.toLocaleString()}
          </span>
        </div>
      </div>
    )
  }
  return null
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
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
            <stop offset="95%" stopColor="#059669" stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "currentColor", opacity: 0.6, fontSize: 12 }}
          dy={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "currentColor", opacity: 0.6, fontSize: 12 }}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'var(--muted)/0.1', radius: 8 }}
        />
        <Bar
          dataKey="produced"
          fill="url(#barGradient)"
          radius={[8, 8, 0, 0]}
          name="Số lượng"
          barSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}


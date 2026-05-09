"use client"

import { Card } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const data = [
  { name: "An", value: 95 },
  { name: "Bình", value: 88 },
  { name: "Cường", value: 92 },
  { name: "Dũng", value: 85 },
  { name: "Nhị", value: 100 },
  { name: "Phương", value: 90 },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-border p-3">
        <p className="font-semibold text-card-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          Điểm hiệu suất: <span className="text-[#F68C1E] font-medium">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

export function PerformanceChart() {
  return (
    <Card className="p-6 bg-card border-border h-full">
      <h3 className="text-lg font-semibold text-card-foreground mb-6">
        Hiệu suất nhân viên
      </h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD5" horizontal={true} vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#6B6B6B" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6B6B6B"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar
              dataKey="value"
              fill="#F68C1E"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}


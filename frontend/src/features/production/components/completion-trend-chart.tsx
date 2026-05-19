"use client"

import { Card } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

interface CompletionTrendChartProps {
  data: Array<{ date: string; completedOrders: number; totalProduced: number }>
}

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-card-foreground mb-6">
        Xu hướng hoàn thành (14 ngày)
      </h3>
      <div className="h-[300px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completedOrders" name="Đơn hoàn thành" stroke="#2563EB" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="totalProduced" name="SL hoàn thành" stroke="#16A34A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">Chưa có dữ liệu hoàn thành</div>
        )}
      </div>
    </Card>
  )
}


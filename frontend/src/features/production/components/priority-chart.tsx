"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface PriorityChartProps {
  data: Array<{ name: string; value: number; color: string }>
}

export function PriorityChart({ data }: PriorityChartProps) {
  const hasData = data.some((item) => item.value > 0)

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-card-foreground mb-6">
        Phân bổ độ ưu tiên đơn
      </h3>
      <div className="h-[300px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={56} outerRadius={84}>
                {data.map((entry, index) => (
                  <Cell key={`priority-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">Chưa có dữ liệu ưu tiên</div>
        )}
      </div>
    </Card>
  )
}


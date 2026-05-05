"use client"

import { Card } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { name: "Đang thực hiện", value: 25, color: "#2B8BE8" },
  { name: "Hoàn thành", value: 45, color: "#4A9C6B" },
  { name: "Đã hủy", value: 0, color: "#E04E4E" },
]

export function StatusChart() {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="p-6 bg-card border-border h-full">
      <h3 className="text-lg font-semibold text-card-foreground mb-6">
        Trạng thái đơn hàng
      </h3>
      <div className="h-[180px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5DDD5",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value} đơn`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-3xl font-bold text-card-foreground">{total}</p>
          <p className="text-sm text-muted-foreground">Tổng đơn</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">{item.name}</span>
            <span className="ml-auto text-sm font-medium text-card-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}


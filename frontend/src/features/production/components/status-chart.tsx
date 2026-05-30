"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Activity } from "lucide-react"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface StatusChartProps {
  data: Array<{ name: string; value: number; color: string }>
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
          <span className="text-xs text-muted-foreground">Số lệnh:</span>
          <span className="text-xs font-extrabold text-foreground">{payload[0].value.toLocaleString()} lệnh</span>
        </div>
      </div>
    )
  }
  return null
}

export function StatusChart({ data }: StatusChartProps) {
  const hasData = data.some(item => item.value > 0)
  
  const totalOrders = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0)
  }, [data])

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg flex flex-col justify-between min-h-[386px]">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl shadow-inner border border-blue-500/20">
            <Activity className="size-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Trạng thái sản xuất
            </h3>
            <p className="text-xs text-muted-foreground">Tỉ lệ phân bổ theo trạng thái lệnh sản xuất</p>
          </div>
        </div>

        {hasData ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Pie Chart Column (7/12) */}
            <div className="md:col-span-7 relative h-[220px] flex items-center justify-center">
              
              {/* Central KPI Metric */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-20">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground block tracking-tighter leading-none mb-1">
                  {totalOrders}
                </span>
                <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest block">
                  Lệnh sản xuất
                </span>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`status-cell-${index}`} 
                        fill={entry.color}
                        style={{ filter: "drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.05))" }}
                        className="outline-none stroke-background stroke-2 hover:opacity-90 transition-opacity"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sidebar Data Column (5/12) */}
            <div className="md:col-span-5 flex flex-col gap-2.5">
              {data.map((item) => {
                const percentage = totalOrders > 0 ? Math.round((item.value / totalOrders) * 100) : 0
                return (
                  <div 
                    key={item.name} 
                    className="flex items-center justify-between p-2 rounded-xl transition-all duration-300 hover:bg-muted/40 group/item border border-transparent hover:border-border/30"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0 group-hover/item:scale-125 transition-transform" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-xs font-semibold text-muted-foreground group-hover/item:text-foreground transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-foreground block">
                        {item.value} lệnh
                      </span>
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm font-medium">
            Chưa có dữ liệu trạng thái
          </div>
        )}
      </div>
    </div>
  )
}

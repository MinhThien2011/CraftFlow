"use client"

import { ShieldAlert, ArrowUpRight } from "lucide-react"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface PriorityChartProps {
  data: Array<{ name: string; value: number; color: string }>
}

export function PriorityChart({ data }: PriorityChartProps) {
  const totalOrders = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  // Map priority configuration for premium colors and gradients
  const priorityConfigs = useMemo(() => {
    return data.map((item) => {
      const percentage = totalOrders > 0 ? Math.round((item.value / totalOrders) * 100) : 0
      
      let gradient = "from-blue-500 to-sky-400"
      let bgAccent = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      let glow = "group-hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]"
      
      if (item.name === "Khẩn") {
        gradient = "from-purple-600 to-indigo-500"
        bgAccent = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
        glow = "group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse"
      } else if (item.name === "Cao") {
        gradient = "from-red-600 to-rose-500"
        bgAccent = "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
        glow = "group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
      } else if (item.name === "Trung bình") {
        gradient = "from-amber-500 to-yellow-400"
        bgAccent = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        glow = "group-hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
      }

      return {
        ...item,
        percentage,
        gradient,
        bgAccent,
        glow
      }
    })
  }, [data, totalOrders])

  const urgentCount = useMemo(() => {
    return data.find(item => item.name === "Khẩn")?.value || 0
  }, [data])

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg flex flex-col justify-between min-h-[386px]">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl shadow-inner border border-purple-500/20">
              <ShieldAlert className="size-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Phân bổ độ ưu tiên đơn
              </h3>
              <p className="text-xs text-muted-foreground">Độ cấp thiết của kế hoạch sản xuất</p>
            </div>
          </div>
          
          {urgentCount > 0 && (
            <span className="text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full animate-bounce shadow-sm">
              {urgentCount} Đơn khẩn
            </span>
          )}
        </div>

        {totalOrders > 0 ? (
          <div className="space-y-4 mt-2">
            {priorityConfigs.map((item) => (
              <div key={item.name} className="group relative flex flex-col space-y-1.5 p-3 rounded-2xl transition-all duration-300 hover:bg-muted/30">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border shadow-inner",
                      item.bgAccent
                    )}>
                      {item.name}
                    </span>
                    <span className="text-muted-foreground">{item.value} đơn hàng</span>
                  </div>
                  <span className="font-extrabold text-foreground">{item.percentage}%</span>
                </div>
                
                {/* Progress bar container */}
                <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-1000 shadow-sm",
                      item.gradient,
                      item.glow
                    )}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm font-medium">
            Chưa có dữ liệu ưu tiên đơn
          </div>
        )}
      </div>

      <div className="border-t border-border/50 pt-4 mt-4 flex items-center justify-between text-xs text-muted-foreground font-semibold">
        <span>Tổng đơn hàng phân bổ:</span>
        <span className="text-foreground font-extrabold text-sm bg-muted/60 px-2 py-0.5 rounded-md">
          {totalOrders} đơn
        </span>
      </div>
    </div>
  )
}

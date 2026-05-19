"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { TrendingUp, BarChart3 } from "lucide-react"

interface CompletionTrendChartProps {
  data: Array<{ date: string; completedOrders: number; totalProduced: number }>
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-black/10 min-w-[160px]">
        <p className="text-xs font-semibold text-muted-foreground mb-2.5">{payload[0].payload.date}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold text-xs text-foreground">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  const hasData = data && data.length > 0

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg flex flex-col justify-between min-h-[386px]">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-inner border border-indigo-500/20">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Xu hướng hoàn thành (14 ngày)
            </h3>
            <p className="text-xs text-muted-foreground">Tốc độ hoàn thành đơn và sản lượng sản xuất</p>
          </div>
        </div>

        <div className="h-[250px] w-full mt-2">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fill: "currentColor", opacity: 0.6, fontSize: 11 }} tickLine={false} axisLine={false} dy={8} />
                <YAxis tick={{ fill: "currentColor", opacity: 0.6, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs font-semibold text-muted-foreground">{value}</span>}
                />
                <Area type="monotone" dataKey="completedOrders" name="Đơn hoàn thành" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" activeDot={{ r: 5, strokeWidth: 0, fill: '#3b82f6' }} />
                <Area type="monotone" dataKey="totalProduced" name="SL hoàn thành" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorQuantity)" activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-[1.5rem] p-6 text-center space-y-3 bg-muted/10">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <BarChart3 className="size-6 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">Hệ thống đang tích lũy dữ liệu</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px] mx-auto">
                  Biểu đồ xu hướng 14 ngày qua sẽ tự động cập nhật khi có đơn lệnh sản xuất hoàn thành đầu tiên.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

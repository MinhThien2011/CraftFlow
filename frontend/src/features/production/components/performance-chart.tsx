"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Users, Award } from "lucide-react"
import { useMemo } from "react"

interface PerformanceChartProps {
  data: Array<{ name: string; completed: number; remaining: number; assignments: number }>
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/85 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-black/10 min-w-[180px]">
        <p className="text-sm font-bold text-foreground mb-2.5">{payload[0].payload.name}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold text-xs text-foreground">
                {entry.value.toLocaleString()} sản phẩm
              </span>
            </div>
          ))}
          <div className="pt-2 mt-1.5 border-t border-border/50 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Tác vụ đang làm:</span>
            <span className="font-bold text-xs text-primary">{payload[0].payload.assignments}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  // Find the top performer (person with the highest completed quantity)
  const topPerformer = useMemo(() => {
    if (!data || data.length === 0) return null
    return [...data].sort((a, b) => b.completed - a.completed)[0]
  }, [data])

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/85 to-card/35 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg flex flex-col justify-between min-h-[386px]">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-900/20 text-green-600 dark:text-green-400 rounded-2xl shadow-inner border border-green-500/20">
              <Users className="size-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Tải công việc nhân viên
              </h3>
              <p className="text-xs text-muted-foreground">Sản lượng phân công và thực hiện của nhân sự</p>
            </div>
          </div>
        </div>

        <div className="h-[230px] w-full mt-2">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="var(--border)" opacity={0.3} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", opacity: 0.6, fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor", opacity: 0.8, fontSize: 10 }}
                  width={110}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: 'rgba(100, 100, 100, 0.05)', radius: 8 }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={24} 
                  iconType="circle"
                  iconSize={6}
                  formatter={(value) => <span className="text-[10px] font-bold text-muted-foreground">{value}</span>}
                />
                <Bar
                  name="Đã hoàn thành"
                  dataKey="completed"
                  stackId="workload"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  barSize={12}
                />
                <Bar
                  name="Còn lại"
                  dataKey="remaining"
                  stackId="workload"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium">
              Chưa có dữ liệu hiệu suất
            </div>
          )}
        </div>
      </div>

      {topPerformer && topPerformer.completed > 0 && (
        <div className="border-t border-border/50 pt-3.5 mt-2 flex items-center gap-3 text-xs">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Award className="size-4 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground font-semibold leading-none">Nhân sự xuất sắc tuần:</p>
            <p className="text-foreground font-extrabold truncate mt-1">
              {topPerformer.name} <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">({topPerformer.completed} sản phẩm)</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

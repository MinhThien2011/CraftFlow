'use client'

import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react'
import { useWarehouseDashboard } from '../api/get-warehouse-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export function WarehouseCharts() {
  const { data, isLoading, isError } = useWarehouseDashboard()

  if (isLoading) {
    return (
      <div className="w-full h-[400px] rounded-[2rem] border border-white/20 dark:border-white/10 bg-card/60 backdrop-blur-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    )
  }

  if (isError || !data?.success) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center rounded-[2rem] border border-red-500/20 bg-red-500/5 backdrop-blur-2xl">
        <p className="text-red-500 text-sm">Không thể tải dữ liệu biểu đồ.</p>
      </div>
    )
  }

  // Format data for Recharts
  const inventoryData = data.data.charts?.inventoryTrends?.map(item => ({
    date: item._id, // Format: YYYY-MM-DD
    displayDate: format(parseISO(item._id), 'dd MMM', { locale: vi }),
    'Nhập Kho': item.input,
    'Xuất Kho': item.output
  })) || []

  const totalInput = inventoryData.reduce((acc, curr) => acc + curr['Nhập Kho'], 0)
  const totalOutput = inventoryData.reduce((acc, curr) => acc + curr['Xuất Kho'], 0)

  // Custom Tooltip component for glassmorphism
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/80 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-black/10 min-w-[200px]">
          <p className="text-sm font-semibold text-foreground mb-3">{format(parseISO(payload[0].payload.date), 'EEEE, dd MMMM, yyyy', { locale: vi })}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-bold text-foreground">
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

  return (
    <div className="w-full relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-white/10 bg-gradient-to-br from-card/80 to-card/30 backdrop-blur-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-lg">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-inner border border-indigo-500/20">
            <Activity className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Luân Chuyển Hàng Hoá</h2>
            <p className="text-sm text-muted-foreground">Thống kê lượng Nhập/Xuất kho trong 7 ngày qua</p>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex gap-4">
          <div className="flex flex-col items-end px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              <ArrowDownToLine className="size-3" /> Tổng Nhập
            </span>
            <span className="text-xl font-bold text-foreground">{totalInput.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end px-4 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
              <ArrowUpFromLine className="size-3" /> Tổng Xuất
            </span>
            <span className="text-xl font-bold text-foreground">{totalOutput.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[320px] w-full mt-4">
        {inventoryData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Chưa có dữ liệu giao dịch trong 7 ngày qua
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={inventoryData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis 
                dataKey="displayDate" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              
              <Area 
                type="monotone" 
                dataKey="Nhập Kho" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorInput)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
              />
              <Area 
                type="monotone" 
                dataKey="Xuất Kho" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorOutput)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

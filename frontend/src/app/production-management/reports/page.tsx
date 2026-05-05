"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/production-management/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const monthlyData = [
  { month: "T1", đơn_hoàn_thành: 45, hao_hụt: 3 },
  { month: "T2", đơn_hoàn_thành: 52, hao_hụt: 5 },
  { month: "T3", đơn_hoàn_thành: 48, hao_hụt: 2 },
  { month: "T4", đơn_hoàn_thành: 61, hao_hụt: 4 },
]

const employeePerformance = [
  { name: "An", điểm_hiệu_suất: 97 },
  { name: "Bình", điểm_hiệu_suất: 89 },
  { name: "Cường", điểm_hiệu_suất: 92 },
  { name: "Dũng", điểm_hiệu_suất: 85 },
  { name: "Nhi", điểm_hiệu_suất: 100 },
  { name: "Phương", điểm_hiệu_suất: 91 },
]

const wastageByCategory = [
  { name: "Nguyên liệu hỏng", value: 45, color: "#7A5C43" },
  { name: "Lỗi sản xuất", value: 30, color: "#F68C1E" },
  { name: "Thiết bị hỏng", value: 15, color: "#2B8BE8" },
  { name: "Khác", value: 10, color: "#4A9C6B" },
]

const progressData = [
  { week: "Tuần 1", tiến_độ: 20 },
  { week: "Tuần 2", tiến_độ: 45 },
  { week: "Tuần 3", tiến_độ: 68 },
  { week: "Tuần 4", tiến_độ: 85 },
]

const timeRangeOptions = [
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chỉnh" },
]

const exportFormatOptions = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV" },
]

// Custom tooltip for employee performance chart
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; điểm_hiệu_suất: number } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
        <p className="font-semibold text-card-foreground">{payload[0].payload.name}</p>
        <p className="text-sm text-muted-foreground">
          Điểm hiệu suất: {payload[0].payload.điểm_hiệu_suất}
        </p>
      </div>
    )
  }
  return null
}

export default function ReportsPage() {
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState("month")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [exportFormat, setExportFormat] = useState("pdf")
  const [isExporting, setIsExporting] = useState(false)

  const handleApplyTimeRange = () => {
    const rangeName = timeRangeOptions.find(t => t.value === selectedTimeRange)?.label
    if (selectedTimeRange === "custom" && customStartDate && customEndDate) {
      alert(`Đã áp dụng khoảng thời gian: ${customStartDate} - ${customEndDate}`)
    } else {
      alert(`Đã áp dụng khoảng thời gian: ${rangeName}`)
    }
    setIsTimeRangeOpen(false)
  }

  const handleExport = async () => {
    setIsExporting(true)
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const formatName = exportFormatOptions.find(f => f.value === exportFormat)?.label
    alert(`Đã xuất báo cáo thành công!\nĐịnh dạng: ${formatName}\nTên file: bao-cao-san-xuat-04-2026.${exportFormat}`)
    setIsExporting(false)
    setIsExportOpen(false)
  }

  // Calculate average performance score
  const avgPerformance = Math.round(
    employeePerformance.reduce((sum, emp) => sum + emp.điểm_hiệu_suất, 0) / employeePerformance.length
  )

  return (
    <DashboardLayout title="Báo cáo sản xuất">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground">
              Tổng hợp dữ liệu sản xuất tháng 04/2026
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-border"
              onClick={() => setIsTimeRangeOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Chọn thời gian
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setIsExportOpen(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBE3D9]">
                <TrendingUp className="h-6 w-6 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ hoàn thành</p>
                <p className="text-2xl font-bold text-card-foreground">94.5%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBE3D9]">
                <Package className="h-6 w-6 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
                <p className="text-2xl font-bold text-card-foreground">2,456</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBE3D9]">
                <Users className="h-6 w-6 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hiệu suất TB</p>
                <p className="text-2xl font-bold text-card-foreground">87.2%</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBE3D9]">
                <AlertTriangle className="h-6 w-6 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ hao hụt</p>
                <p className="text-2xl font-bold text-card-foreground">3.2%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Performance */}
          <Card className="p-6 bg-card border-border">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-card-foreground">
                Đơn hoàn thành theo tháng
              </h3>
              <p className="text-sm text-muted-foreground">
                So sánh số đơn hoàn thành và hao hụt
              </p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD5" />
                  <XAxis dataKey="month" stroke="#6B6B6B" fontSize={12} />
                  <YAxis stroke="#6B6B6B" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5DDD5",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="đơn_hoàn_thành" fill="#4A9C6B" radius={[4, 4, 0, 0]} name="Đơn hoàn thành" />
                  <Bar dataKey="hao_hụt" fill="#E04E4E" radius={[4, 4, 0, 0]} name="Hao hụt" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Progress Trend */}
          <Card className="p-6 bg-card border-border">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-card-foreground">
                Tiến độ tổng thể tháng này
              </h3>
              <p className="text-sm text-muted-foreground">
                Theo dõi tiến độ hoàn thành theo tuần
              </p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD5" />
                  <XAxis dataKey="week" stroke="#6B6B6B" fontSize={12} />
                  <YAxis stroke="#6B6B6B" fontSize={12} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5DDD5",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Tiến độ"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="tiến_độ"
                    stroke="#7A5C43"
                    strokeWidth={3}
                    dot={{ fill: "#7A5C43", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Employee Performance */}
          <Card className="p-6 bg-card border-border lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-card-foreground">
                Hiệu suất nhân viên
              </h3>
              <p className="text-sm text-muted-foreground">
                Điểm hiệu suất trung bình: {avgPerformance} điểm
              </p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5DDD5" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B6B6B" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6B6B6B" 
                    fontSize={12}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="điểm_hiệu_suất" 
                    fill="#F68C1E" 
                    radius={[4, 4, 0, 0]} 
                    name="Điểm hiệu suất"
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Wastage by Category */}
          <Card className="p-6 bg-card border-border">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-card-foreground">
                Phân loại hao hụt
              </h3>
              <p className="text-sm text-muted-foreground">
                Theo nguyên nhân
              </p>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wastageByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {wastageByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5DDD5",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {wastageByCategory.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-card-foreground">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Time Range Dialog */}
      <Dialog open={isTimeRangeOpen} onOpenChange={setIsTimeRangeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              Chọn khoảng thời gian
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Khoảng thời gian</Label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khoảng thời gian" />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTimeRange === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Từ ngày</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Đến ngày</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsTimeRangeOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleApplyTimeRange}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Áp dụng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              Xuất báo cáo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <p className="font-medium text-card-foreground">Báo cáo sản xuất</p>
              </div>
              <p className="text-sm text-muted-foreground">Tháng 04/2026</p>
            </div>

            <div className="space-y-2">
              <Label>Định dạng xuất</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn định dạng" />
                </SelectTrigger>
                <SelectContent>
                  {exportFormatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nội dung báo cáo</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="include-stats" defaultChecked className="rounded" />
                  <label htmlFor="include-stats" className="text-sm text-card-foreground">Thống kê tổng quan</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="include-charts" defaultChecked className="rounded" />
                  <label htmlFor="include-charts" className="text-sm text-card-foreground">Biểu đồ phân tích</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="include-employee" defaultChecked className="rounded" />
                  <label htmlFor="include-employee" className="text-sm text-card-foreground">Hiệu suất nhân viên</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="include-wastage" defaultChecked className="rounded" />
                  <label htmlFor="include-wastage" className="text-sm text-card-foreground">Báo cáo hao hụt</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsExportOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleExport}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Xuất báo cáo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}



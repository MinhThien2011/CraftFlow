"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ScrollText,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  PackagePlus,
  Package,
  ShoppingCart,
  Trash2,
  Edit,
  Eye,
  FileSearch,
} from "lucide-react"

interface ActivityLog {
  id: string
  timestamp: Date
  user: string
  userId: string
  role: "admin" | "warehouse_manager" | "staff"
  action: string
  category: "inventory" | "production" | "material" | "system" | "user"
  details: string
  status: "success" | "warning" | "error"
  ipAddress?: string
}

const mockActivityLogs: ActivityLog[] = [
  {
    id: "1",
    timestamp: new Date("2024-04-15T09:30:00"),
    user: "Nguyễn Văn Admin",
    userId: "1",
    role: "admin",
    action: "CREATE_MATERIAL",
    category: "material",
    details: "Tạo vật liệu mới: Da bò Ý cao cấp",
    status: "success",
    ipAddress: "192.168.1.100",
  },
  {
    id: "2",
    timestamp: new Date("2024-04-15T09:25:00"),
    user: "Lê Văn Kho",
    userId: "2",
    role: "warehouse_manager",
    action: "APPROVE_IMPORT",
    category: "inventory",
    details: "Duyệt lô nhập #IMP-001 từ Công ty Da Việt",
    status: "success",
    ipAddress: "192.168.1.101",
  },
  {
    id: "3",
    timestamp: new Date("2024-04-15T09:15:00"),
    user: "Trần Thị Nhân Viên",
    userId: "3",
    role: "staff",
    action: "CREATE_IMPORT",
    category: "inventory",
    details: "Tạo phiếu nhập: 50kg Da bò từ Công ty Da Việt",
    status: "success",
    ipAddress: "192.168.1.102",
  },
  {
    id: "4",
    timestamp: new Date("2024-04-15T09:00:00"),
    user: "Nguyễn Văn Admin",
    userId: "1",
    role: "admin",
    action: "UPDATE_MATERIAL",
    category: "material",
    details: "Cập nhật giá vật liệu: Khóa kéo YKK - 15.000 VND → 18.000 VND",
    status: "success",
    ipAddress: "192.168.1.100",
  },
  {
    id: "5",
    timestamp: new Date("2024-04-15T08:45:00"),
    user: "Lê Văn Kho",
    userId: "2",
    role: "warehouse_manager",
    action: "STOCK_ADJUSTMENT",
    category: "inventory",
    details: "Điều chỉnh tồn kho: Da bò Ý -5kg (Hư hỏng)",
    status: "warning",
    ipAddress: "192.168.1.101",
  },
  {
    id: "6",
    timestamp: new Date("2024-04-15T08:30:00"),
    user: "Trần Thị Nhân Viên",
    userId: "3",
    role: "staff",
    action: "CREATE_PRODUCTION",
    category: "production",
    details: "Tạo đơn sản xuất: 20 Túi da thời trang",
    status: "success",
    ipAddress: "192.168.1.102",
  },
  {
    id: "7",
    timestamp: new Date("2024-04-15T08:15:00"),
    user: "Nguyễn Văn Admin",
    userId: "1",
    role: "admin",
    action: "DELETE_MATERIAL",
    category: "material",
    details: "Xóa vật liệu cũ hết hạn",
    status: "warning",
    ipAddress: "192.168.1.100",
  },
  {
    id: "8",
    timestamp: new Date("2024-04-15T08:00:00"),
    user: "Lê Văn Kho",
    userId: "2",
    role: "warehouse_manager",
    action: "CREATE_MATERIAL",
    category: "material",
    details: "Thêm vật liệu nhà cung cấp mới: Vải canvas Hàn Quốc",
    status: "success",
    ipAddress: "192.168.1.101",
  },
  {
    id: "9",
    timestamp: new Date("2024-04-14T17:45:00"),
    user: "Nguyễn Văn Admin",
    userId: "1",
    role: "admin",
    action: "UPDATE_SETTINGS",
    category: "system",
    details: "Cập nhật ngưỡng tồn kho thấp: 10kg → 15kg",
    status: "success",
    ipAddress: "192.168.1.100",
  },
  {
    id: "10",
    timestamp: new Date("2024-04-14T17:30:00"),
    user: "Trần Thị Nhân Viên",
    userId: "3",
    role: "staff",
    action: "VIEW_REPORT",
    category: "system",
    details: "Thử truy cập Báo cáo Tài chính",
    status: "error",
    ipAddress: "192.168.1.102",
  },
]

export default function SystemLogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const filteredLogs = mockActivityLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      filterCategory === "all" || log.category === filterCategory
    const matchesRole = filterRole === "all" || log.role === filterRole
    const matchesStatus = filterStatus === "all" || log.status === filterStatus

    return matchesSearch && matchesCategory && matchesRole && matchesStatus
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE_MATERIAL":
      case "CREATE_IMPORT":
      case "CREATE_PRODUCTION":
        return <PackagePlus className="w-4 h-4" />
      case "UPDATE_MATERIAL":
      case "UPDATE_SETTINGS":
        return <Edit className="w-4 h-4" />
      case "DELETE_MATERIAL":
        return <Trash2 className="w-4 h-4" />
      case "APPROVE_IMPORT":
        return <ShoppingCart className="w-4 h-4" />
      case "STOCK_ADJUSTMENT":
        return <Package className="w-4 h-4" />
      case "VIEW_REPORT":
        return <Eye className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE_MATERIAL: "Tạo vật liệu",
      CREATE_IMPORT: "Tạo phiếu nhập",
      CREATE_PRODUCTION: "Tạo đơn sản xuất",
      UPDATE_MATERIAL: "Cập nhật vật liệu",
      UPDATE_SETTINGS: "Cập nhật cài đặt",
      DELETE_MATERIAL: "Xóa vật liệu",
      APPROVE_IMPORT: "Duyệt nhập kho",
      STOCK_ADJUSTMENT: "Điều chỉnh tồn kho",
      VIEW_REPORT: "Xem báo cáo",
    }
    return labels[action] || action
  }

  const getRoleBadge = (role: "admin" | "warehouse_manager" | "staff") => {
    const configs = {
      admin: {
        label: "Quản trị",
        className: "bg-primary/10 text-primary border-primary/20",
      },
      warehouse_manager: {
        label: "Quản lý kho",
        className: "bg-secondary/10 text-secondary border-secondary/20",
      },
      staff: {
        label: "Nhân viên",
        className: "bg-muted text-muted-foreground",
      },
    }
    const config = configs[role]
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: "success" | "warning" | "error") => {
    const configs = {
      success: {
        label: "Thành công",
        className: "bg-success/10 text-success border-success/20",
      },
      warning: {
        label: "Cảnh báo",
        className: "bg-warning/10 text-warning border-warning/20",
      },
      error: {
        label: "Lỗi",
        className: "bg-destructive/10 text-destructive border-destructive/20",
      },
    }
    const config = configs[status]
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const getCategoryLabel = (category: ActivityLog["category"]) => {
    const labels = {
      inventory: "Kho",
      production: "Sản xuất",
      material: "Vật liệu",
      system: "Hệ thống",
      user: "Người dùng",
    }
    return labels[category] || category
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Vừa xong"
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 7) return `${diffDays} ngày trước`

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleExport = () => {
    alert("Chức năng xuất nhật ký sẽ được thêm trong Sprint 2")
  }

  return (
    <AppShell title="Nhật ký hệ thống" subtitle="Theo dõi toàn bộ hoạt động của hệ thống">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Nhật ký hệ thống</h2>
            <p className="text-sm text-muted-foreground">
              Theo dõi toàn bộ hoạt động và thay đổi trong hệ thống.
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất nhật ký
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng hoạt động</p>
                  <p className="text-2xl font-bold text-foreground">{mockActivityLogs.length}</p>
                </div>
                <Activity className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thành công</p>
                  <p className="text-2xl font-bold text-success">
                    {mockActivityLogs.filter((log) => log.status === "success").length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cảnh báo</p>
                  <p className="text-2xl font-bold text-warning">
                    {mockActivityLogs.filter((log) => log.status === "warning").length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lỗi</p>
                  <p className="text-2xl font-bold text-destructive">
                    {mockActivityLogs.filter((log) => log.status === "error").length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Lọc & Tìm kiếm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo người dùng hoặc hành động..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả danh mục</SelectItem>
                      <SelectItem value="inventory">Kho</SelectItem>
                  <SelectItem value="production">Sản xuất</SelectItem>
                  <SelectItem value="material">Vật liệu</SelectItem>
                  <SelectItem value="system">Hệ thống</SelectItem>
                  <SelectItem value="user">Người dùng</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="warehouse_manager">Quản lý kho</SelectItem>
                  <SelectItem value="staff">Nhân viên</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="success">Thành công</SelectItem>
                  <SelectItem value="warning">Cảnh báo</SelectItem>
                  <SelectItem value="error">Lỗi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || filterCategory !== "all" || filterRole !== "all" || filterStatus !== "all") && (
              <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <span>
                  Hiển thị {filteredLogs.length} trên tổng {mockActivityLogs.length} hoạt động
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setFilterCategory("all")
                    setFilterRole("all")
                    setFilterStatus("all")
                  }}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              Nhật ký hoạt động ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <ScrollText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Không tìm thấy nhật ký hoạt động</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Hãy thử điều chỉnh bộ lọc của bạn
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Chi tiết</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Địa chỉ IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="whitespace-nowrap">{formatTimestamp(log.timestamp)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{log.user}</p>
                              <p className="text-xs text-muted-foreground">Mã: {log.userId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(log.role)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="text-sm">{getActionLabel(log.action)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {getCategoryLabel(log.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-md">{log.details}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {log.ipAddress || "N/A"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

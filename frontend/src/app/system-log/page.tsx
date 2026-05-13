"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  Calendar,
  Download,
  Eye,
  Filter,
  Package,
  PackagePlus,
  ScrollText,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Edit,
} from "lucide-react"

import { systemApi, type GetSystemLogsParams } from "@/api/system.api"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import type { PaginationData, SystemLog } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 20

const MODULE_OPTIONS = [
  { value: "all", label: "Tất cả danh mục" },
  { value: "AUTH", label: "Xác thực" },
  { value: "USER", label: "Người dùng" },
  { value: "MATERIAL", label: "Vật liệu" },
  { value: "INVENTORY", label: "Kho" },
  { value: "PRODUCTION", label: "Sản xuất" },
  { value: "SYSTEM", label: "Hệ thống" },
]

const ACTION_OPTIONS = [
  { value: "all", label: "Tất cả hành động" },
  { value: "LOGIN_SUCCESS", label: "Đăng nhập thành công" },
  { value: "LOGIN_FAILED", label: "Đăng nhập thất bại" },
  { value: "LOGOUT", label: "Đăng xuất" },
  { value: "CREATE_USER", label: "Tạo người dùng" },
  { value: "UPDATE_USER", label: "Cập nhật người dùng" },
  { value: "DELETE_USER", label: "Xóa người dùng" },
  { value: "CREATE_MATERIAL", label: "Tạo vật liệu" },
  { value: "UPDATE_MATERIAL", label: "Cập nhật vật liệu" },
  { value: "DELETE_MATERIAL", label: "Xóa vật liệu" },
  { value: "CREATE_IMPORT", label: "Tạo phiếu nhập" },
  { value: "APPROVE_IMPORT", label: "Duyệt nhập kho" },
  { value: "STOCK_ADJUSTMENT", label: "Điều chỉnh tồn kho" },
  { value: "CREATE_PRODUCTION", label: "Tạo đơn sản xuất" },
  { value: "UPDATE_SETTINGS", label: "Cập nhật cài đặt" },
  { value: "VIEW_REPORT", label: "Xem báo cáo" },
]

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "success", label: "Thành công" },
  { value: "warning", label: "Cảnh báo" },
  { value: "error", label: "Lỗi" },
]

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="space-y-1">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </TableCell>
      <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-4 w-56 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-5 w-20 animate-pulse rounded bg-muted" /></TableCell>
      <TableCell><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
    </TableRow>
  )
}

function getLogStatus(log: SystemLog): "success" | "warning" | "error" {
  if (log.action?.includes("FAILED")) return "error"
  if (log.action?.startsWith("DELETE") || log.action === "STOCK_ADJUSTMENT") return "warning"
  return "success"
}

function getActionIcon(action: string) {
  switch (action) {
    case "CREATE_MATERIAL":
    case "CREATE_IMPORT":
    case "CREATE_PRODUCTION":
    case "CREATE_USER":
      return <PackagePlus className="h-4 w-4" />
    case "UPDATE_MATERIAL":
    case "UPDATE_SETTINGS":
    case "UPDATE_USER":
      return <Edit className="h-4 w-4" />
    case "DELETE_MATERIAL":
    case "DELETE_USER":
      return <Trash2 className="h-4 w-4" />
    case "APPROVE_IMPORT":
      return <ShoppingCart className="h-4 w-4" />
    case "STOCK_ADJUSTMENT":
      return <Package className="h-4 w-4" />
    case "VIEW_REPORT":
      return <Eye className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    LOGIN_SUCCESS: "Đăng nhập thành công",
    LOGIN_FAILED: "Đăng nhập thất bại",
    LOGOUT: "Đăng xuất",
    CREATE_USER: "Tạo người dùng",
    UPDATE_USER: "Cập nhật người dùng",
    DELETE_USER: "Xóa người dùng",
    CREATE_MATERIAL: "Tạo vật liệu",
    UPDATE_MATERIAL: "Cập nhật vật liệu",
    DELETE_MATERIAL: "Xóa vật liệu",
    CREATE_IMPORT: "Tạo phiếu nhập",
    APPROVE_IMPORT: "Duyệt nhập kho",
    STOCK_ADJUSTMENT: "Điều chỉnh tồn kho",
    CREATE_PRODUCTION: "Tạo đơn sản xuất",
    UPDATE_SETTINGS: "Cập nhật cài đặt",
    VIEW_REPORT: "Xem báo cáo",
  }

  return labels[action] || action
}

function getModuleLabel(module: string) {
  const labels: Record<string, string> = {
    AUTH: "Xác thực",
    USER: "Người dùng",
    MATERIAL: "Vật liệu",
    INVENTORY: "Kho",
    PRODUCTION: "Sản xuất",
    SYSTEM: "Hệ thống",
  }

  return labels[module] || module
}

function getRoleLabel(roleName?: string) {
  if (!roleName) return "Không rõ"

  const normalized = roleName.toLowerCase()

  if (normalized.includes("admin")) return "Quản trị"
  if (normalized.includes("production")) return "QL sản xuất"
  if (normalized.includes("kho") || normalized.includes("warehouse")) return "QL kho"
  if (normalized.includes("staff")) return "Nhân viên"

  return roleName
}

function formatTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return "Vừa xong"
  if (diffMinutes < 60) return `${diffMinutes} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays < 7) return `${diffDays} ngày trước`

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SystemLogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const fetchLogs = useCallback(async (params: GetSystemLogsParams, showSkeleton = false) => {
    if (showSkeleton) {
      setIsInitialLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const response = await systemApi.getSystemLogs(params)

      if (response.success && response.data) {
        setLogs(response.data.logs || [])
        setPagination(response.data.pagination || null)
        setErrorMessage("")
      }
    } catch (error: any) {
      const message = error.message || "Không thể tải nhật ký hệ thống"
      setErrorMessage(message)
      if (showSkeleton) {
        setLogs([])
        setPagination(null)
      }
      toast.error(message)
    } finally {
      setIsInitialLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params: GetSystemLogsParams = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        module: moduleFilter !== "all" ? moduleFilter : undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
      }

      fetchLogs(params, logs.length === 0)
    }, 300)

    return () => clearTimeout(timer)
  }, [actionFilter, currentPage, fetchLogs, logs.length, moduleFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [moduleFilter, actionFilter])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const status = getLogStatus(log)
      const keyword = searchQuery.trim().toLowerCase()
      const authorName = log.author?.fullName || log.author?.username || ""
      const authorRole = log.author?.role?.roleName || ""
      const matchesSearch =
        !keyword ||
        authorName.toLowerCase().includes(keyword) ||
        authorRole.toLowerCase().includes(keyword) ||
        log.details.toLowerCase().includes(keyword) ||
        log.action.toLowerCase().includes(keyword) ||
        getActionLabel(log.action).toLowerCase().includes(keyword)

      const matchesStatus = statusFilter === "all" || status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [logs, searchQuery, statusFilter])

  const stats = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        const status = getLogStatus(log)
        acc.total += 1
        acc[status] += 1
        return acc
      },
      { total: 0, success: 0, warning: 0, error: 0 }
    )
  }, [logs])

  const hasFilters =
    searchQuery.trim().length > 0 ||
    moduleFilter !== "all" ||
    actionFilter !== "all" ||
    statusFilter !== "all"

  const handleResetFilters = () => {
    setSearchQuery("")
    setModuleFilter("all")
    setActionFilter("all")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  const handleExport = () => {
    toast.info("Chức năng xuất nhật ký sẽ được bổ sung sau")
  }

  return (
    <AppShell title="Nhật ký hệ thống" subtitle="Theo dõi toàn bộ hoạt động của hệ thống">
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Nhật ký hệ thống</h2>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Xuất nhật ký
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Lọc & tìm kiếm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative md:col-span-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo người dùng, hành động hoặc chi tiết..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả hành động" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-end">
                <Button variant="ghost" onClick={handleResetFilters} disabled={!hasFilters}>
                  Xóa bộ lọc
                </Button>
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Đang áp dụng bộ lọc:</span>
                {moduleFilter !== "all" && (
                  <Badge variant="outline">{getModuleLabel(moduleFilter)}</Badge>
                )}
                {actionFilter !== "all" && (
                  <Badge variant="outline">{getActionLabel(actionFilter)}</Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="outline">{STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label}</Badge>
                )}
                {searchQuery.trim() && <Badge variant="outline">Từ khóa: {searchQuery.trim()}</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Nhật ký hoạt động ({isInitialLoading ? "..." : filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRefreshing && !isInitialLoading && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                <span>Đang cập nhật dữ liệu...</span>
              </div>
            )}

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
                  {isInitialLoading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 py-6">
                          <ScrollText className="h-10 w-10 text-muted-foreground/40" />
                          <p className="font-medium text-foreground">
                            {errorMessage || "Không tìm thấy nhật ký phù hợp"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Hãy thử đổi bộ lọc hoặc kiểm tra quyền truy cập API.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => {
                      const status = getLogStatus(log)
                      const statusClasses = {
                        success: "bg-green-50 text-green-700 border-green-200",
                        warning: "bg-amber-50 text-amber-700 border-amber-200",
                        error: "bg-red-50 text-red-700 border-red-200",
                      }

                      return (
                        <TableRow key={log._id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="whitespace-nowrap">{formatTimestamp(log.createdAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {log.author?.fullName || log.author?.username || "Không xác định"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {log.author?._id ? `#${log.author._id.slice(-6)}` : "Không có tác giả"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getRoleLabel(log.author?.role?.roleName)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className="text-sm">{getActionLabel(log.action)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getModuleLabel(log.module)}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-md text-sm text-foreground">{log.details}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(statusClasses[status])}>
                              {STATUS_OPTIONS.find((item) => item.value === status)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              {log.ipAddress || "N/A"}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.total > 0 && (
              <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Trang <span className="font-medium text-foreground">{pagination.page}</span> / {pagination.pages}
                  <span className="mx-1">•</span>
                  Tổng <span className="font-medium text-foreground">{pagination.total}</span> bản ghi
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1 || isRefreshing}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === pagination.pages || isRefreshing}
                    onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

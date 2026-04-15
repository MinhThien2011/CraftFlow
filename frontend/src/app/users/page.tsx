"use client"

import React, { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import { Plus, Search, MoreVertical, Shield, Warehouse, User as UserIcon, Upload, ChevronLeft, ChevronRight, Factory } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { userApi } from "@/api/user.api"
import type { User, PaginationData } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { getAvatarUrl } from "@/lib/utils"

const roleFilters = ["Tất cả", "Quản trị viên", "Quản lý sản xuất", "Quản lý kho", "Nhân viên"] as const
type RoleFilter = (typeof roleFilters)[number]

const roleIcons: Record<string, any> = {
  admin: Shield,
  production_manager: Factory,
  kho_manager: Warehouse,
  staff: UserIcon,
}

const roleColors: Record<string, string> = {
  admin: "text-red-600 bg-red-50",
  production_manager: "text-purple-600 bg-purple-50",
  kho_manager: "text-amber-600 bg-amber-50",
  staff: "text-blue-600 bg-blue-50",
}

const roleLabels: Record<string, string> = {
  admin: "Quản trị viên",
  production_manager: "Quản lý sản xuất",
  kho_manager: "Quản lý kho",
  staff: "Nhân viên",
}

const roleFilterToValue: Record<RoleFilter, string | undefined> = {
  "Tất cả": undefined,
  "Quản trị viên": "admin",
  "Quản lý sản xuất": "production_manager",
  "Quản lý kho": "kho_manager",
  "Nhân viên": "staff",
}

function getInitials(name: string): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  if (!name) return "bg-gray-100 text-gray-700"
  const colors = [
    "bg-amber-100 text-amber-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-orange-100 text-orange-700",
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("Tất cả")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { toast } = useToast()

  // API States
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    gender: "male",
    address: "",
    role: "",
    maxDailyCapacity: 100,
    isActive: true,
  })

  const fetchUsers = useCallback(async (search?: string, role?: string, page: number = 1) => {
    setIsLoading(true)
    try {
      const response = await userApi.getUsers({
        search,
        role,
        isActive: true,
        limit: itemsPerPage,
        page: page,
      })
      if (response.success && response.data) {
        setUsers(response.data.users || [])
        setPagination(response.data.pagination || null)
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải danh sách người dùng",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery, roleFilterToValue[roleFilter], currentPage)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery, roleFilter, currentPage, fetchUsers])

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter])

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.username || !newUser.password) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ các trường bắt buộc",
        variant: "destructive",
      })
      return
    }

    // In a real app, we would call an API here
    toast({
      title: "Thông báo",
      description: "Chức năng thêm người dùng đang được triển khai",
    })
    resetForm()
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    setNewUser({
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
      gender: "male",
      address: "",
      role: "staff",
      maxDailyCapacity: 100,
      isActive: true,
    })
    setAvatarPreview("")
    setIsAddDialogOpen(false)
  }

  const toggleUserStatus = (userId: string) => {
    // API call would go here
    toast({
      title: "Thông báo",
      description: "Chức năng thay đổi trạng thái đang được triển khai",
    })
  }

  const getUserRoleName = (role: User["role"]): string => {
    if (!role) return "staff"
    if (typeof role === "string") return role.toLowerCase()
    return (role.roleName || "staff").toLowerCase()
  }

  return (
    <AppShell
      title="Quản lý người dùng"
      subtitle="Quản lý nhân viên và tài khoản kho"
    >
      <div className="space-y-6">
        {/* Header Section */}
        <Card className="border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Quản lý người dùng
                </CardTitle>
                <CardDescription className="mt-1">
                  Quản lý tài khoản nhân viên và phân quyền
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4" />
                    Thêm tài khoản
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Thêm tài khoản mới</DialogTitle>
                    <DialogDescription>
                      Điền thông tin đầy đủ để tạo tài khoản người dùng mới
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
                    {/* Avatar Upload Section */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Avatar</span>
                          </div>
                        )}
                      </div>
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                        <Button variant="outline" asChild className="cursor-pointer">
                          <span>Tải lên ảnh</span>
                        </Button>
                      </label>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Họ và tên */}
                        <div className="space-y-2">
                          <Label htmlFor="name">Họ và tên *</Label>
                          <Input
                            id="name"
                            placeholder="Nguyễn Văn An"
                            value={newUser.name}
                            onChange={(e) =>
                              setNewUser({ ...newUser, name: e.target.value })
                            }
                          />
                        </div>

                        {/* Tên đăng nhập */}
                        <div className="space-y-2">
                          <Label htmlFor="username">Tên đăng nhập *</Label>
                          <Input
                            id="username"
                            placeholder="nguyen.van.an"
                            value={newUser.username}
                            onChange={(e) =>
                              setNewUser({ ...newUser, username: e.target.value })
                            }
                          />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="email@craftflow.vn"
                            value={newUser.email}
                            onChange={(e) =>
                              setNewUser({ ...newUser, email: e.target.value })
                            }
                          />
                        </div>

                        {/* Mật khẩu */}
                        <div className="space-y-2">
                          <Label htmlFor="password">Mật khẩu *</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={newUser.password}
                            onChange={(e) =>
                              setNewUser({ ...newUser, password: e.target.value })
                            }
                          />
                        </div>

                        {/* Số điện thoại */}
                        <div className="space-y-2">
                          <Label htmlFor="phone">Số điện thoại</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+84 9xx xxx xxx"
                            value={newUser.phone}
                            onChange={(e) =>
                              setNewUser({ ...newUser, phone: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Vai trò */}
                        <div className="space-y-2">
                          <Label htmlFor="role">Vai trò *</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value: string) =>
                              setNewUser({ ...newUser, role: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Quản trị viên</SelectItem>
                              <SelectItem value="production_manager">Quản lý sản xuất</SelectItem>
                              <SelectItem value="kho_manager">Quản lý kho</SelectItem>
                              <SelectItem value="staff">Nhân viên</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Giới tính */}
                        <div className="space-y-2">
                          <Label htmlFor="gender">Giới tính</Label>
                          <Select
                            value={newUser.gender}
                            onValueChange={(value: any) =>
                              setNewUser({ ...newUser, gender: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Nam</SelectItem>
                              <SelectItem value="female">Nữ</SelectItem>
                              <SelectItem value="other">Khác</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Địa chỉ */}
                        <div className="space-y-2">
                          <Label htmlFor="address">Địa chỉ</Label>
                          <Input
                            id="address"
                            placeholder="123 Đường ABC, Quận 1, TP.HCM"
                            value={newUser.address}
                            onChange={(e) =>
                              setNewUser({ ...newUser, address: e.target.value })
                            }
                          />
                        </div>

                        {/* Định mức công việc tối đa */}
                        <div className="space-y-2">
                          <Label htmlFor="maxDailyCapacity">Định mức công việc tối đa</Label>
                          <Input
                            id="maxDailyCapacity"
                            type="number"
                            min="0"
                            value={newUser.maxDailyCapacity}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                maxDailyCapacity: Number(e.target.value),
                              })
                            }
                          />
                        </div>

                        {/* Trạng thái hoạt động */}
                        <div className="flex items-center justify-between pt-2">
                          <Label htmlFor="isActive">Kích hoạt tài khoản</Label>
                          <Switch
                            id="isActive"
                            checked={newUser.isActive}
                            onCheckedChange={(checked: boolean) =>
                              setNewUser({ ...newUser, isActive: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={resetForm}
                    >
                      Hủy
                    </Button>
                    <Button onClick={handleAddUser}>Tạo tài khoản</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {roleFilters.map((filter) => (
                  <Button
                    key={filter}
                    variant={roleFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRoleFilter(filter)}
                    className={roleFilter === filter ? "" : "hover:bg-muted"}
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Người dùng
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Vai trò
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                      Khối lượng công việc
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase text-muted-foreground">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Spinner className="h-4 w-4" />
                          <span>Đang tải danh sách người dùng...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <UserIcon className="h-12 w-12 text-muted-foreground/50" />
                          <p className="mt-4 text-lg font-medium text-muted-foreground">
                            Không tìm thấy người dùng
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const roleName = getUserRoleName(user.role)
                      const RoleIcon = roleIcons[roleName] || UserIcon
                      return (
                        <TableRow key={user._id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden shrink-0">
                                {getAvatarUrl(user.avatar) ? (
                                  <img
                                    src={getAvatarUrl(user.avatar)}
                                    alt={user.fullName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className={`flex h-full w-full items-center justify-center text-sm font-semibold ${getAvatarColor(user.fullName)}`}>
                                    {getInitials(user.fullName)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {user.fullName}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${roleColors[roleName] || "bg-gray-100"}`}>
                                <RoleIcon
                                  className={`h-4 w-4 ${roleColors[roleName]?.split(" ")[0] || "text-gray-600"}`}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {roleLabels[roleName] || roleName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.isActive
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                user.isActive
                                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                              }
                            >
                              {user.isActive ? "Hoạt động" : "Vô hiệu hóa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {roleName === "staff" ? (
                              <div className="flex items-center gap-3">
                                <Progress
                                  value={0} // Default to 0 for now as currentAssignedQuantity might be absolute, not %
                                  className="h-2 w-24"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {user.currentAssignedQuantity || 0} việc
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                N/A
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Đổi mật khẩu
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleUserStatus(user._id)}
                                >
                                  {user.isActive
                                    ? "Vô hiệu hóa"
                                    : "Kích hoạt"}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Xóa tài khoản
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Hiển thị{" "}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, pagination.total)}
                  </span>{" "}
                  đến{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, pagination.total)}
                  </span>{" "}
                  trong tổng số <span className="font-medium">{pagination.total}</span> người dùng
                </div>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="gap-1 pl-2.5"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Trước</span>
                      </Button>
                    </PaginationItem>

                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first, last, current, and pages around current
                        return (
                          page === 1 ||
                          page === pagination.pages ||
                          Math.abs(page - currentPage) <= 1
                        )
                      })
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <Button
                                variant={currentPage === page ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="h-9 w-9 p-0"
                              >
                                {page}
                              </Button>
                            </PaginationItem>
                          </React.Fragment>
                        )
                      })}

                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
                        disabled={currentPage === pagination.pages}
                        className="gap-1 pr-2.5"
                      >
                        <span>Sau</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

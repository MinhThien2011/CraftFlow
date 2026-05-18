"use client"

import React, { useState, useEffect, useCallback, useMemo, Fragment } from "react"
import { Plus, Search, MoreVertical, Shield, Warehouse, User as UserIcon, Upload, ChevronLeft, ChevronRight, Factory, Mail, Lock, Phone, MapPin, Calendar, Settings, Briefcase, Info, Eye, EyeOff } from "lucide-react"
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
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { getAvatarUrl } from "@/lib/utils"
import { withPermission } from "@/components/guards/permission-guard"

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

function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("Tất cả")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // API States
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [showPassword, setShowPassword] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    birthDay: "",
    gender: "male",
    address: "",
    role: "staff",
    maxDailyCapacity: 100,
    isActive: true,
  })

  const fetchUsers = useCallback(async (search?: string, role?: string, page: number = 1) => {
    setIsLoading(true)
    try {
      const response = await userApi.getUsers({
        search,
        role,
        limit: itemsPerPage,
        page: page,
      })
      if (response.success && response.data) {
        setUsers(response.data.users || [])
        setPagination(response.data.pagination || null)
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách người dùng")
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
    if (!newUser.name || !newUser.email || !newUser.username || !newUser.password || !newUser.role) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc")
      return
    }

    if (newUser.username.length < 3) {
      toast.error("Tên đăng nhập phải có ít nhất 3 ký tự")
      return
    }

    if (/\s/.test(newUser.username)) {
      toast.error("Tên đăng nhập không được chứa khoảng trắng")
      return
    }

    // Password complexity: >= 8 characters, at least 1 uppercase, 1 digit, 1 special char
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newUser.password)) {
      toast.error("Mật khẩu phải có ít nhất 8 ký tự, bao gồm ít nhất 1 chữ in hoa, 1 chữ số và 1 ký tự đặc biệt")
      return
    }

    try {
      const formData = new FormData();
      formData.append("fullName", newUser.name);
      formData.append("email", newUser.email);
      formData.append("username", newUser.username);
      formData.append("password", newUser.password);
      formData.append("phone", newUser.phone);
      formData.append("birthDay", newUser.birthDay);
      formData.append("gender", newUser.gender);
      formData.append("address", newUser.address);
      formData.append("role", newUser.role);

      if (newUser.role === "staff") {
        formData.append("maxDailyCapacity", newUser.maxDailyCapacity.toString());
      }

      formData.append("isActive", newUser.isActive.toString());

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await userApi.createUser(formData);
      if (response.success) {
        toast.success("Tạo tài khoản thành công");
        fetchUsers(searchQuery, roleFilterToValue[roleFilter], currentPage);
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo tài khoản mới");
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
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
      birthDay: "",
      gender: "male",
      address: "",
      role: "staff",
      maxDailyCapacity: 100,
      isActive: true,
    })
    setAvatarPreview("")
    setAvatarFile(null)
    setShowPassword(false)
    setIsAddDialogOpen(false)
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await userApi.updateStatus(userId, !currentStatus)
      if (response.success) {
        toast.success(`Đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản thành công`)
        fetchUsers(searchQuery, roleFilterToValue[roleFilter], currentPage)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Không thể thay đổi trạng thái tài khoản")
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      const response = await userApi.deleteUser(userToDelete._id)
      if (response.success) {
        toast.success("Xóa tài khoản thành công")
        setUserToDelete(null)
        fetchUsers(searchQuery, roleFilterToValue[roleFilter], currentPage)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Không thể xóa tài khoản")
    } finally {
      setIsDeleting(false)
    }
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
                <DialogContent className="w-[95vw] sm:max-w-[90vw] lg:max-w-6xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 px-6 py-6 shrink-0 border-b border-purple-100">
                    <DialogHeader>
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-purple-200">
                          <UserIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-bold text-purple-900">Thêm tài khoản mới</DialogTitle>
                          <DialogDescription className="text-purple-700/70 text-sm font-medium">
                            Nhập đầy đủ thông tin để khởi tạo thành viên mới
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-white">
                    <div className="max-w-5xl mx-auto space-y-10">
                      {/* Avatar Section - Compact */}
                      <div className="flex flex-col md:flex-row items-start gap-10 pb-8 border-b border-gray-50">
                        <div className="flex flex-col items-center gap-4 shrink-0">
                          <div className="relative group">
                            <div className="w-32 h-32 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-200 group-hover:border-purple-400 transition-colors">
                              {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <Upload className="h-8 w-8 text-purple-200" />
                              )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 cursor-pointer">
                              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                              <div className="p-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors">
                                <Plus className="h-4 w-4" />
                              </div>
                            </label>
                          </div>
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Ảnh đại diện</span>
                        </div>

                        <div className="flex-1 space-y-4">
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Info className="h-3 w-3 text-purple-500" /> Lưu ý khi tạo tài khoản
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <div className="h-1 w-1 rounded-full bg-purple-400" />
                              <span>Trường <strong className="text-purple-600">*</strong> là bắt buộc nhập.</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <div className="h-1 w-1 rounded-full bg-purple-400" />
                              <span>Mật khẩu tối thiểu 8 ký tự gồm chữ số chữ in hoa, ký tự đặc biệt.</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <div className="h-1 w-1 rounded-full bg-purple-400" />
                              <span>Tên đăng nhập không được trùng lặp.</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Main Form Fields */}
                      <div className="space-y-10">
                        {/* Section 1: Thông tin cá nhân */}
                        <div className="space-y-6">
                          <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2 uppercase tracking-widest">
                            <div className="h-1.5 w-6 bg-purple-600 rounded-full" />
                            Thông tin cá nhân
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Họ và tên *</Label>
                              <Input
                                placeholder="Nguyễn Văn An"
                                className="h-10 rounded-lg border-gray-200 focus:ring-purple-100"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Email *</Label>
                              <Input
                                type="email"
                                placeholder="email@craftflow.vn"
                                className="h-10 rounded-lg border-gray-200 focus:ring-purple-100"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Số điện thoại</Label>
                              <Input
                                placeholder="+84 9xx xxx xxx"
                                className="h-10 rounded-lg border-gray-200 focus:ring-purple-100"
                                value={newUser.phone}
                                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Ngày sinh</Label>
                              <Input
                                type="date"
                                className="h-10 rounded-lg border-gray-200 focus:ring-purple-100"
                                value={newUser.birthDay}
                                onChange={(e) => setNewUser({ ...newUser, birthDay: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Giới tính</Label>
                              <Select
                                value={newUser.gender}
                                onValueChange={(value: any) => setNewUser({ ...newUser, gender: value })}
                              >
                                <SelectTrigger className="h-10 rounded-lg border-gray-200 focus:ring-purple-100">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">Nam</SelectItem>
                                  <SelectItem value="female">Nữ</SelectItem>
                                  <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Địa chỉ</Label>
                              <Input
                                placeholder="123 Đường ABC, Quận 1..."
                                className="h-10 rounded-lg border-gray-200 focus:ring-purple-100"
                                value={newUser.address}
                                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Tài khoản & Phân quyền */}
                        <div className="space-y-6">
                          <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2 uppercase tracking-widest">
                            <div className="h-1.5 w-6 bg-purple-600 rounded-full" />
                            Tài khoản & Phân quyền
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Tên đăng nhập *</Label>
                              <Input
                                placeholder="nguyen.van.an"
                                className="h-10 rounded-lg border-gray-200 focus:ring-purple-100"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                autoComplete="off"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Mật khẩu *</Label>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="h-10 pr-10 rounded-lg border-gray-200 focus:ring-purple-100"
                                  value={newUser.password}
                                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                  autoComplete="new-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Vai trò *</Label>
                              <Select
                                value={newUser.role}
                                onValueChange={(value: string) => setNewUser({ ...newUser, role: value })}
                              >
                                <SelectTrigger className="h-10 rounded-lg border-gray-200 focus:ring-purple-100">
                                  <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Quản trị viên</SelectItem>
                                  <SelectItem value="production_manager">Quản lý sản xuất</SelectItem>
                                  <SelectItem value="kho_manager">Quản lý kho</SelectItem>
                                  <SelectItem value="staff">Nhân viên</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-500 uppercase">Định mức công việc</Label>
                              <Input
                                type="number"
                                disabled={newUser.role !== "staff"}
                                className="h-10 rounded-lg border-gray-200 focus:ring-purple-100 bg-gray-50 disabled:opacity-50"
                                value={newUser.maxDailyCapacity}
                                onChange={(e) => setNewUser({ ...newUser, maxDailyCapacity: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Activation Switch */}
                        <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-xl border border-purple-100 shadow-sm">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold text-purple-900">Kích hoạt tài khoản</Label>
                            <p className="text-xs text-purple-600/60">Cho phép người dùng truy cập hệ thống ngay lập tức</p>
                          </div>
                          <Switch
                            checked={newUser.isActive}
                            onCheckedChange={(checked) => setNewUser({ ...newUser, isActive: checked })}
                            className="data-[state=checked]:bg-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={resetForm}
                      className="h-10 px-6 font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      onClick={handleAddUser}
                      className="h-10 px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Tạo tài khoản
                    </Button>
                  </div>
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
                                <DropdownMenuItem
                                  onClick={() => toggleUserStatus(user._id, user.isActive)}
                                >
                                  {user.isActive
                                    ? "Vô hiệu hóa"
                                    : "Kích hoạt"}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(user)}>
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

      {/* Modal Xác nhận Xóa Người dùng */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Xác nhận xóa tài khoản
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tài khoản <strong>{userToDelete?.fullName}</strong> ({userToDelete?.username}) không? Hành động này không thể hoàn tác và sẽ xóa bỏ toàn bộ dữ liệu liên quan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

export default withPermission(UsersPage, ["admin"])
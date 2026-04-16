"use client"

import React, { useState, useEffect, useCallback, Fragment } from "react"
import { Plus, Search, MoreVertical, Shield, Warehouse, User as UserIcon, Upload, ChevronLeft, ChevronRight, Factory, Mail, Lock, Phone, MapPin, Calendar, Settings, Briefcase, Info } from "lucide-react"
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
import { getAvatarUrl, cn } from "@/lib/utils"

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
    if (!newUser.name || !newUser.email || !newUser.username || !newUser.password || !newUser.role) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ các trường bắt buộc",
        variant: "destructive",
      })
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
        toast({
          title: "Thành công",
          description: "Tạo tài khoản thành công",
        });
        fetchUsers(searchQuery, roleFilterToValue[roleFilter], currentPage);
        resetForm();
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo tài khoản mới",
        variant: "destructive",
      });
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
                <DialogContent className="w-[98vw] max-w-6xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[95vh]">
                  {/* Header - Optimized Spacing */}
                  <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 px-8 py-6 shrink-0 border-b border-purple-100">
                    <DialogHeader>
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-purple-200">
                          <UserIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-bold text-purple-900 tracking-tight">Thêm tài khoản mới</DialogTitle>
                          <DialogDescription className="text-purple-700/70 text-sm font-medium">
                            Nhập đầy đủ thông tin để khởi tạo thành viên mới trong hệ thống
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>

                  {/* Body - Flexible Grid */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 bg-white">
                    <div className="max-w-5xl mx-auto space-y-12">
                      {/* Avatar & Guidance Row */}
                      <div className="flex flex-col lg:flex-row items-start gap-12 pb-10 border-b border-gray-50">
                        <div className="flex flex-col items-center gap-4 shrink-0 mx-auto lg:mx-0">
                          <div className="relative group">
                            <div className="w-36 h-36 rounded-3xl bg-gray-50 flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-200 group-hover:border-purple-400 transition-all duration-300 shadow-inner">
                              {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <Upload className="h-10 w-10 text-purple-200" />
                              )}
                            </div>
                            <label className="absolute -bottom-2 -right-2 cursor-pointer">
                              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 hover:scale-110 transition-all active:scale-95">
                                <Plus className="h-4.5 w-4.5 stroke-[3px]" />
                              </div>
                            </label>
                          </div>
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">Ảnh đại diện</span>
                        </div>

                        <div className="flex-1 space-y-5">
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <Info className="h-4 w-4 text-purple-500" /> Lưu ý quan trọng
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                            {[
                              { text: "Trường có dấu * là bắt buộc.", color: "text-purple-600" },
                              { text: "Mật khẩu tối thiểu 8 ký tự.", color: "text-gray-500" },
                              { text: "Tên đăng nhập là duy nhất.", color: "text-gray-500" },
                              { text: "Email phải đúng định dạng.", color: "text-gray-500" }
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-xs text-gray-500">
                                <div className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                                <span>{item.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Form Sections */}
                      <div className="space-y-12">
                        {/* Section 1: Thông tin cá nhân */}
                        <div className="space-y-8">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-1 bg-pink-500 rounded-full" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Thông tin cá nhân</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Họ và tên *</Label>
                              <Input
                                placeholder="Nguyễn Văn An"
                                className="h-11 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-50 transition-all"
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email *</Label>
                              <Input
                                type="email"
                                placeholder="email@craftflow.vn"
                                className="h-11 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-50 transition-all"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Số điện thoại</Label>
                              <Input
                                placeholder="+84 9xx xxx xxx"
                                className="h-11 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-50 transition-all"
                                value={newUser.phone}
                                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Ngày sinh</Label>
                              <Input
                                type="date"
                                className="h-11 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-50 transition-all"
                                value={newUser.birthDay}
                                onChange={(e) => setNewUser({ ...newUser, birthDay: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Giới tính</Label>
                              <Select
                                value={newUser.gender}
                                onValueChange={(value: any) => setNewUser({ ...newUser, gender: value })}
                              >
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 focus:ring-purple-50 transition-all">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl">
                                  <SelectItem value="male">Nam</SelectItem>
                                  <SelectItem value="female">Nữ</SelectItem>
                                  <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Địa chỉ</Label>
                              <Input
                                placeholder="123 Đường ABC, Quận 1..."
                                className="h-11 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-50 transition-all"
                                value={newUser.address}
                                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Tài khoản & Bảo mật */}
                        <div className="space-y-8">
                          <div className="flex items-center gap-3">
                            <div className="h-6 w-1 bg-purple-500 rounded-full" />
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Tài khoản & Bảo mật</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-2 lg:col-span-1">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Tên đăng nhập *</Label>
                              <Input
                                placeholder="nguyen.van.an"
                                className="h-11 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-50 transition-all"
                                value={newUser.username}
                                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Mật khẩu *</Label>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="h-11 rounded-xl border-gray-200 focus:border-purple-300 focus:ring-purple-50 transition-all"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Vai trò hệ thống *</Label>
                              <Select
                                value={newUser.role}
                                onValueChange={(value: string) => setNewUser({ ...newUser, role: value })}
                              >
                                <SelectTrigger className="h-11 rounded-xl border-gray-200 focus:ring-purple-50 transition-all">
                                  <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl">
                                  <SelectItem value="admin">Quản trị viên</SelectItem>
                                  <SelectItem value="production_manager">Quản lý sản xuất</SelectItem>
                                  <SelectItem value="kho_manager">Quản lý kho</SelectItem>
                                  <SelectItem value="staff">Nhân viên</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                              <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Định mức công việc</Label>
                              <Input
                                type="number"
                                disabled={newUser.role !== "staff"}
                                className="h-11 rounded-xl border-gray-200 focus:ring-purple-50 bg-gray-50/50 disabled:opacity-40 transition-all"
                                value={newUser.maxDailyCapacity}
                                onChange={(e) => setNewUser({ ...newUser, maxDailyCapacity: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Activation Switch - Compact & Clean */}
                        <div className="flex items-center justify-between p-6 bg-purple-50/30 rounded-2xl border border-purple-100 shadow-sm transition-all hover:bg-purple-50/50">
                          <div className="space-y-1">
                            <Label className="text-sm font-bold text-purple-900">Kích hoạt tài khoản người dùng</Label>
                            <p className="text-xs text-purple-600/60 font-medium">Cho phép thành viên truy cập và làm việc trên hệ thống ngay lập tức</p>
                          </div>
                          <Switch
                            checked={newUser.isActive}
                            onCheckedChange={(checked: boolean) => setNewUser({ ...newUser, isActive: checked })}
                            className="data-[state=checked]:bg-purple-600 scale-110 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer - Solid & Fixed */}
                  <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={resetForm}
                      className="h-11 px-8 font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded-xl transition-all"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      onClick={handleAddUser}
                      className="h-11 px-10 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-[0_4px_12px_rgba(147,51,234,0.3)] hover:shadow-[0_6px_20px_rgba(147,51,234,0.4)] transition-all active:scale-95 flex items-center gap-2.5"
                    >
                      <Plus className="h-5 w-5 stroke-[3px]" />
                      Tạo tài khoản mới
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
                      <PaginationLink
                        aria-label="Trang trước"
                        size="default"
                        onClick={() => currentPage > 1 && setCurrentPage((prev) => prev - 1)}
                        className={cn(
                          "gap-1 px-2.5 sm:pl-2.5 cursor-pointer",
                          currentPage === 1 && "pointer-events-none opacity-50"
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:block">Trước</span>
                      </PaginationLink>
                    </PaginationItem>

                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === pagination.pages ||
                          Math.abs(page - currentPage) <= 1
                        )
                      })
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1
                        return (
                          <Fragment key={page}>
                            {showEllipsis && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                isActive={currentPage === page}
                                onClick={() => setCurrentPage(page)}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </Fragment>
                        )
                      })}

                    <PaginationItem>
                      <PaginationLink
                        aria-label="Trang sau"
                        size="default"
                        onClick={() => currentPage < pagination.pages && setCurrentPage((prev) => prev + 1)}
                        className={cn(
                          "gap-1 px-2.5 sm:pr-2.5 cursor-pointer",
                          currentPage === pagination.pages && "pointer-events-none opacity-50"
                        )}
                      >
                        <span className="hidden sm:block">Sau</span>
                        <ChevronRight className="h-4 w-4" />
                      </PaginationLink>
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

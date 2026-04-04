"use client"

import { useState } from "react"
import { Plus, Search, MoreVertical, Shield, Warehouse, User as UserIcon } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { systemUsers } from "@/lib/mock-data"
import type { SystemUser, SystemUserRole } from "@/lib/types"

const roleFilters = ["All", "Admin", "Warehouse", "Staff"] as const
type RoleFilter = (typeof roleFilters)[number]

const roleIcons: Record<SystemUserRole, typeof Shield> = {
  Admin: Shield,
  Warehouse: Warehouse,
  Staff: UserIcon,
}

const roleColors: Record<SystemUserRole, string> = {
  Admin: "text-red-600",
  Warehouse: "text-amber-600",
  Staff: "text-blue-600",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All")
  const [users, setUsers] = useState<SystemUser[]>(systemUsers)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Staff" as SystemUserRole,
  })

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "All" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return
    
    const user: SystemUser = {
      id: String(users.length + 1),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: "Hoạt động",
      workload: newUser.role === "Staff" ? 0 : undefined,
      createdAt: new Date().toISOString().split("T")[0],
    }
    
    setUsers([...users, user])
    setNewUser({ name: "", email: "", role: "Staff" })
    setIsAddDialogOpen(false)
  }

  const toggleUserStatus = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId
          ? { ...user, status: user.status === "Hoạt động" ? "Vô hiệu hóa" : "Hoạt động" }
          : user
      )
    )
  }

  return (
    <AppShell
      title="User Management"
      subtitle="Manage staff and warehouse accounts"
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
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Thêm tài khoản mới</DialogTitle>
                    <DialogDescription>
                      Điền thông tin để tạo tài khoản người dùng mới
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Họ và tên</Label>
                      <Input
                        id="name"
                        placeholder="Nguyễn Văn A"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
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
                    <div className="space-y-2">
                      <Label htmlFor="role">Vai trò</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value: SystemUserRole) =>
                          setNewUser({ ...newUser, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Warehouse">Warehouse</SelectItem>
                          <SelectItem value="Staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
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
                  {filteredUsers.map((user) => {
                    const RoleIcon = roleIcons[user.role]
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(user.name)}`}
                            >
                              {getInitials(user.name)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon
                              className={`h-4 w-4 ${roleColors[user.role]}`}
                            />
                            <span className="text-sm font-medium">
                              {user.role}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === "Hoạt động"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              user.status === "Hoạt động"
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role === "Staff" ? (
                            <div className="flex items-center gap-3">
                              <Progress
                                value={user.workload || 0}
                                className="h-2 w-24"
                                style={
                                  {
                                    "--progress-background":
                                      (user.workload || 0) > 70
                                        ? "#ef4444"
                                        : "#22c55e",
                                  } as React.CSSProperties
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {user.workload || 0}%
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
                                onClick={() => toggleUserStatus(user.id)}
                              >
                                {user.status === "Hoạt động"
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
                  })}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserIcon className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium text-muted-foreground">
                    Không tìm thấy người dùng
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

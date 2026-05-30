"use client"

import { useState } from "react"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  LogOut,
  Shield,
  Camera,
  ClipboardList,
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react"
import Link from "next/link"

const userProfile = {
  name: "Nguyễn Văn A",
  email: "nguyenvana@craftflow.vn",
  phone: "0901234567",
  role: "Quản lý sản xuất",
  department: "Phòng Sản xuất",
  address: "123 Đường Láng, Đống Đa, Hà Nội",
  joinDate: "01/01/2024",
  employeeId: "NV-MGR-001",
}

const recentActivities = [
  {
    id: 1,
    type: "order_created",
    icon: ClipboardList,
    iconBg: "bg-[#2B8BE8]/10",
    iconColor: "text-[#2B8BE8]",
    title: "Tạo lệnh sản xuất mới",
    description: "Đơn PO-2024-010 - Giỏ tre đan tay",
    time: "2 giờ trước",
  },
  {
    id: 2,
    type: "order_approved",
    icon: CheckCircle,
    iconBg: "bg-[#4A9C6B]/10",
    iconColor: "text-[#4A9C6B]",
    title: "Tạo phiếu nhập kho",
    description: "Phiếu NKTP-2026-140 cho đơn PO-2024-008",
    time: "5 giờ trước",
  },

  {
    id: 3,
    type: "product_updated",
    icon: Package,
    iconBg: "bg-[#F4C542]/10",
    iconColor: "text-[#F4C542]",
    title: "Cập nhật sản phẩm",
    description: "Cập nhật định mức nguyên vật liệu cho SP-001",
    time: "1 ngày trước",
  },
  {
    id: 4,
    type: "issue_resolved",
    icon: AlertTriangle,
    iconBg: "bg-[#E04E4E]/10",
    iconColor: "text-[#E04E4E]",
    title: "Xử lý báo cáo hao hụt",
    description: "Đã giải quyết báo cáo #WR-003 về lỗi nguyên liệu",
    time: "2 ngày trước",
  },
  {
    id: 5,
    type: "order_completed",
    icon: CheckCircle,
    iconBg: "bg-[#4A9C6B]/10",
    iconColor: "text-[#4A9C6B]",
    title: "Hoàn thành lệnh sản xuất",
    description: "Đơn PO-2024-005 đã hoàn thành đúng tiến độ",
    time: "3 ngày trước",
  },
]

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(userProfile)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSave = () => {
    setIsEditing(false)
    // Save logic here
  }

  const handlePasswordSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Vui lòng nhập đầy đủ thông tin mật khẩu")
      return
    }

    if (newPassword !== confirmPassword) {
      alert("Mật khẩu mới và xác nhận mật khẩu không khớp")
      return
    }

    alert("Đổi mật khẩu thành công")
    setIsPasswordDialogOpen(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <DashboardLayout title="Hồ sơ cá nhân">
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="p-6 bg-card border-border">
            <div className="text-center space-y-4">
              {/* Avatar */}
              <div className="relative inline-block">
                <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center mx-auto">
                  <span className="text-3xl font-bold text-primary-foreground">
                    {userProfile.name.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-lg hover:bg-secondary/90 transition-colors">
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-card-foreground">{userProfile.name}</h2>
                <p className="text-sm text-muted-foreground">{userProfile.role}</p>
                <p className="text-xs text-muted-foreground mt-1">{userProfile.employeeId}</p>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-border"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa hồ sơ"}
                </Button>
                <Link href="/" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Profile Details */}
          <Card className="p-6 bg-card border-border lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">
                  Thông tin cá nhân
                </h3>
                <p className="text-sm text-muted-foreground">
                  Quản lý thông tin tài khoản của bạn
                </p>
              </div>
              {isEditing && (
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Lưu thay đổi
                </Button>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  Họ và tên
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="text-card-foreground font-medium">{formData.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <p className="text-card-foreground font-medium">{formData.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Số điện thoại
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <p className="text-card-foreground font-medium">{formData.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Vai trò
                </Label>
                <p className="text-card-foreground font-medium">{formData.role}</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Địa chỉ
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                ) : (
                  <p className="text-card-foreground font-medium">{formData.address}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Ngày vào làm
                </Label>
                <p className="text-card-foreground font-medium">{formData.joinDate}</p>
              </div>
            </div>
          </Card>

          {/* Security Section */}
          <Card className="p-6 bg-card border-border lg:col-span-3">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Bảo mật
              </h3>
              <p className="text-sm text-muted-foreground">
                Quản lý mật khẩu và bảo mật tài khoản
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg max-w-md">
              <h4 className="font-medium text-card-foreground mb-1">Đổi mật khẩu</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Cập nhật mật khẩu định kỳ để bảo vệ tài khoản
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                Đổi mật khẩu
              </Button>
            </div>
          </Card>

          {/* Recent Activities Section */}
          <Card className="p-6 bg-card border-border lg:col-span-3">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Hoạt động gần đây
              </h3>
              <p className="text-sm text-muted-foreground">
                Các hoạt động bạn đã thực hiện trong hệ thống
              </p>
            </div>

            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const IconComponent = activity.icon
                return (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 pb-4 ${index !== recentActivities.length - 1 ? "border-b border-border" : ""
                      }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${activity.iconBg} flex-shrink-0`}>
                      <IconComponent className={`h-5 w-5 ${activity.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-card-foreground">{activity.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{activity.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap flex-shrink-0">
                          {activity.time}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <Button variant="outline" className="border-border">
                Xem tất cả hoạt động
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-lg border-0 bg-transparent p-0 shadow-none">
          <div className="rounded-[28px] bg-white p-8 shadow-[0_25px_80px_rgba(0,0,0,0.18)]">
            <DialogHeader className="mb-8 flex flex-row items-start justify-between space-y-0">
              <DialogTitle className="text-2xl font-semibold leading-tight text-card-foreground">
                Đổi mật khẩu
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2.5">
                <Label className="text-base font-medium text-card-foreground">Mật khẩu hiện tại</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="h-14 rounded-2xl border-border text-base placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-base font-medium text-card-foreground">Mật khẩu mới</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="h-14 rounded-2xl border-border text-base placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2.5">
                <Label className="text-base font-medium text-card-foreground">Xác nhận mật khẩu mới</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="h-14 rounded-2xl border-border text-base placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl border-border px-6 text-base"
                  onClick={() => setIsPasswordDialogOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  className="h-12 rounded-2xl bg-[#8A6648] px-7 text-base text-white hover:bg-[#73533a]"
                  onClick={handlePasswordSubmit}
                >
                  Đổi mật khẩu
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}



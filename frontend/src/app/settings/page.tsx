"use client"

import { useState } from "react"
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Save,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { currentUser } from "@/lib/mock-data"

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1000)
  }

  return (
    <AppShell title="Cài đặt" subtitle="Chào mừng đến với CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Cài đặt</h2>
            <p className="text-sm text-muted-foreground">
              Quản lý tài khoản và tùy chọn ứng dụng
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Hồ sơ
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Thông báo
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Bảo mật
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Database className="h-4 w-4" />
              Hệ thống
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin  cá nhân</CardTitle>
                <CardDescription>
                  Cập nhật thông tin cá nhân và tùy chọn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      Tải ảnh lên
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG or GIF. Tối đa 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và tên</Label>
                    <Input id="name" defaultValue={currentUser.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={currentUser.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input id="phone" placeholder="0123 456 789" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Vai trò</Label>
                    <Input id="role" defaultValue={currentUser.role} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Tùy chọn thông báo</CardTitle>
                <CardDescription>
                  Chọn cách bạn muốn được thông báo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Cảnh báo tồn kho</p>
                      <p className="text-sm text-muted-foreground">
                        Nhận thông báo khi nguyên liệu sắp hết 
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Cập nhật sản xuất</p>
                      <p className="text-sm text-muted-foreground">
                        Thông báo về thay đổi trạng thái sản xuất
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Báo cáo hàng ngày</p>
                      <p className="text-sm text-muted-foreground">
                        Nhận báo cáo tổng kết hàng ngày
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Thông báo email</p>
                      <p className="text-sm text-muted-foreground">
                        Gửi thông báo đến email của bạn
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt bảo mật</CardTitle>
                <CardDescription>
                  Quản lý mật khẩu và tùy chọn bảo mật
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Xác thực hai lớp</p>
                      <p className="text-sm text-muted-foreground">
                        Thêm một lớp bảo mật bổ sung
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Thời gian hết phiên</p>
                      <p className="text-sm text-muted-foreground">
                        Tự động đăng xuất sau thời gian không hoạt động
                      </p>
                    </div>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 phút</SelectItem>
                        <SelectItem value="30">30 phút</SelectItem>
                        <SelectItem value="60">1 giờ</SelectItem>
                        <SelectItem value="never">Không bao giờ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tùy chọn hệ thống</CardTitle>
                  <CardDescription>
                    Cấu hình cài đặt chung của hệ thống
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ngôn ngữ</Label>
                    <Select defaultValue="vi">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị tiền tệ</Label>
                    <Select defaultValue="vnd">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vnd">VND - Vietnamese Dong</SelectItem>
                        <SelectItem value="usd">USD - US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Định dạng ngày</Label>
                    <Select defaultValue="dmy">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quản lý dữ liệu</CardTitle>
                  <CardDescription>
                    Sao lưu và xuất dữ liệu của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="font-medium">Xuất dữ liệu</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tải xuống tất cả dữ liệu của bạn ở định dạng CSV
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Xuất tất cả dữ liệu
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="font-medium">Sao lưu cài đặt</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sao lưu hàng ngày tự động đang được bật
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#4A7C23]" />
                      <span className="text-sm text-muted-foreground">
                        Sao lưu cuối cùng: Hôm nay lúc 03:00 AM
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}

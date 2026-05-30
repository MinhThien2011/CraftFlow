'use client'

import { 
  PackagePlus, 
  PackageMinus, 
  ClipboardCheck, 
  AlertTriangle,
  Clipboard,
  BarChart3,
  MapPin,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const quickActions = [
  {
    title: 'Tạo Phiếu Nhập Kho',
    description: 'Nhập nguyên vật liệu mới',
    icon: PackagePlus,
    href: '/receiving',
    color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
  },
  {
    title: 'Duyệt Phiếu Xuất',
    description: 'Xác nhận xuất kho bán hàng',
    icon: PackageMinus,
    href: '/issuing',
    color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
  },
  {
    title: 'Duyệt Yêu Cầu VL',
    description: 'Duyệt requisition vật liệu',
    icon: ClipboardCheck,
    href: '/requisitions/pending',
    color: 'bg-amber-50 text-amber-600 hover:bg-amber-100'
  },
  {
    title: 'Xử Lý Hàng Lỗi',
    description: 'Defect & RMA Processing',
    icon: AlertTriangle,
    href: '/defects/internal',
    color: 'bg-red-50 text-red-600 hover:bg-red-100'
  },
  {
    title: 'Kiểm Kê Kho',
    description: 'Cycle Count / Physical Count',
    icon: Clipboard,
    href: '/inventory/stocktake',
    color: 'bg-purple-50 text-purple-600 hover:bg-purple-100'
  },
  {
    title: 'Báo Cáo Kho',
    description: 'Nhập - Xuất - Tồn',
    icon: BarChart3,
    href: '/reports/inventory',
    color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
  },
  {
    title: 'Quản Lý Vị Trí',
    description: 'Sơ đồ kệ & vị trí lưu trữ',
    icon: MapPin,
    href: '/locations/materials',
    color: 'bg-teal-50 text-teal-600 hover:bg-teal-100'
  },
  {
    title: 'Cài Đặt Kho',
    description: 'Ngưỡng tồn kho & cấu hình',
    icon: Settings,
    href: '/settings',
    color: 'bg-stone-100 text-stone-600 hover:bg-stone-200'
  }
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Thao tác nhanh</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Button
                variant="ghost"
                className={`w-full h-auto flex-col gap-2 p-4 ${action.color} transition-all`}
              >
                <action.icon className="size-6" />
                <div className="text-center">
                  <p className="text-xs font-medium leading-tight">{action.title}</p>
                  <p className="text-[10px] opacity-70 leading-tight mt-0.5">{action.description}</p>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

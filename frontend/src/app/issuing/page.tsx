'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import {
  PackageMinus, Search, Eye, Check, FileSignature,
  Truck, ClipboardList, CheckCircle2
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { issuingNotes as initialNotes } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────
type IssueStatus = 'pending' | 'picking' | 'completed' | 'partial'

const STATUS_COLOR: Record<IssueStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  picking:   'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  partial:   'bg-purple-100 text-purple-700',
}
const STATUS_LABEL: Record<IssueStatus, string> = {
  pending:   'Chờ duyệt',
  picking:   'Đang lấy hàng',
  completed: 'Hoàn thành',
  partial:   'Xuất một phần',
}

// ── Main ──────────────────────────────────────────────────────
export default function IssuingPage() {
  const [notes, setNotes]         = useState(initialNotes)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // detail dialog
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [justApproved, setJustApproved] = useState(false)

  // luôn lấy bản mới nhất từ state
  const currentNote = notes.find((n) => n.id === selectedId) ?? null

  const updateStatus = (id: string, status: IssueStatus) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status } : n)))
  }

  // mở dialog — dùng chung cho cả nút Xem lẫn nút Duyệt
  const openDetail = (id: string) => {
    setSelectedId(id)
    setJustApproved(false)
    setDialogOpen(true)
  }

  const filtered = notes.filter((note) => {
    const matchSearch =
      note.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchTab = activeTab === 'all' || note.status === activeTab
    return matchSearch && matchTab
  })

  const stats = {
    total:     notes.length,
    pending:   notes.filter((n) => n.status === 'pending').length,
    picking:   notes.filter((n) => n.status === 'picking').length,
    completed: notes.filter((n) => n.status === 'completed').length,
  }

  // ── Shared table ─────────────────────────────────────────────
  const NoteTable = ({ items }: { items: typeof notes }) => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã phiếu</TableHead>
            <TableHead>Khách hàng</TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead>Người xuất</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Thời gian</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                Không có phiếu nào
              </TableCell>
            </TableRow>
          ) : items.map((note) => (
            <TableRow key={note.id}>
              <TableCell className="font-medium">{note.code}</TableCell>
              <TableCell>{note.customerName}</TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  {note.products.map((p, i) => (
                    <p key={i} className="text-sm">{p.name} × {p.quantity} {p.unit}</p>
                  ))}
                </div>
              </TableCell>
              <TableCell>{note.issuedBy}</TableCell>
              <TableCell>
                <Badge className={STATUS_COLOR[note.status as IssueStatus]}>
                  {STATUS_LABEL[note.status as IssueStatus]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(note.issuedAt, 'HH:mm dd/MM', { locale: vi })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {/* Nút Xem — mọi trạng thái */}
                  <Button
                    variant="ghost" size="icon" className="size-8"
                    title="Xem chi tiết"
                    onClick={() => openDetail(note.id)}
                  >
                    <Eye className="size-4" />
                  </Button>

                  {/* Nút Duyệt nhanh — chỉ pending, mở cùng modal */}
                  {note.status === 'pending' && (
                    <Button
                      variant="ghost" size="icon"
                      className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      title="Xem & duyệt"
                      onClick={() => openDetail(note.id)}
                    >
                      <Check className="size-4" />
                    </Button>
                  )}

                  {/* Nút ký nhanh — chỉ picking, mở cùng modal */}
                  {note.status === 'picking' && (
                    <Button
                      variant="ghost" size="icon"
                      className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="Xem & ký xác nhận"
                      onClick={() => openDetail(note.id)}
                    >
                      <FileSignature className="size-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <AppShell title="Quản lý xuất kho" subtitle="Duyệt và xử lý phiếu xuất kho">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Tổng phiếu xuất',    value: stats.total,     bg: 'bg-primary/10',  Icon: PackageMinus,  ic: 'text-primary' },
            { label: 'Chờ duyệt',          value: stats.pending,   bg: 'bg-amber-100',   Icon: ClipboardList, ic: 'text-amber-600' },
            { label: 'Đang lấy hàng',      value: stats.picking,   bg: 'bg-blue-100',    Icon: Truck,         ic: 'text-blue-600' },
            { label: 'Hoàn thành hôm nay', value: stats.completed, bg: 'bg-emerald-100', Icon: Check,         ic: 'text-emerald-600' },
          ].map(({ label, value, bg, Icon, ic }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg ${bg} p-3`}>
                    <Icon className={`size-5 ${ic}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs + table */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList>
                    <TabsTrigger value="all">
                      Tất cả
                      <Badge variant="secondary" className="ml-1.5 text-xs">{notes.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Chờ duyệt
                      {stats.pending > 0 && (
                        <Badge className="ml-1.5 text-xs bg-amber-100 text-amber-700 hover:bg-amber-100">
                          {stats.pending}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="picking">
                      Đang lấy hàng
                      {stats.picking > 0 && (
                        <Badge className="ml-1.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                          {stats.picking}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="completed">Hoàn thành</TabsTrigger>
                  </TabsList>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>

              {['all', 'pending', 'picking', 'completed'].map((tab) => (
                <TabsContent key={tab} value={tab} className="p-6 pt-4">
                  <NoteTable items={filtered} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ── Detail + Approve Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setJustApproved(false) }}>
        <DialogContent className="sm:max-w-150">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu xuất {currentNote?.code}</DialogTitle>
            <DialogDescription>Thông tin chi tiết phiếu xuất kho</DialogDescription>
          </DialogHeader>

          {currentNote && (
            <>
              {/* Banner sau khi duyệt/ký */}
              {justApproved && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {currentNote.status === 'picking'
                    ? 'Phiếu đã được duyệt — chuyển sang Đang lấy hàng'
                    : 'Đã ký xác nhận xuất kho thành công'
                  }
                </div>
              )}

              <div className="space-y-4 py-2">
                {/* Thông tin chung */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Khách hàng</Label>
                    <p className="font-medium mt-0.5">{currentNote.customerName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Người xuất</Label>
                    <p className="font-medium mt-0.5">{currentNote.issuedBy}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                    <div className="mt-1">
                      <Badge className={STATUS_COLOR[currentNote.status as IssueStatus]}>
                        {STATUS_LABEL[currentNote.status as IssueStatus]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Thời gian</Label>
                    <p className="font-medium mt-0.5">
                      {format(currentNote.issuedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                </div>

                {/* Pick list */}
                <div>
                  <Label className="text-xs text-muted-foreground">Pick List</Label>
                  <div className="mt-2 rounded-lg border divide-y">
                    {currentNote.products.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <Checkbox
                          id={`product-${currentNote.id}-${i}`}
                          defaultChecked={currentNote.status === 'completed'}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`product-${currentNote.id}-${i}`}
                            className="font-medium cursor-pointer"
                          >
                            {p.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Số lượng: {p.quantity} {p.unit}
                          </p>
                        </div>
                        {currentNote.status === 'picking' && (
                          <Badge variant="outline">Vị trí: D1-05</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer — chỉ hiện khi còn cần hành động */}
              {(currentNote.status === 'pending' || currentNote.status === 'picking') && !justApproved && (
                <DialogFooter className="gap-2">
                  {currentNote.status === 'pending' && (
                    <Button variant="outline">
                      <ClipboardList className="mr-2 size-4" />
                      Tạo Pick List
                    </Button>
                  )}
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const next: IssueStatus =
                        currentNote.status === 'pending' ? 'picking' : 'completed'
                      updateStatus(currentNote.id, next)
                      setJustApproved(true)
                    }}
                  >
                    <FileSignature className="mr-2 size-4" />
                    {currentNote.status === 'pending' ? 'Duyệt xuất kho' : 'Ký xác nhận xuất'}
                  </Button>
                </DialogFooter>
              )}

              {/* Footer sau khi đã duyệt/ký */}
              {justApproved && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Đóng</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
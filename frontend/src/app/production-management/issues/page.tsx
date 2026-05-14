"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardLayout } from "@/features/production/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Package,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { Issue, filters, mockIssues, statusConfig } from "./mock"

const ProcessIssueDialog = dynamic(() => import('./components/process-issue-dialog').then(m => m.ProcessIssueDialog), {
  ssr: false
})

const CustomPagination = ({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Hiển thị {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} / {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => onChange(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function IssuesPage() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [processStatus, setProcessStatus] = useState("")
  const [processNote, setProcessNote] = useState("")

  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // Calculate dynamic counts
  const filterCounts = useMemo(() => {
    return {
      all: mockIssues.length,
      pending: mockIssues.filter(i => i.status === "pending").length,
      processing: mockIssues.filter(i => i.status === "processing").length,
      resolved: mockIssues.filter(i => i.status === "resolved").length,
    }
  }, [])

  const filteredIssues = useMemo(() => {
    return mockIssues.filter((issue) => {
      const matchesFilter = activeFilter === "all" || issue.status === activeFilter
      const matchesSearch =
        issue.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.reporter.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [activeFilter, searchQuery])

  const paginatedIssues = useMemo(() => {
    return filteredIssues.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  }, [filteredIssues, page])

  // Reset page when filter or search changes
  useEffect(() => { setPage(1) }, [activeFilter, searchQuery])

  const handleOpenProcessDialog = useCallback((issue: Issue) => {
    setSelectedIssue(issue)
    setProcessStatus(issue.status)
    setProcessNote(issue.note || "")
    setIsProcessDialogOpen(true)
  }, [])

  const handleSaveProcess = useCallback((issueId: string, status: string, note: string) => {
    toast.success(`Đã cập nhật vấn đề ${issueId}`)
    // Thực tế sẽ gọi Update API ở đây, sau đó refetch
    setIsProcessDialogOpen(false)
    setSelectedIssue(null)
  }, [])

  return (
    <DashboardLayout title="Báo cáo hao hụt & Vấn đề">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <Clock className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{filterCounts.pending}</p>
                <p className="text-sm text-muted-foreground">Chờ xử lý</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <Package className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{filterCounts.processing}</p>
                <p className="text-sm text-muted-foreground">Đang xử lý</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EBE3D9]">
                <CheckCircle className="h-5 w-5 text-[#7A5C43]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{filterCounts.resolved}</p>
                <p className="text-sm text-muted-foreground">Đã giải quyết</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Header Actions */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm báo cáo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
                }`}
            >
              {filter.label}
              <span className="ml-2 opacity-70">({filterCounts[filter.id as keyof typeof filterCounts]})</span>
            </button>
          ))}
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {paginatedIssues.map((issue) => (
            <Card key={issue.id} className="p-6 bg-card border-border">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`${statusConfig[issue.status as keyof typeof statusConfig].color} border-0`}
                    >
                      {statusConfig[issue.status as keyof typeof statusConfig].label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{issue.id}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{issue.createdAt}</span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-card-foreground">{issue.type}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{issue.product}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{issue.reporter}</span>
                    </div>
                    <div className="flex items-center gap-1 text-destructive font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Hao hụt: {issue.quantity}</span>
                    </div>
                  </div>

                  {issue.note && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Ghi chú:</span> {issue.note}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="border-border shrink-0"
                  onClick={() => handleOpenProcessDialog(issue)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Xử lý
                </Button>
              </div>
            </Card>
          ))}
          <CustomPagination page={page} total={filteredIssues.length} pageSize={ITEMS_PER_PAGE} onChange={setPage} />
        </div>
      </div>

      {/* Process Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">
              Xử lý vấn đề {selectedIssue?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-medium text-card-foreground">{selectedIssue.type}</p>
                <p className="text-sm text-muted-foreground">{selectedIssue.description}</p>
                <p className="text-sm text-destructive font-medium">
                  Hao hụt: {selectedIssue.quantity}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cập nhật trạng thái</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
                  value={processStatus}
                  onChange={(e) => setProcessStatus(e.target.value)}
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="resolved">Đã giải quyết</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Ghi chú xử lý</Label>
                <Textarea
                  placeholder="Nhập ghi chú về cách xử lý vấn đề..."
                  rows={3}
                  value={processNote}
                  onChange={(e) => setProcessNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                  Hủy
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => handleSaveProcess(selectedIssue.id, processStatus, processNote)}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

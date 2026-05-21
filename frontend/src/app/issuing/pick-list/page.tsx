"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, CheckCircle2, Clock3, Loader2, Package, PackageCheck, Search, Truck } from "lucide-react"
import { toast } from "sonner"

import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { slipApi, Slip } from "@/api/slip.api"

const PICK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received: { label: "Đang soạn hàng", color: "bg-blue-100 text-blue-700" },
}

type PickQuantities = Record<string, number>
type PickDrafts = Record<string, PickQuantities>

function getSlipItemKey(item: Slip["items"][number], index: number) {
  return item._id || item.id || item.itemCode || String(index)
}

function getPickedStats(slip: Slip | null, pickedQuantities: PickQuantities) {
  if (!slip || slip.items.length === 0) return { picked: 0, total: 0, percent: 0 }

  const picked = slip.items.filter((item, index) => {
    const key = getSlipItemKey(item, index)
    return (pickedQuantities[key] || 0) >= (item.quantity?.requested || 0)
  }).length

  return {
    picked,
    total: slip.items.length,
    percent: Math.round((picked / slip.items.length) * 100),
  }
}

function getSlipCategoryLabel(slip: Slip): { label: string; className: string } {
  const isProduct = slip.items.some((item) => !!item.product)
  return isProduct
    ? { label: 'Thành phẩm', className: 'bg-purple-100 text-purple-700' }
    : { label: 'Vật tư', className: 'bg-amber-100 text-amber-700' }
}

function getSlipCategoryPath(slip: Slip) {
  return slip.items.some((item) => !!item.product) ? "/issuing/products" : "/issuing/materials"
}


function PickListPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const focusedSlipId = searchParams.get("slipId")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSlipId, setSelectedSlipId] = useState<string | null>(focusedSlipId)
  const [pickDrafts, setPickDrafts] = useState<PickDrafts>({})

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["slips", "pick-list", searchQuery],
    queryFn: () => slipApi.getSlips({
      type: "export",
      status: "received",
      page: 1,
      limit: 100,
      search: searchQuery,
      withTotal: false,
    }),
    staleTime: 5000,
  })

  const responseData = data?.data?.data || data?.data || data
  const slips: Slip[] = responseData?.slips || []

  const selectedSlip = useMemo(() => {
    if (slips.length === 0) return null
    return slips.find((slip) => slip._id === selectedSlipId) || slips[0]
  }, [selectedSlipId, slips])

  useEffect(() => {
    if (!focusedSlipId) return
    setSelectedSlipId(focusedSlipId)
  }, [focusedSlipId])

  useEffect(() => {
    if (!selectedSlip) {
      return
    }

    setPickDrafts((current) => {
      if (current[selectedSlip._id]) return current
      return {
        ...current,
        [selectedSlip._id]: Object.fromEntries(
          selectedSlip.items.map((item, index) => [
            getSlipItemKey(item, index),
            item.quantity?.actual || 0,
          ])
        ),
      }
    })
  }, [selectedSlip])

  const selectedPickedQuantities = selectedSlip ? (pickDrafts[selectedSlip._id] || {}) : {}

  const selectedStats = useMemo(
    () => getPickedStats(selectedSlip, selectedPickedQuantities),
    [selectedPickedQuantities, selectedSlip]
  )

  const totalItems = slips.reduce((sum, slip) => sum + slip.items.length, 0)
  const fullyPickedSlips = slips.filter((slip) => getPickedStats(
    slip,
    Object.fromEntries(slip.items.map((item, index) => [
      getSlipItemKey(item, index),
      item.quantity?.actual || 0,
    ]))
  ).percent === 100).length

  const completePickMutation = useMutation({
    mutationFn: (slip: Slip) => slipApi.updateSlipStatus(slip._id, {
      status: "inspecting",
      items: slip.items.map((item, index) => {
        const materialId = typeof item.material === 'object' && item.material ? ((item.material as any)._id || (item.material as any).id) : item.material;
        const productId = typeof item.product === 'object' && item.product ? ((item.product as any)._id || (item.product as any).id) : item.product;
        return {
          itemCode: item.itemCode,
          material: materialId || undefined,
          product: productId || undefined,
          actualQuantity: (pickDrafts[slip._id] || {})[getSlipItemKey(item, index)] || 0,
          itemNote: item.itemNote || "",
        };
      }),
    }),
    onSuccess: (_res, slip) => {
      queryClient.invalidateQueries({ queryKey: ["slips"] })
      toast.success("Đã xác nhận Pick List, chuyển phiếu sang bước kiểm kê")
      router.push(`${getSlipCategoryPath(slip)}?slipId=${slip._id}`)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Không thể xác nhận Pick List")
    },
  })

  const handlePickToggle = (item: Slip["items"][number], index: number, checked: boolean) => {
    const key = getSlipItemKey(item, index)
    if (!selectedSlip) return
    setPickDrafts((current) => ({
      ...current,
      [selectedSlip._id]: {
        ...(current[selectedSlip._id] || {}),
        [key]: checked ? (item.quantity?.requested || 0) : 0,
      },
    }))
  }

  const handlePickQuantityChange = (item: Slip["items"][number], index: number, value: string) => {
    const key = getSlipItemKey(item, index)
    const parsed = Number(value)
    const quantity = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
    if (!selectedSlip) return
    setPickDrafts((current) => ({
      ...current,
      [selectedSlip._id]: {
        ...(current[selectedSlip._id] || {}),
        [key]: quantity,
      },
    }))
  }

  const canCompleteSelectedPick = !!selectedSlip && selectedStats.total > 0 && selectedStats.percent === 100

  return (
    <AppShell title="Pick List" subtitle="Soạn hàng cho các phiếu xuất đang chờ lấy">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Truck className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phiếu đang soạn</p>
                <p className="text-2xl font-bold">{slips.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Package className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mặt hàng cần pick</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <PackageCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phiếu đã đủ pick</p>
                <p className="text-2xl font-bold">{fullyPickedSlips}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Clock3 className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phiếu đang chọn</p>
                <p className="text-2xl font-bold">{selectedStats.percent}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader className="space-y-4 border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Danh sách phiếu</CardTitle>
                <Badge variant="outline">{slips.length}</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm mã phiếu..."
                  className="pl-9"
                />
              </div>
              <Tabs value="received">
                <TabsList className="w-full">
                  <TabsTrigger value="received" className="flex-1">Đang soạn</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {(error as any)?.message || "Không thể tải Pick List"}
                </div>
              ) : slips.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Không có phiếu nào đang soạn hàng
                </div>
              ) : slips.map((slip) => {
                const stats = getPickedStats(slip, pickDrafts[slip._id] || Object.fromEntries(slip.items.map((item, index) => [
                  getSlipItemKey(item, index),
                  item.quantity?.actual || 0,
                ])))
                const isSelected = selectedSlip?._id === slip._id

                return (
                  <button
                    key={slip._id}
                    type="button"
                    onClick={() => setSelectedSlipId(slip._id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-primary">{slip.slipNumber}</span>
                      <Badge className={PICK_STATUS_CONFIG.received.color}>{PICK_STATUS_CONFIG.received.label}</Badge>
                    </div>
                    <div className="mb-2 flex items-center gap-1.5">
                      {(() => { const cat = getSlipCategoryLabel(slip); return <Badge className={`${cat.className} border-none text-[10px] h-4 px-1.5`}>{cat.label}</Badge> })()}
                      <p className="truncate text-xs text-muted-foreground">{slip.personName || slip.reason || 'Phiếu xuất kho'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={stats.percent} className="h-2" />
                      <span className="w-9 text-right text-xs text-muted-foreground">{stats.percent}%</span>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            {selectedSlip ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{selectedSlip.slipNumber}</CardTitle>
                        <Badge className={PICK_STATUS_CONFIG.received.color}>{PICK_STATUS_CONFIG.received.label}</Badge>
                        {(() => { const cat = getSlipCategoryLabel(selectedSlip); return <Badge className={`${cat.className} border-none`}>{cat.label}</Badge> })()}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedSlip.personName || selectedSlip.reason || 'Phiếu xuất kho'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="min-w-28 text-right">
                        <p className="text-xs text-muted-foreground">Tiến độ</p>
                        <p className="text-lg font-bold">{selectedStats.picked}/{selectedStats.total}</p>
                      </div>
                      <Button
                        disabled={!canCompleteSelectedPick || completePickMutation.isPending}
                        onClick={() => completePickMutation.mutate(selectedSlip)}
                        className="gap-2"
                      >
                        {completePickMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Xác nhận Pick List
                      </Button>
                    </div>
                  </div>
                  <Progress value={selectedStats.percent} className="mt-4 h-2" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {selectedSlip.items.map((item, index) => {
                      const key = getSlipItemKey(item, index)
                      const requested = item.quantity?.requested || 0
                      const pickedQuantity = selectedPickedQuantities[key] || 0
                      const isPicked = requested > 0 && pickedQuantity >= requested

                      return (
                        <div key={key} className="grid gap-3 p-4 md:grid-cols-[auto_minmax(0,1fr)_170px] md:items-center">
                          <Checkbox
                            checked={isPicked}
                            onCheckedChange={(checked) => handlePickToggle(item, index, !!checked)}
                          />
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">{item.itemName}</p>
                              <Badge variant="outline">{item.itemCode}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span>Cần pick: {requested} {item.unit}</span>
                              <span className="inline-flex items-center gap-1">
                                <ArrowRight className="size-3" />
                                Đã pick: {pickedQuantity} {item.unit}
                              </span>
                            </div>
                          </div>
                          <Input
                            type="number"
                            min="0"
                            value={pickedQuantity === 0 ? "" : pickedQuantity}
                            onChange={(event) => handlePickQuantityChange(item, index, event.target.value)}
                            className="text-right font-semibold"
                            aria-label={`Số lượng pick ${item.itemName}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                Chọn một phiếu đang soạn hàng để bắt đầu pick
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default function PickListPage() {
  return (
    <Suspense fallback={null}>
      <PickListPageContent />
    </Suspense>
  )
}

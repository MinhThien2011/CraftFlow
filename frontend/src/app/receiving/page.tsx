'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrReader } from 'react-qr-reader'
import { AppShell } from '@/components/app-shell'
import { PackagePlus, Search, Eye, Check, X, QrCode, FileSignature, Truck, Download, Printer, Upload, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { receivingNotes } from '@/lib/warehouse-mock-data'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const statusColors = {
  pending_qc: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  partial: 'bg-blue-100 text-blue-700'
}

const statusLabels = {
  pending_qc: 'Chờ QC',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  partial: 'Nhập một phần'
}

const materialStatusColors = {
  good: 'bg-emerald-100 text-emerald-700',
  damaged: 'bg-red-100 text-red-700',
  missing: 'bg-amber-100 text-amber-700'
}

const materialStatusLabels = {
  good: 'Tốt',
  damaged: 'Hỏng',
  missing: 'Thiếu'
}

// ============================================================================
// QR CODE DIALOG COMPONENT
// ============================================================================

interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receiptId: string
  supplier: string
  receiver: string
  time: string
}

function QRCodeDialog({
  open,
  onOpenChange,
  receiptId,
  supplier,
  receiver,
  time,
}: QRCodeDialogProps) {
  const qrData = JSON.stringify({
    type: 'RECEIVING_RECEIPT',
    id: receiptId,
    supplier,
    receiver,
    timestamp: time,
    scanTime: new Date().toISOString(),
  })

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')

      const downloadLink = document.createElement('a')
      downloadLink.download = `QR_${receiptId}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const printQRCode = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In mã QR - ${receiptId}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px solid #E5E7EB;
              border-radius: 12px;
              background: white;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              color: #111827;
            }
            .info {
              margin: 20px 0;
              color: #6B7280;
              font-size: 14px;
            }
            .qr-code {
              margin: 20px auto;
            }
            @media print {
              body {
                padding: 0;
              }
              .qr-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>Phiếu nhập kho</h1>
            <div class="info">
              <div><strong>Mã phiếu:</strong> ${receiptId}</div>
              <div><strong>Nhà cung cấp:</strong> ${supplier}</div>
              <div><strong>Người nhận:</strong> ${receiver}</div>
              <div><strong>Thời gian:</strong> ${time}</div>
            </div>
            <div class="qr-code">
              ${svgData}
            </div>
            <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">
              Quét mã QR để xem chi tiết phiếu nhập kho
            </p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#A67C00] rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div>Mã QR Phiếu nhập kho</div>
              <div className="text-sm font-normal text-gray-500 mt-1">{receiptId}</div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Mã QR code cho phiếu nhập kho {receiptId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <QRCodeSVG
              id="qr-code-svg"
              value={qrData}
              size={256}
              level="H"
              includeMargin={true}
              className="bg-white p-4 rounded-lg shadow-sm"
            />
            <p className="text-sm text-gray-500 mt-4 text-center">
              Quét mã QR để xem chi tiết phiếu nhập kho
            </p>
          </div>

          {/* Receipt Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Mã phiếu:</span>
              <span className="font-medium text-gray-900">{receiptId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Nhà cung cấp:</span>
              <span className="font-medium text-gray-900">{supplier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Người nhận:</span>
              <span className="font-medium text-gray-900">{receiver}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Thời gian:</span>
              <span className="font-medium text-gray-900">{time}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={downloadQRCode}
              className="flex-1 bg-[#A67C00] hover:bg-[#8B6914] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Tải xuống
            </Button>
            <Button
              onClick={printQRCode}
              variant="outline"
              className="flex-1 border-[#A67C00] text-[#A67C00] hover:bg-[#A67C00] hover:text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              In mã QR
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">💡 Hướng dẫn sử dụng:</p>
            <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
              <li>Quét mã QR để xem thông tin chi tiết phiếu nhập</li>
              <li>Tải xuống để lưu trữ hoặc chia sẻ</li>
              <li>In mã QR để dán lên bao bì hàng hóa</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// QR SCANNER COMPONENT
// ============================================================================

interface QRScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess?: (data: any) => void
}

function QRScanner({ open, onOpenChange, onScanSuccess }: QRScannerProps) {
  const [scannedData, setScannedData] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [cameraEnabled, setCameraEnabled] = useState(true)

  const handleScan = (data: any) => {
    if (data?.text) {
      try {
        const parsedData = JSON.parse(data.text)
        setScannedData(parsedData)
        setError('')
        onScanSuccess?.(parsedData)
      } catch (err) {
        setError('Mã QR không hợp lệ')
      }
    }
  }

  const handleError = (err: any) => {
    console.error(err)
    if (err?.name === 'NotAllowedError') {
      setError('Quyền truy cập camera bị từ chối. Vui lòng cho phép quyền truy cập camera.')
    } else if (err?.name === 'NotFoundError') {
      setError('Không tìm thấy camera trên thiết bị.')
    } else {
      setError('Không thể truy cập camera. Vui lòng cho phép quyền truy cập camera.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)

        setError('Chức năng quét từ file đang được phát triển')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const resetScanner = () => {
    setScannedData(null)
    setError('')
    setCameraEnabled(true)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) {
          resetScanner()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#A67C00] rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div>Quét mã QR</div>
              <div className="text-sm font-normal text-gray-500 mt-1">
                Quét mã QR trên phiếu nhập kho
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quét mã QR code để tra cứu thông tin phiếu nhập kho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View */}
          {cameraEnabled && !scannedData && (
            <div className="relative">
              <div className="aspect-square bg-black rounded-lg overflow-hidden border-2 border-gray-300">
                <QrReader
                  onResult={(result: any, error: any) => {
                    if (!!error) {
                      console.info(error);
                    }
                    if (result) {
                      handleScan(result);
                    }
                  }}
                  constraints={{ facingMode: 'environment' }}
                  videoStyle={{ width: '100%', height: '100%' }}
                />
              </div>

              {/* Scanner Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="flex items-center justify-center h-full">
                  <div className="w-64 h-64 border-4 border-[#A67C00] rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#A67C00]"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#A67C00]"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#A67C00]"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#A67C00]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scanned Result */}
          {scannedData && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 mb-2">Quét thành công!</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Loại:</span>
                      <Badge className="bg-green-600 hover:bg-green-600">
                        {scannedData.type || 'N/A'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Mã phiếu:</span>
                      <span className="font-medium text-green-900">{scannedData.id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Nhà cung cấp:</span>
                      <span className="font-medium text-green-900">
                        {scannedData.supplier || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Người nhận:</span>
                      <span className="font-medium text-green-900">
                        {scannedData.receiver || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={resetScanner}
                variant="outline"
                className="w-full border-[#A67C00] text-[#A67C00] hover:bg-[#A67C00] hover:text-white"
              >
                Quét mã khác
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Alternative Upload Option */}
          {!scannedData && (
            <div className="border-t pt-4">
              <label
                htmlFor="qr-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#A67C00] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Hoặc tải lên hình ảnh QR code</span>
                <input
                  id="qr-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {/* Instructions */}
          {!scannedData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 font-medium mb-1">💡 Hướng dẫn quét:</p>
              <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                <li>Đặt mã QR trong khung hình vuông</li>
                <li>Giữ camera ổn định và đảm bảo đủ ánh sáng</li>
                <li>Mã QR sẽ tự động được nhận diện</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ReceivingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)

  const handleShowQR = (note: any) => {
    setSelectedReceipt(note)
    setQrDialogOpen(true)
  }

  const handleScanSuccess = (data: any) => {
    const receipt = receivingNotes.find((r: any) => r.code === data.id)
    if (receipt) {
      setSelectedReceipt(receipt)
      setQrScannerOpen(false)
      setQrDialogOpen(true)
    }
  }

  const filteredItems = receivingNotes.filter((note) =>
    note.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell title="Quản lý nhập kho" subtitle="Tạo và quản lý phiếu nhập kho nguyên vật liệu">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <PackagePlus className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng phiếu nhập</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3">
                  <QrCode className="size-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ QC</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3">
                  <Check className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã duyệt hôm nay</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Truck className="size-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NCC giao hôm nay</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="all" className="w-full">
              <CardHeader className="pb-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <TabsList>
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="pending_qc">Chờ QC</TabsTrigger>
                    <TabsTrigger value="approved">Đã duyệt</TabsTrigger>
                    <TabsTrigger value="rejected">Từ chối</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button
                      onClick={() => setQrScannerOpen(true)}
                      variant="outline"
                    >
                      <QrCode className="mr-2 size-4" />
                      Quét QR
                    </Button>
                    <Button>
                      <PackagePlus className="mr-2 size-4" />
                      Tạo phiếu nhập
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <TabsContent value="all" className="p-6 pt-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã phiếu</TableHead>
                        <TableHead>Nhà cung cấp</TableHead>
                        <TableHead>Nguyên vật liệu</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((note) => (
                        <TableRow key={note.id}>
                          <TableCell className="font-medium">{note.code}</TableCell>
                          <TableCell>{note.supplierName}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {note.materials.map((m, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <span>{m.name} × {m.quantity}</span>
                                  <Badge variant="secondary" className={materialStatusColors[m.status]}>
                                    {materialStatusLabels[m.status]}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{note.receivedBy}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[note.status]}>
                              {statusLabels[note.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(note.receivedAt, 'HH:mm dd/MM', { locale: vi })}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <Eye className="size-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-150">
                                  <DialogHeader>
                                    <DialogTitle>Chi tiết phiếu nhập {note.code}</DialogTitle>
                                    <DialogDescription>
                                      Thông tin chi tiết phiếu nhập kho
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-muted-foreground">Nhà cung cấp</Label>
                                        <p className="font-medium">{note.supplierName}</p>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Người nhận</Label>
                                        <p className="font-medium">{note.receivedBy}</p>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Trạng thái</Label>
                                        <Badge className={statusColors[note.status]}>
                                          {statusLabels[note.status]}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label className="text-muted-foreground">Thời gian nhận</Label>
                                        <p className="font-medium">
                                          {format(note.receivedAt, 'HH:mm dd/MM/yyyy', { locale: vi })}
                                        </p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Danh sách vật liệu</Label>
                                      <div className="mt-2 rounded-lg border divide-y">
                                        {note.materials.map((m, i) => (
                                          <div key={i} className="flex justify-between items-center p-3">
                                            <div>
                                              <p className="font-medium">{m.name}</p>
                                              <p className="text-sm text-muted-foreground">{m.quantity} {m.unit}</p>
                                            </div>
                                            <Badge className={materialStatusColors[m.status]}>
                                              {materialStatusLabels[m.status]}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  {note.status === 'pending_qc' && (
                                    <DialogFooter className="gap-2">
                                      <Button variant="outline" className="text-red-600">
                                        <X className="mr-2 size-4" />
                                        Từ chối
                                      </Button>
                                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        <FileSignature className="mr-2 size-4" />
                                        Ký duyệt nhập kho
                                      </Button>
                                    </DialogFooter>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 hover:bg-[#A67C00]/10 hover:text-[#A67C00]"
                                onClick={() => handleShowQR(note)}
                              >
                                <QrCode className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="pending_qc" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu chờ kiểm tra chất lượng
                </div>
              </TabsContent>

              <TabsContent value="approved" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu đã duyệt
                </div>
              </TabsContent>

              <TabsContent value="rejected" className="p-6 pt-4">
                <div className="text-center py-8 text-muted-foreground">
                  Hiển thị các phiếu bị từ chối
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        {/* QR Code Dialog */}
        {selectedReceipt && (
          <QRCodeDialog
            open={qrDialogOpen}
            onOpenChange={setQrDialogOpen}
            receiptId={selectedReceipt.code}
            supplier={selectedReceipt.supplierName}
            receiver={selectedReceipt.receivedBy}
            time={format(selectedReceipt.receivedAt, 'HH:mm dd/MM', { locale: vi })}
          />
        )}

        {/* QR Scanner */}
        <QRScanner
          open={qrScannerOpen}
          onOpenChange={setQrScannerOpen}
          onScanSuccess={handleScanSuccess}
        />
      </div>
    </AppShell>
  )
}

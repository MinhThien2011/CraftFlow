import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receiptId: string
  supplier: string
  receiver: string
  time: string
}

export function QRCodeDialog({
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
          <title>In mã QR - \${receiptId}</title>
          <style>
            body { margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; }
            .qr-container { text-align: center; padding: 40px; border: 2px solid #E5E7EB; border-radius: 12px; background: white; }
            h1 { font-size: 24px; margin-bottom: 10px; color: #111827; }
            .info { margin: 20px 0; color: #6B7280; font-size: 14px; }
            .qr-code { margin: 20px auto; }
            @media print { body { padding: 0; } .qr-container { border: none; } }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>Phiếu nhập kho</h1>
            <div class="info">
              <div><strong>Mã phiếu:</strong> \${receiptId}</div>
              <div><strong>Nhà cung cấp:</strong> \${supplier}</div>
              <div><strong>Người nhận:</strong> \${receiver}</div>
              <div><strong>Thời gian:</strong> \${time}</div>
            </div>
            <div class="qr-code">\${svgData}</div>
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
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <QRCodeSVG
              id="qr-code-svg"
              value={qrData}
              size={256}
              level="H"
              includeMargin={true}
              className="bg-white p-4 rounded-lg shadow-sm"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Mã phiếu:</span><span className="font-medium">{receiptId}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Nhà cung cấp:</span><span className="font-medium">{supplier}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Người nhận:</span><span className="font-medium">{receiver}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Thời gian:</span><span className="font-medium">{time}</span></div>
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadQRCode} className="flex-1 bg-[#A67C00] hover:bg-[#8B6914] text-white">
              <Download className="w-4 h-4 mr-2" /> Tải xuống
            </Button>
            <Button onClick={printQRCode} variant="outline" className="flex-1 border-[#A67C00] text-[#A67C00]">
              <Printer className="w-4 h-4 mr-2" /> In mã QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

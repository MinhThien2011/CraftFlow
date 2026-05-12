import { useState } from 'react'
import { QrReader } from 'react-qr-reader'
import { QrCode, Upload, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface QRScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess?: (data: any) => void
}

export function QRScanner({ open, onOpenChange, onScanSuccess }: QRScannerProps) {
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
              <div className="text-sm font-normal text-gray-500 mt-1">Quét mã QR trên phiếu nhập kho</div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quét mã QR code để tra cứu thông tin phiếu nhập kho
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {cameraEnabled && !scannedData && (
            <div className="relative">
              <div className="aspect-square bg-black rounded-lg overflow-hidden border-2 border-gray-300">
                <QrReader
                  onResult={(result: any, error: any) => {
                    if (result) handleScan(result);
                  }}
                  constraints={{ facingMode: 'environment' }}
                  videoStyle={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          )}

          {scannedData && (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 mb-2">Quét thành công!</p>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-green-700">Mã phiếu:</span><span className="font-medium">{scannedData.id}</span></div>
                    <div className="flex justify-between"><span className="text-green-700">Nhà cung cấp:</span><span className="font-medium">{scannedData.supplier}</span></div>
                  </div>
                </div>
              </div>
              <Button onClick={resetScanner} variant="outline" className="w-full border-[#A67C00] text-[#A67C00]">Quét mã khác</Button>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

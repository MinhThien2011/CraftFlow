import { useState, useEffect, useRef } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { QrCode, Upload, CheckCircle2, AlertCircle, RefreshCcw, Camera, Image as ImageIcon, Lightbulb, LightbulbOff, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface QRScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess?: (data: any) => void
}

export function QRScanner({ open, onOpenChange, onScanSuccess }: QRScannerProps) {
  const [scannedData, setScannedData] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [screenFlash, setScreenFlash] = useState(false)
  const [key, setKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScan = (text: string) => {
    if (text) {
      try {
        const parsedData = JSON.parse(text)
        setScannedData(parsedData)
        setError('')
        setCameraEnabled(false)
        onScanSuccess?.(parsedData)
      } catch (err) {
        // Fallback: Nếu không phải JSON, trả về nguyên chuỗi ID
        const fallbackData = { id: text, raw: true }
        setScannedData(fallbackData)
        setError('')
        setCameraEnabled(false)
        onScanSuccess?.(fallbackData)
      }
    }
  }

  const resetScanner = () => {
    setScannedData(null)
    setError('')
    setCameraEnabled(true)
    setScreenFlash(false)
    setKey(prev => prev + 1)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      toast.info('Tính năng đọc QR từ ảnh tĩnh đang được hoàn thiện. Vui lòng quét trực tiếp bằng camera.', {
        icon: <ImageIcon className="w-4 h-4" />
      })
      e.target.value = ''
    }
  }

  useEffect(() => {
    if (open) resetScanner()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-background shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-card">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-lg">Quét mã QR / Barcode</div>
              <div className="text-sm font-normal text-muted-foreground mt-0.5">
                Hướng camera vào mã QR hoặc mã vạch
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quét mã QR code để tra cứu thông tin phiếu nhập kho
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 bg-card flex flex-col gap-4">
          {!scannedData && (
            <div className="relative w-full aspect-[4/3] sm:aspect-square bg-black rounded-2xl overflow-hidden shadow-inner ring-1 ring-black/5">
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-gray-900">
                  <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                  <p className="text-white font-medium mb-1">Không thể mở camera</p>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{error}</p>
                  <Button onClick={resetScanner} variant="secondary" size="sm">
                    <RefreshCcw className="w-4 h-4 mr-2" /> Thử lại
                  </Button>
                </div>
              ) : (
                cameraEnabled && (
                  <>
                    <Scanner
                      key={`${key}-${facingMode}`}
                      onScan={(detectedCodes) => {
                        if (detectedCodes && detectedCodes.length > 0) {
                          handleScan(detectedCodes[0].rawValue)
                        }
                      }}
                      onError={(err) => {
                        console.error(err)
                        setError('Vui lòng cấp quyền truy cập camera trong trình duyệt. Lưu ý: Tính năng này yêu cầu HTTPS.')
                      }}
                      constraints={{ facingMode }}
                      components={{ finder: false, torch: true }}
                      styles={{
                        container: { width: '100%', height: '100%' },
                        video: { objectFit: 'cover' }
                      }}
                    />

                    {/* Các nút điều khiển Camera */}
                    <div className="absolute top-3 right-3 z-20 flex flex-col gap-2.5">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 border-none backdrop-blur-md shadow-sm"
                        onClick={(e) => { e.preventDefault(); setFacingMode(prev => prev === 'environment' ? 'user' : 'environment'); }}
                        title="Đổi camera trước/sau"
                      >
                        <RefreshCcw className="w-5 h-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className={`h-10 w-10 rounded-full border-none backdrop-blur-md shadow-sm transition-colors ${screenFlash ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-black/40 text-white hover:bg-black/60'}`}
                        onClick={(e) => { e.preventDefault(); setScreenFlash(prev => !prev); }}
                        title="Tăng sáng màn hình"
                      >
                        {screenFlash ? <Lightbulb className="w-5 h-5" /> : <LightbulbOff className="w-5 h-5" />}
                      </Button>
                    </div>

                    {/* Custom Overlay Scanner */}
                    <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center transition-all duration-300 ${screenFlash ? 'bg-white/30 border-[16px] border-white' : 'bg-transparent'}`}>
                      <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                        <svg className={`absolute inset-0 w-full h-full transition-colors ${screenFlash ? 'text-black/80' : 'text-white/80'}`} fill="none" viewBox="0 0 100 100">
                          <path stroke="currentColor" strokeWidth="4" d="M25 2H2v23M75 2h23v23M25 98H2V75M75 98h23V75" />
                        </svg>
                        <div className={`absolute top-0 left-0 w-full h-0.5 shadow-[0_0_12px_3px_rgba(34,197,94,0.6)] animate-scan-laser ${screenFlash ? 'bg-green-600' : 'bg-green-500'}`} />
                      </div>
                      <p className={`mt-8 text-xs font-medium px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg transition-colors ${screenFlash ? 'bg-white/90 text-black' : 'bg-black/60 text-white'}`}>
                        <Camera className="w-3.5 h-3.5" /> Căn chỉnh mã vào trong khung
                      </p>
                    </div>
                  </>
                )
              )}
              <style>{`
                @keyframes scan {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(14rem); }
                }
                @media (max-width: 640px) {
                  @keyframes scan {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(12rem); }
                  }
                }
                .animate-scan-laser {
                  animation: scan 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
              `}</style>
            </div>
          )}

          {!scannedData && (
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 bg-muted/50 border-dashed hover:bg-muted/80 text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Tải ảnh QR lên
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {scannedData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm shadow-sm relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-100 rounded-full blur-2xl opacity-60 pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="bg-emerald-100 p-2 rounded-full shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-emerald-900 text-base mb-3">Quét mã thành công!</p>
                    <div className="space-y-2.5 bg-white/60 p-3 rounded-lg border border-emerald-100/50">
                      <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                        <span className="text-emerald-700">ID / Mã code:</span>
                        <span className="font-semibold text-emerald-950">{scannedData.id || scannedData.pickListId || scannedData.issueNo || 'N/A'}</span>
                      </div>
                      {(scannedData.supplier || scannedData.department) && (
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-700">{scannedData.supplier ? 'Nhà cung cấp:' : 'Thông tin:'}</span>
                          <span className="font-medium text-emerald-900 text-right line-clamp-1 max-w-[150px]">
                            {scannedData.supplier || scannedData.department}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={resetScanner} variant="outline" className="flex-1 h-11 border-primary/20 text-primary hover:bg-primary/5">
                  <RefreshCcw className="w-4 h-4 mr-2" /> Quét mã khác
                </Button>
                <Button onClick={() => onOpenChange(false)} className="flex-1 h-11">
                  Hoàn tất
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

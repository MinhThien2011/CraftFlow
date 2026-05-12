'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { withPermission } from '@/components/guards/permission-guard'
import { Skeleton } from '@/components/ui/skeleton'
import { ReceivingList } from '@/features/receiving/components/receiving-list'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

// Lazy load heavy components
const QRCodeDialog = dynamic(() => import('@/features/receiving/components/qr-code-dialog').then(mod => mod.QRCodeDialog), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />
})

const QRScanner = dynamic(() => import('@/features/receiving/components/qr-scanner').then(mod => mod.QRScanner), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />
})

function ReceivingPage() {
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState<any>(null)

  const handleShowQR = (slip: any) => {
    setSelectedSlip(slip)
    setQrDialogOpen(true)
  }

  const handleScanSuccess = (data: any) => {
    // In real app, search for slip by scanned ID
    setQrScannerOpen(false)
    // setSelectedSlip(scannedSlip)
    // setQrDialogOpen(true)
  }

  return (
    <AppShell title="Quản lý nhập kho" subtitle="Quản lý các phiếu nhập kho từ nhà cung cấp">
      <ReceivingList 
        onShowQR={handleShowQR} 
        onOpenScanner={() => setQrScannerOpen(true)} 
      />

      {selectedSlip && (
        <QRCodeDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          receiptId={selectedSlip.slipNumber}
          supplier={selectedSlip.supplierName || 'N/A'}
          receiver={selectedSlip.personName || 'N/A'}
          time={format(new Date(selectedSlip.date), 'HH:mm dd/MM', { locale: vi })}
        />
      )}

      <QRScanner
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
    </AppShell>
  )
}

export default withPermission(ReceivingPage, ['admin', 'kho_manager'])

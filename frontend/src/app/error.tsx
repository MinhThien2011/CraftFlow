"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Home, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("Unhandled page error:", error)
  }, [error])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Trang gặp lỗi khi hiển thị</h1>
          <p className="text-sm text-muted-foreground">
            Dữ liệu hoặc phiên làm việc có thể vừa thay đổi. Thử tải lại trang hoặc quay về trang tổng quan.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={reset}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Tải lại
          </Button>
          <Button onClick={() => router.replace("/dashboard")}>
            <Home className="mr-2 h-4 w-4" />
            Về tổng quan
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Home, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
          <p className="text-sm text-muted-foreground">
            Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được thay đổi.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
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

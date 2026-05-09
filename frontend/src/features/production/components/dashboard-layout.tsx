"use client"

import { AppShell } from "@/components/app-shell"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return <AppShell title={title ?? "Production Management"}>{children}</AppShell>
}

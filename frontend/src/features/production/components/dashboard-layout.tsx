"use client"

import { AppShell } from "@/components/app-shell"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return <AppShell title={title ?? "Production Management"} subtitle={subtitle}>{children}</AppShell>
}

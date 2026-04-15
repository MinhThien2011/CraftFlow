import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, locale: string = "vi-VN"): string {
  return new Intl.NumberFormat(locale).format(value) + " VND"
}

export function getAvatarUrl(avatar?: string): string | undefined {
  if (!avatar) return undefined
  if (avatar.startsWith("http")) return avatar
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  const baseUrl = API_BASE_URL.replace("/api", "")
  return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`
}

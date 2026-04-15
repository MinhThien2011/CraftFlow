"use client"

import { useEffect, useState } from "react"

interface CurrencyDisplayProps {
  value: number
  locale?: string
  className?: string
}

export function CurrencyDisplay({ value, locale = "vi-VN", className }: CurrencyDisplayProps) {
  const [formatted, setFormatted] = useState("")

  useEffect(() => {
    setFormatted(new Intl.NumberFormat(locale).format(value) + " VND")
  }, [value, locale])

  return <span className={className}>{formatted}</span>
}
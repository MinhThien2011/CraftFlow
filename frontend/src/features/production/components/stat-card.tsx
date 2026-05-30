import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import Link from "next/link"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  href?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  href,
}: StatCardProps) {
  const content = (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold text-card-foreground">{value}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EBE3D9]">
        <Icon className="h-6 w-6 text-[#7A5C43]" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        <Card className="p-6 bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer group">
          {content}
        </Card>
      </Link>
    )
  }

  return (
    <Card className="p-6 bg-card border-border">
      {content}
    </Card>
  )
}


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
    TrendingUp, TrendingDown, AlertCircle, CheckCircle2 
} from 'lucide-react'

interface InventoryStatsProps {
    stats: {
        total: number;
        normal: number;
        low: number;
        critical: number;
    }
}

export function InventoryStats({ stats }: InventoryStatsProps) {
    const statItems = [
        { label: 'Tổng loại NVL', value: stats.total, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Tồn kho ổn định', value: stats.normal, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Sắp hết hàng', value: stats.low, icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Mức nguy cấp', value: stats.critical, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statItems.map((s) => (
                <Card key={s.label}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                        <div className={`p-2 rounded-full ${s.bg}`}>
                            <s.icon className={`size-4 ${s.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{s.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

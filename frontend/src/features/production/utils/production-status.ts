export const PRODUCTION_ORDER_STATUS = {
  PENDING: "pending",
  INSUFFICIENT_MATERIALS: "insufficient_materials",
  MATERIALS_CHECKING: "materials_checking",
  MATERIALS_ALLOCATED: "materials_allocated",
  READY_TO_ASSIGN: "ready_to_assign",
  ASSIGNED: "assigned",
  IN_PREPARATION: "in_preparation",
  IN_PRODUCTION: "in_production",
  PARTIALLY_COMPLETE: "partially_complete",
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const

export type ProductionOrderStatus =
  (typeof PRODUCTION_ORDER_STATUS)[keyof typeof PRODUCTION_ORDER_STATUS]

// ─── Assignment statuses (staff-level) ─────────────────────────────────────
export const ASSIGNMENT_STATUS = {
  ASSIGNED: "assigned",
  IN_PRODUCTION: "in_production",
  PARTIALLY_COMPLETE: "partially_complete",
  COMPLETED: "completed",
} as const

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS]

type StatusConfig = {
  label: string
  color: string
  bgClass: string
  chartColor: string
}

export const PRODUCTION_ORDER_STATUS_CONFIG: Record<ProductionOrderStatus, StatusConfig> = {
  pending: {
    label: "Chờ xử lý",
    color: "text-gray-700 border-gray-300 bg-gray-100/50",
    bgClass: "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800",
    chartColor: "#F59E0B",
  },
  insufficient_materials: {
    label: "Thiếu vật liệu",
    color: "text-orange-700 border-orange-300 bg-orange-100/50",
    bgClass: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50",
    chartColor: "#F97316",
  },
  materials_checking: {
    label: "Đang kiểm tra vật liệu",
    color: "text-amber-700 border-amber-300 bg-amber-100/50",
    bgClass: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50",
    chartColor: "#F59E0B",
  },
  materials_allocated: {
    label: "Đã cấp phát vật liệu",
    color: "text-teal-700 border-teal-300 bg-teal-100/50",
    bgClass: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-900/50",
    chartColor: "#14B8A6",
  },
  ready_to_assign: {
    label: "Sẵn sàng phân công",
    color: "text-indigo-700 border-indigo-300 bg-indigo-100/50",
    bgClass: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-900/50",
    chartColor: "#6366F1",
  },
  assigned: {
    label: "Đã phân công",
    color: "text-cyan-700 border-cyan-300 bg-cyan-100/50",
    bgClass: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-900/50",
    chartColor: "#06B6D4",
  },
  in_preparation: {
    label: "Đang chuẩn bị",
    color: "text-sky-700 border-sky-300 bg-sky-100/50",
    bgClass: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/50",
    chartColor: "#0EA5E9",
  },
  in_production: {
    label: "Đang sản xuất",
    color: "text-blue-700 border-blue-300 bg-blue-100/50",
    bgClass: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50",
    chartColor: "#2B8BE8",
  },
  partially_complete: {
    label: "Hoàn thành một phần",
    color: "text-lime-700 border-lime-300 bg-lime-100/50",
    bgClass: "bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-900/50",
    chartColor: "#84CC16",
  },
  completed: {
    label: "Hoàn thành",
    color: "text-emerald-700 border-emerald-300 bg-emerald-100/50",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50",
    chartColor: "#4A9C6B",
  },
  on_hold: {
    label: "Tạm dừng",
    color: "text-amber-700 border-amber-300 bg-amber-100/50",
    bgClass: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50",
    chartColor: "#D97706",
  },
  overdue: {
    label: "Quá hạn",
    color: "text-red-700 border-red-300 bg-red-100/50",
    bgClass: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50",
    chartColor: "#DC2626",
  },
  cancelled: {
    label: "Đã hủy",
    color: "text-red-700 border-red-300 bg-red-100/50",
    bgClass: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50",
    chartColor: "#E04E4E",
  },
}

/** Assignment-level status config (staff task tracking) */
export const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, Pick<StatusConfig, "label" | "color">> = {
  assigned: {
    label: "Mới giao",
    color: "text-blue-700 border-blue-200 bg-blue-100/60 dark:bg-blue-900/30 dark:text-blue-400",
  },
  in_production: {
    label: "Đang thực hiện",
    color: "text-amber-700 border-amber-200 bg-amber-100/60 dark:bg-amber-900/30 dark:text-amber-400",
  },
  partially_complete: {
    label: "Hoàn thành một phần",
    color: "text-purple-700 border-purple-200 bg-purple-100/60 dark:bg-purple-900/30 dark:text-purple-400",
  },
  completed: {
    label: "Đã hoàn thành",
    color: "text-emerald-700 border-emerald-200 bg-emerald-100/60 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
}

const FALLBACK_STATUS_CONFIG: StatusConfig = {
  label: "Chưa xác định",
  color: "text-gray-700 border-gray-300 bg-gray-100/50",
  bgClass: "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800",
  chartColor: "#6B7280",
}

export const PRODUCTION_STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: PRODUCTION_ORDER_STATUS.PENDING, label: PRODUCTION_ORDER_STATUS_CONFIG.pending.label },
  { value: PRODUCTION_ORDER_STATUS.INSUFFICIENT_MATERIALS, label: PRODUCTION_ORDER_STATUS_CONFIG.insufficient_materials.label },
  { value: PRODUCTION_ORDER_STATUS.READY_TO_ASSIGN, label: PRODUCTION_ORDER_STATUS_CONFIG.ready_to_assign.label },
  { value: PRODUCTION_ORDER_STATUS.ASSIGNED, label: PRODUCTION_ORDER_STATUS_CONFIG.assigned.label },
  { value: PRODUCTION_ORDER_STATUS.IN_PRODUCTION, label: PRODUCTION_ORDER_STATUS_CONFIG.in_production.label },
  { value: PRODUCTION_ORDER_STATUS.PARTIALLY_COMPLETE, label: PRODUCTION_ORDER_STATUS_CONFIG.partially_complete.label },
  { value: PRODUCTION_ORDER_STATUS.COMPLETED, label: PRODUCTION_ORDER_STATUS_CONFIG.completed.label },
  { value: PRODUCTION_ORDER_STATUS.CANCELLED, label: PRODUCTION_ORDER_STATUS_CONFIG.cancelled.label },
]

export function getProductionOrderStatusConfig(status?: string): StatusConfig {
  const normalized = status?.toLowerCase() as ProductionOrderStatus | undefined
  if (normalized && normalized in PRODUCTION_ORDER_STATUS_CONFIG) {
    return PRODUCTION_ORDER_STATUS_CONFIG[normalized]
  }
  return { ...FALLBACK_STATUS_CONFIG, label: status || FALLBACK_STATUS_CONFIG.label }
}

export function getAssignmentStatusConfig(status?: string): Pick<StatusConfig, "label" | "color"> {
  const normalized = status?.toLowerCase() as AssignmentStatus | undefined
  if (normalized && normalized in ASSIGNMENT_STATUS_CONFIG) {
    return ASSIGNMENT_STATUS_CONFIG[normalized]
  }
  return {
    label: status || "Chưa xác định",
    color: "text-gray-700 border-gray-300 bg-gray-100/50",
  }
}

const WAITING_MATERIAL_ISSUE_STATUSES = new Set<ProductionOrderStatus>([
  PRODUCTION_ORDER_STATUS.READY_TO_ASSIGN,
  PRODUCTION_ORDER_STATUS.ASSIGNED,
])

export const WAITING_MATERIAL_ISSUE_CONFIG = {
  label: "Đang chờ cấp vật tư",
  color: "text-amber-700 border-amber-300 bg-amber-100/70",
}

export function isWaitingMaterialIssueStatus(status?: string): boolean {
  if (!status) return false
  const normalized = status.toLowerCase() as ProductionOrderStatus
  return WAITING_MATERIAL_ISSUE_STATUSES.has(normalized)
}

// ─── Priority config ────────────────────────────────────────────────────────

export type Priority = "urgent" | "high" | "medium" | "normal" | "low"

type PriorityConfig = { label: string; color: string }

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  urgent: { label: "Khẩn cấp",    color: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400" },
  high:   { label: "Cao",         color: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400" },
  medium: { label: "Trung bình",  color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  normal: { label: "Bình thường", color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  low:    { label: "Thấp",        color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400" },
}

const FALLBACK_PRIORITY: PriorityConfig = {
  label: "Bình thường",
  color: "text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400",
}

/** Returns Vietnamese label + Tailwind color classes for a production order priority. */
export function getPriorityConfig(priority?: string): PriorityConfig {
  if (!priority) return FALLBACK_PRIORITY
  const normalized = priority.toLowerCase() as Priority
  return PRIORITY_CONFIG[normalized] ?? { ...FALLBACK_PRIORITY, label: priority }
}

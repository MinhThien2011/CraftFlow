export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  KHO_MANAGER: 'kho_manager',
  PRODUCTION_MANAGER: 'production_manager',
};

/**
 * Production Order Statuses
 * Represents the full lifecycle of a production order
 */
export const ORDER_STATUS = {
  PENDING: 'pending',              // Newly created
  INSUFFICIENT_MATERIALS: 'insufficient_materials', // Lack of raw materials
  MATERIALS_CHECKING: 'materials_checking',   // Checking BOM & stock
  MATERIALS_ALLOCATED: 'materials_allocated',  // Materials reserved
  READY_TO_ASSIGN: 'ready_to_assign', // Materials enough, waiting for admin to assign
  ASSIGNED: 'assigned',             // Tasks assigned to staff
  IN_PREPARATION: 'in_preparation',       // Waiting for materials
  IN_PRODUCTION: 'in_production',        // Production in progress
  PARTIALLY_COMPLETE: 'partially_complete',  // Some assignments done
  COMPLETED: 'completed',            // All work finished
  ON_HOLD: 'on_hold',              // Temporarily paused
  OVERDUE: 'overdue',              // Past deadline
  CANCELLED: 'cancelled',            // Cancelled by admin
}

/**
 * Material Requisition Statuses
 * Workflow for requesting and issuing materials
 */
export const REQUISITION_STATUS = {
  PENDING: 'pending',              // Staff requested
  APPROVED: 'approved',            // Admin approved
  ACCEPTED: 'accepted',            // Kho manager accepted
  PREPARING: 'preparing',          // Being prepared in warehouse
  PREPARED: 'prepared',            // Ready for pickup
  COMPLETED: 'completed',          // Materials picked up by staff
  RETURN_PENDING: 'return_pending', // Return requested by PM
  RETURN_APPROVED: 'return_approved', // Return approved by Kho Manager, waiting for actual stock move
  RETURNED: 'returned',            // Return completed
  CANCELLED: 'cancelled',          // Cancelled by manager or timeout
  REJECTED: 'rejected',            // Rejected by admin
}

export const REQUISITION_TYPE = {
  ISSUE: 'issue',                 // Normal material issue
  SUPPLEMENTARY: 'supplementary', // Additional materials needed during production
  RETURN: 'return',               // Returning excess materials
  PRODUCT_EXPORT: 'product_export', // Exporting finished products
}

/**
 * Inventory Transaction Types
 * Used for audit trail of all stock movements
 */
export const TRANSACTION_TYPE = {
  RECEIVE: 'receive',   // Goods received into warehouse
  ALLOCATE: 'allocate',  // Reserved for production order
  DEDUCT: 'deduct',    // Deducted after use
  ISSUE: 'issue',     // Issued to staff
  ADJUST: 'adjust',    // Manual adjustment (loss, gain, correction)
  MOVE: 'move',      // Moved between warehouse locations
  PRODUCTION_IN: 'production_in', // Products moved from production to finished goods inventory
  SALES_OUT: 'sales_out', // Products sold and moved out of inventory
  DAMAGE_OUT: 'damage_out', // Products removed due to damage
}

export const REQUISITION_TIMEOUT_MINUTES = 120;

/**
 * Priority Levels for Production Orders
 */
export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
}

/**
 * Product Inventory Stock Levels
 * Used for categorizing product quantity relative to its threshold
 */
export const STOCK_LEVEL = {
  OUT_OF_STOCK: 'out_of_stock', // 0
  CRITICAL: 'critical',     // Extremely low, needs immediate production
  LOW: 'low',          // Below threshold
  NORMAL: 'normal',       // Adequate stock
  OVERSTOCK: 'overstock',    // Excess stock
};

/**
 * Inventory Shrinkage Statuses
 */
export const SHRINKAGE_STATUS = {
  PENDING: 'pending',     // Created by Kho Manager
  CHECKING: 'checking',   // Admin is checking
  RESOLVED: 'resolved',   // Issues identified, ready for decision
  ACCEPTED: 'accepted',   // Admin accepted, inventory will be deducted
  REJECTED: 'rejected',   // Admin rejected
};

/**
 * Mapping of stock levels to metadata (labels, colors, etc.)
 * Useful for both backend categorization and frontend display
 */
export const STOCK_LEVEL_METADATA = {
  [STOCK_LEVEL.OUT_OF_STOCK]: { label: 'ét ô ét', color: '#ff4d4f', priority: 1 },
  [STOCK_LEVEL.CRITICAL]: { label: 'Cực thấp Cíu Cíu', color: '#ff7a45', priority: 2 },
  [STOCK_LEVEL.LOW]: { label: 'Sắp hết', color: '#ffa940', priority: 3 },
  [STOCK_LEVEL.NORMAL]: { label: 'Bình thường', color: '#52c41a', priority: 4 },
  [STOCK_LEVEL.OVERSTOCK]: { label: 'Vượt mức', color: '#1890ff', priority: 5 },
};

export const INVENTORY_IMPORT_EXPORT_SLIP_TYPE = {
  IMPORT: 'import',
  EXPORT: 'export',
}

export const INVENTORY_IMPORT_EXPORT_SLIP_STATUS = {
  PENDING: 'pending',     // Mới tạo, chờ xử lý,
  RECEIVED: 'received',   // Đã nhận hàng (Import) / Đang soạn hàng (Export)
  INSPECTED: 'inspected', // Đã kiểm tra (Import)
  INSPECTING: 'inspecting', // Đang kiểm kê (Export)
  IN_STOCK: 'in_stock',   // Đã vào kho (Import) - Cho phép upload ảnh
  COMPLETED: 'completed', // Đã hoàn tất (Export) - Cho phép upload ảnh
  VERIFIED: 'verified',   // Đã xác thực ảnh chứng từ (Sau 3 ngày)
  CANCELLED: 'cancelled', // Đã hủy
}

export const PURCHASE_ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
}

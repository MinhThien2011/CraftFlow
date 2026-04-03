export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  KHO_MANAGER: 'kho_manager',
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
  ACCEPTED: 'accepted',            // Kho manager accepted
  PREPARING: 'preparing',          // Being prepared in warehouse
  PREPARED: 'prepared',            // Ready for pickup
  COMPLETED: 'completed',          // Materials picked up by staff
  CANCELLED: 'cancelled',          // Cancelled by manager or timeout
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
}

export const REQUISITION_TIMEOUT_MINUTES = 120;

/**
 * Priority Levels for Production Orders
 */
export const PRIORITY = {
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
  URGENT: 'urgent',
}
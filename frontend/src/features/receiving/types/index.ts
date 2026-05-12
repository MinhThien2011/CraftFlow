import { ReceivingSlip, ReceivingSlipItem } from "../api/receiving.api";

export type ReceivingStatus = 
  | 'pending'
  | 'received'
  | 'inspected'
  | 'inspecting'
  | 'in_stock'
  | 'completed'
  | 'verified'
  | 'cancelled';

export interface ReceivingFilters {
  page: number;
  limit: number;
  type: 'import' | 'export';
  status?: ReceivingStatus | 'all';
  search?: string;
}

export interface CreateReceivingFormData {
  type: 'import';
  reason: string;
  supplierId?: string;
  poNumber?: string;
  warehouseName: string;
  warehouseLocation?: string;
  items: Partial<ReceivingSlipItem>[];
  notes?: string;
  date: string;
}

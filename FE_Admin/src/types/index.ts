export type StockStatus = 'OK' | 'LOW' | 'CRITICAL';

export interface Material {
  id: string;
  name: string;
  sku: string;
  color: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

export interface RestockLog {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  date: string;
  user: string;
  note: string;
}

export interface User {
  username: string;
  role: string;
  name: string;
}
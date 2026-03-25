import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { Material, RestockLog, User } from '../types';
interface InventoryContextType {
  user: User | null;
  materials: Material[];
  history: RestockLog[];
  login: (username: string) => void;
  logout: () => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  restockMaterial: (materialId: string, quantity: number, note: string) => void;
}
const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);
const INITIAL_MATERIALS: Material[] = [
{
  id: '1',
  name: 'Len Cotton Milk 50g',
  sku: 'MILK-50-RED',
  color: 'Đỏ tươi',
  currentStock: 120,
  minStock: 50,
  unit: 'Cuộn'
},
{
  id: '2',
  name: 'Len Cotton Milk 50g',
  sku: 'MILK-50-WHT',
  color: 'Trắng tinh',
  currentStock: 45,
  minStock: 50,
  unit: 'Cuộn'
},
{
  id: '3',
  name: 'Len Nhung Đũa',
  sku: 'NHUNG-BEIGE',
  color: 'Be',
  currentStock: 10,
  minStock: 30,
  unit: 'Cuộn'
},
{
  id: '4',
  name: 'Sợi Dệt Trơn',
  sku: 'DET-BLK',
  color: 'Đen',
  currentStock: 200,
  minStock: 100,
  unit: 'Cuộn'
}];

const INITIAL_HISTORY: RestockLog[] = [
{
  id: 'h1',
  materialId: '1',
  materialName: 'Len Cotton Milk 50g',
  quantity: 100,
  date: new Date(Date.now() - 86400000 * 2).toISOString(),
  user: 'Admin',
  note: 'Nhập hàng đầu tháng'
},
{
  id: 'h2',
  materialId: '4',
  materialName: 'Sợi Dệt Trơn',
  quantity: 200,
  date: new Date(Date.now() - 86400000 * 5).toISOString(),
  user: 'Admin',
  note: 'Bổ sung kho'
}];

export function InventoryProvider({ children }: {children: ReactNode;}) {
  const [user, setUser] = useState<User | null>(null);
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [history, setHistory] = useState<RestockLog[]>(INITIAL_HISTORY);
  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('craftflow_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedMaterials = localStorage.getItem('craftflow_materials');
    if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
    const savedHistory = localStorage.getItem('craftflow_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);
  // Save to localStorage when state changes
  useEffect(() => {
    if (user) localStorage.setItem('craftflow_user', JSON.stringify(user));else
    localStorage.removeItem('craftflow_user');
    localStorage.setItem('craftflow_materials', JSON.stringify(materials));
    localStorage.setItem('craftflow_history', JSON.stringify(history));
  }, [user, materials, history]);
  const login = (username: string) => {
    setUser({
      username,
      role: 'Admin',
      name: username === 'admin' ? 'Quản trị viên' : username
    });
  };
  const logout = () => {
    setUser(null);
  };
  const addMaterial = (material: Omit<Material, 'id'>) => {
    const newMaterial = {
      ...material,
      id: Math.random().toString(36).substr(2, 9)
    };
    setMaterials((prev) => [...prev, newMaterial]);
  };
  const updateMaterial = (id: string, updates: Partial<Material>) => {
    setMaterials((prev) =>
    prev.map((m) =>
    m.id === id ?
    {
      ...m,
      ...updates
    } :
    m
    )
    );
  };
  const deleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };
  const restockMaterial = (
  materialId: string,
  quantity: number,
  note: string) =>
  {
    const material = materials.find((m) => m.id === materialId);
    if (!material) return;
    // Update stock
    updateMaterial(materialId, {
      currentStock: material.currentStock + quantity
    });
    // Add history log
    const log: RestockLog = {
      id: Math.random().toString(36).substr(2, 9),
      materialId,
      materialName: material.name,
      quantity,
      date: new Date().toISOString(),
      user: user?.name || 'Unknown',
      note
    };
    setHistory((prev) => [log, ...prev]);
  };
  return (
    <InventoryContext.Provider
      value={{
        user,
        materials,
        history,
        login,
        logout,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        restockMaterial
      }}>
      
      {children}
    </InventoryContext.Provider>);

}
export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
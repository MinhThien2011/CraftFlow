import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Package, ArrowDownToLine, CheckCircle2 } from 'lucide-react';
export function Restock() {
  const { materials, restockMaterial } = useInventory();
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || !quantity || quantity <= 0) return;
    restockMaterial(selectedMaterialId, Number(quantity), note);
    setSuccessMessage(
      `Đã nhập thành công ${quantity} ${selectedMaterial?.unit} ${selectedMaterial?.name}`
    );
    // Reset form
    setSelectedMaterialId('');
    setQuantity('');
    setNote('');
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm rounded-xl border border-stone-100 overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 bg-craft-iconBg rounded-full flex items-center justify-center">
              <ArrowDownToLine className="h-6 w-6 text-craft-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-900">
                Nhập Kho Nguyên Liệu
              </h2>
              <p className="text-stone-500 mt-1">
                Cập nhật số lượng tồn kho cho nguyên liệu
              </p>
            </div>
          </div>

          {successMessage &&
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-emerald-800 font-medium">{successMessage}</p>
            </div>
          }

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="material"
                className="block text-sm font-medium text-stone-700 mb-1">
                
                Chọn nguyên liệu <span className="text-red-500">*</span>
              </label>
              <select
                id="material"
                required
                className="block w-full rounded-lg border-stone-300 border px-4 py-2 text-stone-900 shadow-sm focus:border-craft-primary focus:ring-craft-primary sm:text-sm bg-white"
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}>
                
                <option value="" disabled>
                  -- Chọn nguyên liệu --
                </option>
                {materials.map((m) =>
                <option key={m.id} value={m.id}>
                    {m.name} - {m.color} (Mã: {m.sku})
                  </option>
                )}
              </select>
            </div>

            {selectedMaterial &&
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      Tồn kho hiện tại
                    </p>
                    <p className="text-xs text-stone-500">
                      Mức tối thiểu: {selectedMaterial.minStock}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-stone-900">
                    {selectedMaterial.currentStock}
                  </span>
                  <span className="text-sm text-stone-500 ml-1">
                    {selectedMaterial.unit}
                  </span>
                </div>
              </div>
            }

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Số lượng nhập"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) =>
                setQuantity(e.target.value ? Number(e.target.value) : '')
                }
                placeholder="0" />
              

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Tồn kho sau khi nhập
                </label>
                <div className="block w-full rounded-lg border-stone-200 bg-stone-50 border px-4 py-2 text-stone-500 sm:text-sm">
                  {selectedMaterial && quantity ?
                  selectedMaterial.currentStock + Number(quantity) :
                  '-'}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="note"
                className="block text-sm font-medium text-stone-700 mb-1">
                
                Ghi chú (Tùy chọn)
              </label>
              <textarea
                id="note"
                rows={3}
                className="block w-full rounded-lg border-stone-300 border px-4 py-2 text-stone-900 shadow-sm focus:border-craft-primary focus:ring-craft-primary sm:text-sm"
                placeholder="VD: Nhập hàng lô mới tháng 10..."
                value={note}
                onChange={(e) => setNote(e.target.value)} />
              
            </div>

            <div className="pt-4 border-t border-stone-100">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!selectedMaterialId || !quantity}>
                
                Xác nhận nhập kho
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>);

}
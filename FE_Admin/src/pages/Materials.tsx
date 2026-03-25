import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StockBadge } from '../components/ui/Badge';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { Material, StockStatus } from '../types';
export function Materials() {
  const { materials, addMaterial, updateMaterial, deleteMaterial } =
  useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    color: '',
    currentStock: 0,
    minStock: 10,
    unit: 'Cuộn'
  });
  const getStatus = (current: number, min: number): StockStatus => {
    if (current === 0) return 'CRITICAL';
    if (current <= min) return 'LOW';
    return 'OK';
  };
  const filteredMaterials = materials.filter(
    (m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.color.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleOpenModal = (material?: Material) => {
    if (material) {
      setEditingId(material.id);
      setFormData({
        name: material.name,
        sku: material.sku,
        color: material.color,
        currentStock: material.currentStock,
        minStock: material.minStock,
        unit: material.unit
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        sku: '',
        color: '',
        currentStock: 0,
        minStock: 10,
        unit: 'Cuộn'
      });
    }
    setIsModalOpen(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMaterial(editingId, formData);
    } else {
      addMaterial(formData);
    }
    setIsModalOpen(false);
  };
  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nguyên liệu này?')) {
      deleteMaterial(id);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg leading-5 bg-white placeholder-stone-500 focus:outline-none focus:placeholder-stone-400 focus:ring-1 focus:ring-craft-primary focus:border-craft-primary sm:text-sm transition-colors"
            placeholder="Tìm kiếm theo tên, mã, màu sắc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
          
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto gap-2">
          
          <Plus className="h-4 w-4" />
          Thêm nguyên liệu
        </Button>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Mã (SKU)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Tên nguyên liệu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Màu sắc
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Tồn kho
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Trạng thái
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-100">
              {filteredMaterials.length === 0 ?
              <tr>
                  <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-stone-500">
                  
                    Không tìm thấy nguyên liệu nào.
                  </td>
                </tr> :

              filteredMaterials.map((material) =>
              <tr
                key={material.id}
                className="hover:bg-stone-50 transition-colors">
                
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                      {material.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">
                      {material.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">
                      <div className="flex items-center gap-2">
                        {material.color}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-700">
                      <span className="font-medium">
                        {material.currentStock}
                      </span>{' '}
                      / {material.minStock} {material.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StockBadge
                    status={getStatus(
                      material.currentStock,
                      material.minStock
                    )} />
                  
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                    onClick={() => handleOpenModal(material)}
                    className="text-stone-400 hover:text-craft-primary mr-3 transition-colors"
                    title="Sửa">
                    
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                    onClick={() => handleDelete(material.id)}
                    className="text-stone-400 hover:text-red-600 transition-colors"
                    title="Xóa">
                    
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
              )
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen &&
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true">
        
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
            className="fixed inset-0 bg-stone-900/75 transition-opacity"
            aria-hidden="true"
            onClick={() => setIsModalOpen(false)}>
          </div>
            <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true">
            
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-stone-100">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3
                  className="text-lg leading-6 font-medium text-stone-900"
                  id="modal-title">
                  
                    {editingId ?
                  'Cập nhật nguyên liệu' :
                  'Thêm nguyên liệu mới'}
                  </h3>
                  <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-stone-400 hover:text-stone-500">
                  
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form
                id="material-form"
                onSubmit={handleSubmit}
                className="space-y-4">
                
                  <Input
                  label="Tên nguyên liệu"
                  required
                  value={formData.name}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value
                  })
                  }
                  placeholder="VD: Len Cotton Milk 50g" />
                
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                    label="Mã (SKU)"
                    required
                    value={formData.sku}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      sku: e.target.value
                    })
                    }
                    placeholder="VD: MILK-50-RED" />
                  
                    <Input
                    label="Màu sắc"
                    required
                    value={formData.color}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      color: e.target.value
                    })
                    }
                    placeholder="VD: Đỏ tươi" />
                  
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                    label="Tồn kho hiện tại"
                    type="number"
                    min="0"
                    required
                    value={formData.currentStock}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentStock: parseInt(e.target.value) || 0
                    })
                    } />
                  
                    <Input
                    label="Mức tối thiểu"
                    type="number"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStock: parseInt(e.target.value) || 0
                    })
                    } />
                  
                    <Input
                    label="Đơn vị"
                    required
                    value={formData.unit}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit: e.target.value
                    })
                    } />
                  
                  </div>
                </form>
              </div>
              <div className="bg-stone-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-stone-200">
                <Button
                type="submit"
                form="material-form"
                className="w-full sm:ml-3 sm:w-auto">
                
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </Button>
                <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="mt-3 w-full sm:mt-0 sm:w-auto">
                
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

}
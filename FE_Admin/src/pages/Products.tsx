import { Button } from '../components/ui/Button';
import {
  Package,
  Clock,
  DollarSign,
  TrendingUp,
  Plus,
  Edit2,
  Play } from
'lucide-react';
interface BOMItem {
  material: string;
  quantity: string;
}
interface Product {
  id: string;
  name: string;
  category: string;
  emoji: string;
  emojiBg: string;
  bom: BOMItem[];
  materialCost: number;
  productionTime: number;
  sellingPrice: number;
  profit: number;
}
const PRODUCTS: Product[] = [
{
  id: '1',
  name: 'Khăn len đan tay',
  category: 'Khăn',
  emoji: '🧣',
  emojiBg: 'bg-red-100',
  bom: [
  {
    material: 'Len Cotton Milk 50g - Đỏ tươi',
    quantity: '3 cuộn'
  },
  {
    material: 'Len Cotton Milk 50g - Trắng tinh',
    quantity: '2 cuộn'
  }],

  materialCost: 75000,
  productionTime: 5,
  sellingPrice: 280000,
  profit: 205000
},
{
  id: '2',
  name: 'Túi len móc handmade',
  category: 'Túi',
  emoji: '👜',
  emojiBg: 'bg-amber-100',
  bom: [
  {
    material: 'Len Nhung Đũa - Be',
    quantity: '4 cuộn'
  },
  {
    material: 'Sợi Dệt Trơn - Đen',
    quantity: '2 cuộn'
  }],

  materialCost: 90000,
  productionTime: 6,
  sellingPrice: 350000,
  profit: 260000
},
{
  id: '3',
  name: 'Mũ len beanie',
  category: 'Mũ',
  emoji: '🧶',
  emojiBg: 'bg-stone-100',
  bom: [
  {
    material: 'Len Cotton Milk 50g - Trắng tinh',
    quantity: '2 cuộn'
  },
  {
    material: 'Sợi Dệt Trơn - Đen',
    quantity: '1 cuộn'
  }],

  materialCost: 45000,
  productionTime: 3,
  sellingPrice: 180000,
  profit: 135000
},
{
  id: '4',
  name: 'Thú nhồi bông Amigurumi',
  category: 'Thú bông',
  emoji: '🧸',
  emojiBg: 'bg-pink-100',
  bom: [
  {
    material: 'Len Cotton Milk 50g - Đỏ tươi',
    quantity: '2 cuộn'
  },
  {
    material: 'Len Cotton Milk 50g - Trắng tinh',
    quantity: '1 cuộn'
  },
  {
    material: 'Len Nhung Đũa - Be',
    quantity: '1 cuộn'
  },
  {
    material: 'Sợi Dệt Trơn - Đen',
    quantity: '1 cuộn'
  }],

  materialCost: 75000,
  productionTime: 4.5,
  sellingPrice: 320000,
  profit: 245000
}];

function formatVND(value: number): string {
  return value.toLocaleString('vi-VN') + ' đ';
}
export function Products() {
  const totalProducts = PRODUCTS.length;
  const avgPrice = Math.round(
    PRODUCTS.reduce((s, p) => s + p.sellingPrice, 0) / totalProducts
  );
  const avgTime = (
  PRODUCTS.reduce((s, p) => s + p.productionTime, 0) / totalProducts).
  toFixed(1);
  const avgProfit = Math.round(
    PRODUCTS.reduce((s, p) => s + p.profit, 0) / totalProducts
  );
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">
            Quản lý sản phẩm &amp; BOM
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Tạo sản phẩm và quản lý công thức nguyên liệu (Bill of Materials)
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Tạo sản phẩm mới
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm text-stone-500 mb-2">Tổng sản phẩm</p>
            <h3 className="text-3xl font-bold text-stone-900">
              {totalProducts}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-iconBg flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-craft-primary" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm text-stone-500 mb-2">Giá trị TB/sản phẩm</p>
            <h3 className="text-3xl font-bold text-stone-900">
              {formatVND(avgPrice)}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-iconBg flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6 text-craft-primary" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm text-stone-500 mb-2">Thời gian TB</p>
            <h3 className="text-3xl font-bold text-stone-900">{avgTime} giờ</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-iconBg flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6 text-craft-primary" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-sm text-stone-500 mb-2">Lợi nhuận TB</p>
            <h3 className="text-3xl font-bold text-stone-900">
              {formatVND(avgProfit)}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-iconBg flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6 text-craft-primary" />
          </div>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {PRODUCTS.map((product) =>
        <div
          key={product.id}
          className="bg-white rounded-xl border border-stone-100 shadow-sm flex flex-col overflow-hidden">
          
            {/* Card Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                className={`h-12 w-12 ${product.emojiBg} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                
                  {product.emoji}
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900">
                    {product.name}
                  </h4>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-stone-100 text-stone-600 text-xs font-medium rounded-md">
                    {product.category}
                  </span>
                </div>
              </div>

              {/* BOM List */}
              <div className="mt-4">
                <p className="text-sm font-medium text-stone-500 mb-2">
                  Bill of Materials:
                </p>
                <div className="space-y-1.5">
                  {product.bom.map((item, idx) =>
                <div key={idx} className="flex justify-between text-sm">
                      <span className="text-stone-600">{item.material}</span>
                      <span className="text-stone-800 font-medium tabular-nums">
                        {item.quantity}
                      </span>
                    </div>
                )}
                </div>
              </div>
            </div>

            {/* Card Footer - Costs */}
            <div className="px-6 pb-6 pt-2 mt-auto">
              <div className="border-t border-stone-100 pt-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Chi phí NVL:</span>
                  <span className="text-stone-800 font-medium tabular-nums">
                    {formatVND(product.materialCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Thời gian làm:</span>
                  <span className="text-stone-800 font-medium tabular-nums">
                    {product.productionTime} giờ
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-900 font-semibold">Giá bán:</span>
                  <span className="text-stone-900 font-bold tabular-nums">
                    {formatVND(product.sellingPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-900 font-semibold">
                    Lợi nhuận:
                  </span>
                  <span className="text-emerald-600 font-bold tabular-nums">
                    {formatVND(product.profit)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <Button
                variant="secondary"
                size="sm"
                className="flex-1 gap-1.5">
                
                  <Edit2 className="h-3.5 w-3.5" />
                  Sửa
                </Button>
                <Button size="sm" className="flex-1 gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Bắt đầu sản xuất
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>);

}
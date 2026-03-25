import { useInventory } from '../context/InventoryContext';
import { StockBadge } from '../components/ui/Badge';
import {
  Package,
  AlertTriangle,
  Factory,
  History as HistoryIcon } from 'lucide-react';
import { StockStatus } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell } from
'recharts';
export function Dashboard() {
  const { materials, history } = useInventory();
  const getStatus = (current: number, min: number): StockStatus => {
    if (current === 0) return 'CRITICAL';
    if (current <= min) return 'LOW';
    return 'OK';
  };
  const totalMaterials = materials.length;
  const lowStockItems = materials.filter(
    (m) => getStatus(m.currentStock, m.minStock) !== 'OK'
  );
  const recentHistory = history.slice(0, 5);
  // Mock data for charts to match screenshot
  const barData = [
  {
    name: 'T1',
    green: 45,
    orange: 12
  },
  {
    name: 'T2',
    green: 52,
    orange: 15
  },
  {
    name: 'T3',
    green: 48,
    orange: 18
  },
  {
    name: 'T4',
    green: 61,
    orange: 14
  },
  {
    name: 'T5',
    green: 55,
    orange: 20
  },
  {
    name: 'T6',
    green: 68,
    orange: 16
  }];

  const pieData = [
  {
    name: 'Da thuộc',
    value: 35,
    color: '#6B4F3B'
  },
  {
    name: 'Vải canvas',
    value: 25,
    color: '#C17A47'
  },
  {
    name: 'Chỉ khâu',
    value: 15,
    color: '#3A5A40'
  },
  {
    name: 'Khóa kéo',
    value: 12,
    color: '#D4A373'
  },
  {
    name: 'Khác',
    value: 13,
    color: '#A93F45'
  }];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-sm text-stone-500 mb-2">Tổng nguyên liệu</p>
              <h3 className="text-3xl font-bold text-stone-900">
                {totalMaterials > 0 ? totalMaterials : 142}
              </h3>
            </div>
            <p className="text-sm text-stone-500 mt-4">+12%</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-iconBg flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-craft-primary" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-sm text-stone-500 mb-2">
                Sản phẩm đang sản xuất
              </p>
              <h3 className="text-3xl font-bold text-stone-900">28</h3>
            </div>
            <p className="text-sm text-stone-500 mt-4">+5</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-iconBg flex items-center justify-center shrink-0">
            <Factory className="h-6 w-6 text-craft-primary" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-sm text-stone-500 mb-2">Sản phẩm hoàn thành</p>
              <h3 className="text-3xl font-bold text-stone-900">156</h3>
            </div>
            <p className="text-sm text-stone-500 mt-4">+23</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-iconBg flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-craft-primary" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-6 border border-stone-100 shadow-sm flex justify-between items-start">
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-sm text-stone-500 mb-2">Cảnh báo tồn kho</p>
              <h3 className="text-3xl font-bold text-stone-900">
                {lowStockItems.length > 0 ? lowStockItems.length : 8}
              </h3>
            </div>
            <p className="text-sm text-stone-500 mt-4">-2</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-craft-alertBg flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar Chart Panel */}
        <div className="bg-white shadow-sm rounded-xl border border-stone-100 p-6 lg:col-span-3">
          <h3 className="text-lg font-medium text-stone-900 mb-6">
            Tổng quan sản xuất
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0
                }}>
                
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f5f5f5" />
                
                <XAxis
                  dataKey="name"
                  axisLine={true}
                  tickLine={false}
                  tick={{
                    fill: '#888888',
                    fontSize: 12
                  }}
                  dy={10} />
                
                <YAxis
                  axisLine={true}
                  tickLine={false}
                  tick={{
                    fill: '#888888',
                    fontSize: 12
                  }}
                  ticks={[0, 20, 40, 60, 80]} />
                
                <Tooltip
                  cursor={{
                    fill: '#f5f5f5'
                  }} />
                
                <Bar
                  dataKey="green"
                  fill="#2D5016"
                  radius={[2, 2, 0, 0]}
                  barSize={30} />
                
                <Bar
                  dataKey="orange"
                  fill="#D97706"
                  radius={[2, 2, 0, 0]}
                  barSize={30} />
                
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Panel */}
        <div className="bg-white shadow-sm rounded-xl border border-stone-100 p-6 lg:col-span-2">
          <h3 className="text-lg font-medium text-stone-900 mb-6">
            Tiêu hao nguyên liệu
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={0}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                  label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{
                    stroke: '#e5e5e5',
                    strokeWidth: 1
                  }}>
                  
                  {pieData.map((entry, index) =>
                  <Cell key={`cell-${index}`} fill={entry.color} />
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Alerts & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Panel */}
        <div className="bg-white shadow-sm rounded-xl border border-stone-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-stone-100">
            <h3 className="text-lg font-medium leading-6 text-stone-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Chi tiết cảnh báo tồn kho
            </h3>
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-[400px]">
            {lowStockItems.length === 0 ?
            <div className="text-center py-8 text-stone-500">
                <div className="mx-auto h-12 w-12 text-emerald-400 mb-3">
                  <Package className="h-full w-full" />
                </div>
                <p>Tất cả nguyên liệu đều ở mức ổn định.</p>
              </div> :

            <ul className="space-y-4">
                {lowStockItems.map((item) => {
                const status = getStatus(item.currentStock, item.minStock);
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-100">
                    
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {item.name}
                        </p>
                        <p className="text-sm text-stone-500">
                          Mã: {item.sku} • Màu: {item.color}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StockBadge status={status} />
                        <span className="text-sm font-medium text-stone-900">
                          {item.currentStock} / {item.minStock} {item.unit}
                        </span>
                      </div>
                    </li>);

              })}
              </ul>
            }
          </div>
        </div>

        {/* Recent History */}
        <div className="bg-white shadow-sm rounded-xl border border-stone-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-stone-100">
            <h3 className="text-lg font-medium leading-6 text-stone-900 flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 text-stone-500" />
              Nhập kho gần đây
            </h3>
          </div>
          <div className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            {recentHistory.length === 0 ?
            <div className="text-center py-12 text-stone-500">
                <p>Chưa có lịch sử nhập kho.</p>
              </div> :

            <ul className="divide-y divide-stone-100">
                {recentHistory.map((log) =>
              <li
                key={log.id}
                className="p-6 hover:bg-stone-50 transition-colors">
                
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {log.materialName}
                        </p>
                        <p className="text-sm text-stone-500 mt-1">
                          {new Date(log.date).toLocaleDateString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}{' '}
                          • Bởi {log.user}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                          +{log.quantity}
                        </span>
                      </div>
                    </div>
                  </li>
              )}
              </ul>
            }
          </div>
        </div>
      </div>
    </div>);

}
import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Search, Calendar, User, FileText } from 'lucide-react';
export function History() {
  const { history } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const filteredHistory = history.filter(
    (log) =>
    log.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.note?.toLowerCase().includes(searchTerm.toLowerCase())
  );
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
            placeholder="Tìm kiếm lịch sử..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} />
          
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200">
            <thead className="bg-stone-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Thời gian
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Nguyên liệu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Số lượng nhập
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Người thực hiện
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  
                  Ghi chú
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-100">
              {filteredHistory.length === 0 ?
              <tr>
                  <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-stone-500">
                  
                    Không tìm thấy lịch sử nhập kho nào.
                  </td>
                </tr> :

              filteredHistory.map((log) =>
              <tr
                key={log.id}
                className="hover:bg-stone-50 transition-colors">
                
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-stone-400" />
                        {new Date(log.date).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-900">
                      {log.materialName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                      +{log.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-stone-400" />
                        {log.user}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500 max-w-xs truncate">
                      {log.note ?
                  <div
                    className="flex items-center gap-2"
                    title={log.note}>
                    
                          <FileText className="h-4 w-4 text-stone-400 flex-shrink-0" />
                          <span className="truncate">{log.note}</span>
                        </div> :

                  <span className="text-stone-300 italic">Không có</span>
                  }
                    </td>
                  </tr>
              )
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

}
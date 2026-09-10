import React, { useState } from 'react';
import { Area, AreaId, Table, Order } from '../types';
import {
  X,
  Plus,
  Trash2,
  Layers,
  LayoutGrid,
  Users,
  AlertTriangle,
  Check,
  Tag,
  Hash,
  Info,
  ShieldAlert,
  Download,
  Upload,
} from 'lucide-react';

interface TableManagementModalProps {
  areas: Area[];
  tables: Table[];
  orders: Order[];
  onClose: () => void;
  onAddTable: (newTable: { name: string; code: string; areaId: AreaId; capacity: number }) => void;
  onDeleteTable: (tableId: string) => void;
  onAddArea: (newArea: { name: string; badgeColor: string }) => void;
  onDeleteArea: (areaId: AreaId) => void;
  onImportData?: (areas: Area[], tables: Table[]) => void;
  onToast?: (message: string) => void;
}

const BADGE_COLOR_OPTIONS = [
  { label: 'Xanh dương', value: 'bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'Tím', value: 'bg-purple-100 text-purple-800 border-purple-200' },
  { label: 'Xanh ngọc', value: 'bg-teal-100 text-teal-800 border-teal-200' },
  { label: 'Vàng cam', value: 'bg-amber-100 text-amber-800 border-amber-200' },
  { label: 'Hồng phấn', value: 'bg-rose-100 text-rose-800 border-rose-200' },
  { label: 'Xanh lá', value: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { label: 'Chàm', value: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { label: 'Xám sang', value: 'bg-slate-100 text-slate-800 border-slate-200' },
];

export const TableManagementModal: React.FC<TableManagementModalProps> = ({
  areas,
  tables,
  orders,
  onClose,
  onAddTable,
  onDeleteTable,
  onAddArea,
  onDeleteArea,
  onImportData,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'areas'>('tables');

  // Confirmation states to avoid blocked browser window.confirm
  const [tablePendingDeleteId, setTablePendingDeleteId] = useState<string | null>(null);
  const [areaPendingDeleteId, setAreaPendingDeleteId] = useState<string | null>(null);

  // Table creation state
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId>(areas[0]?.id || '');
  const [newTableName, setNewTableName] = useState('');
  const [newTableCode, setNewTableCode] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);

  // Area creation state
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState(BADGE_COLOR_OPTIONS[0].value);

  // Helper: check if a table is currently occupied with active items
  const isTableOccupied = (table: Table) => {
    if (table.status === 'empty') return false;
    if (!table.currentOrderId) return false;
    const order = orders.find((o) => o.id === table.currentOrderId);
    if (!order) return false;
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    return totalQty > 0;
  };

  // Tables in the selected area
  const tablesInSelectedArea = tables.filter((t) => t.areaId === selectedAreaId);

  // Auto-generate suggestion when area changes
  const handleSelectArea = (areaId: AreaId) => {
    setSelectedAreaId(areaId);
    const existingCount = tables.filter((t) => t.areaId === areaId).length;
    const targetArea = areas.find((a) => a.id === areaId);
    const prefix = targetArea ? targetArea.name.split(' ').map((w) => w[0]).join('').toUpperCase() : 'B';
    const nextNum = existingCount + 1;
    setNewTableName(`Bàn ${nextNum}`);
    setNewTableCode(`${prefix}-${nextNum.toString().padStart(2, '0')}`);
  };

  // Handle Add Table Submit
  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newTableName.trim();
    if (!trimmedName || !selectedAreaId) return;

    const code = newTableCode.trim() || `B-${Date.now().toString().slice(-4)}`;
    onAddTable({
      name: trimmedName,
      code: code.toUpperCase(),
      areaId: selectedAreaId,
      capacity: Number(newTableCapacity) || 4,
    });

    // Reset with next suggestion
    const existingCount = tables.filter((t) => t.areaId === selectedAreaId).length + 1;
    const targetArea = areas.find((a) => a.id === selectedAreaId);
    const prefix = targetArea ? targetArea.name.split(' ').map((w) => w[0]).join('').toUpperCase() : 'B';
    setNewTableName(`Bàn ${existingCount + 1}`);
    setNewTableCode(`${prefix}-${(existingCount + 1).toString().padStart(2, '0')}`);
  };

  // Handle Add Area Submit
  const handleAddAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newAreaName.trim();
    if (!trimmedName) return;

    onAddArea({
      name: trimmedName,
      badgeColor: newAreaColor,
    });

    setNewAreaName('');
  };

  // Export Data
  const handleExportData = () => {
    try {
      const dataToExport = { areas, tables };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ban-khu-vuc-quan-nuong-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (onToast) onToast('Đã tải xuống file sao lưu Bàn & Khu vực thành công!');
    } catch (err) {
      console.error('Export failed', err);
      if (onToast) onToast('Không thể xuất file. Vui lòng thử lại.');
    }
  };

  // Import Data
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.areas) && Array.isArray(parsed.tables)) {
          if (onImportData) {
            onImportData(parsed.areas, parsed.tables);
          }
          if (onToast) onToast(`Đã nạp thành công ${parsed.areas.length} khu vực và ${parsed.tables.length} bàn!`);
        } else {
          if (onToast) onToast('File không đúng định dạng Bàn & Khu vực!');
        }
      } catch (err) {
        console.error('Import parse error', err);
        if (onToast) onToast('Lỗi khi đọc file!');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="modal-table-management"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                Quản Lý Bàn Ăn & Khu Vực
              </h2>
              <p className="text-xs text-slate-400">
                Thêm/bớt bàn trong khu vực hoặc tạo thêm/xóa bỏ khu vực
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                id="import-tables-input"
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleExportData}
                title="Sao lưu Bàn & Khu vực"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xuất file</span>
              </button>
              <label
                htmlFor="import-tables-input"
                title="Nhập Bàn & Khu vực"
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nhập file</span>
              </label>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'tables'
                ? 'border-amber-500 text-amber-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            1. Quản lý Bàn ăn ({tables.length} bàn)
          </button>

          <button
            onClick={() => setActiveTab('areas')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'areas'
                ? 'border-amber-500 text-amber-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            2. Quản lý Khu vực ({areas.length} khu vực)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: QUẢN LÝ BÀN ĂN */}
          {activeTab === 'tables' && (
            <div className="space-y-6">
              {/* Form Add Table */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-600" />
                  Thêm bàn mới vào khu vực
                </h3>

                <form onSubmit={handleAddTableSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Khu vực:
                    </label>
                    <select
                      value={selectedAreaId}
                      onChange={(e) => handleSelectArea(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tên bàn:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Bàn 5"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mã bàn:
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: DD-05"
                      value={newTableCode}
                      onChange={(e) => setNewTableCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="sm:col-span-1 flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Số ghế:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-colors whitespace-nowrap h-[38px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm bàn
                    </button>
                  </div>
                </form>
              </div>

              {/* Table List by Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      Danh sách bàn hiện có ({tablesInSelectedArea.length} bàn)
                    </h3>
                    <span className="text-xs text-slate-500">
                      trong khu vực{' '}
                      <strong className="text-slate-700">
                        {areas.find((a) => a.id === selectedAreaId)?.name}
                      </strong>
                    </span>
                  </div>

                  {/* Filter area pill buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-xs scrollbar-none">
                    {areas.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => handleSelectArea(a.id)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                          selectedAreaId === a.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>

                {tablesInSelectedArea.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm font-semibold text-slate-600">
                      Khu vực này hiện chưa có bàn nào!
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hãy dùng biểu mẫu phía trên để thêm bàn đầu tiên cho khu vực này.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {tablesInSelectedArea.map((table) => {
                      const occupied = isTableOccupied(table);
                      return (
                        <div
                          key={table.id}
                          className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{table.name}</span>
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                {table.code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span>{table.capacity} ghế</span>
                              <span>•</span>
                              <span
                                className={`font-semibold ${
                                  occupied ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              >
                                {occupied ? 'Đang có khách' : 'Bàn trống'}
                              </span>
                            </div>
                          </div>

                          <div>
                            {occupied ? (
                              <button
                                disabled
                                title="Bàn đang có khách, không thể xóa"
                                className="p-2 text-slate-300 cursor-not-allowed rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : tablePendingDeleteId === table.id ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteTable(table.id);
                                    setTablePendingDeleteId(null);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                >
                                  Xóa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTablePendingDeleteId(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-all"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setTablePendingDeleteId(table.id)}
                                title="Xóa bàn này"
                                className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: QUẢN LÝ KHU VỰC */}
          {activeTab === 'areas' && (
            <div className="space-y-6">
              {/* Form Add Area */}
              <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Tạo thêm khu vực mới
                </h3>

                <form onSubmit={handleAddAreaSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tên khu vực mới:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Gác lửng, Vỉa hè, Phòng lạnh..."
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Màu nhận diện:
                    </label>
                    <select
                      value={newAreaColor}
                      onChange={(e) => setNewAreaColor(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      {BADGE_COLOR_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-colors h-[38px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tạo khu vực
                    </button>
                  </div>
                </form>
              </div>

              {/* Areas List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Danh sách khu vực hiện có ({areas.length} khu vực)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {areas.map((area) => {
                    const areaTables = tables.filter((t) => t.areaId === area.id);
                    const occupiedTables = areaTables.filter(isTableOccupied);
                    const hasOccupied = occupiedTables.length > 0;

                    return (
                      <div
                        key={area.id}
                        className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm sm:text-base">
                              {area.name}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${area.badgeColor}`}>
                              {areaTables.length} bàn
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Đang phục vụ: <strong className={hasOccupied ? 'text-rose-600' : 'text-emerald-600'}>{occupiedTables.length}/{areaTables.length} bàn</strong>
                          </p>
                        </div>

                        <div>
                          {hasOccupied ? (
                            <button
                              disabled
                              title="Khu vực đang có khách ngồi ăn, không thể xóa!"
                              className="p-2 text-slate-300 cursor-not-allowed rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : areaPendingDeleteId === area.id ? (
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 animate-in fade-in duration-150">
                              <span className="text-[11px] text-rose-600 font-bold hidden sm:inline">
                                {areaTables.length > 0 ? `Xóa cả ${areaTables.length} bàn trống?` : 'Xác nhận xóa?'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteArea(area.id);
                                  setAreaPendingDeleteId(null);
                                }}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setAreaPendingDeleteId(null)}
                                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-all"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAreaPendingDeleteId(area.id)}
                              title="Xóa khu vực này"
                              className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-500" />
            <span>Dữ liệu bàn và khu vực được tự động lưu vào bộ nhớ máy.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

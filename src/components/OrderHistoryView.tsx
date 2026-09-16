import React, { useState } from 'react';
import { Order, Area, MenuItem } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { ExcelMockupModal } from './ExcelMockupModal';
import { exportToExcel, exportToCSV } from '../utils/exportExcel';
import {
  DollarSign,
  CheckCircle2,
  Receipt,
  Users,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  TrendingUp,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  X,
} from 'lucide-react';

interface OrderHistoryViewProps {
  completedOrders: Order[];
  areas?: Area[];
  menuItems?: MenuItem[];
  onPreviewReceipt: (order: Order) => void;
  onImportData?: (completedOrders: Order[]) => void;
  onDeleteOrders?: (orderIds: string[]) => void;
  onToast?: (message: string) => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  completedOrders,
  areas = [],
  menuItems = [],
  onPreviewReceipt,
  onImportData,
  onDeleteOrders,
  onToast,
}) => {
  const [isExcelMockupOpen, setIsExcelMockupOpen] = useState(false);
  const [fromDateTime, setFromDateTime] = useState('');
  const [toDateTime, setToDateTime] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isConfirmingDeleteOrders, setIsConfirmingDeleteOrders] = useState(false);

  const isFiltering = Boolean(fromDateTime || toDateTime || selectedAreaId || selectedTableId);

  const areaNameById = new Map(areas.map((a) => [a.id, a.name]));

  // Areas that actually have paid invoices, in the order they first appear
  const availableAreas = Array.from(
    new Map(completedOrders.map((o) => [o.areaId, areaNameById.get(o.areaId) || o.areaId])).entries()
  );

  // Tables that have paid invoices, narrowed down by the selected area (if any)
  const availableTables = Array.from(
    new Map(
      completedOrders
        .filter((o) => !selectedAreaId || o.areaId === selectedAreaId)
        .map((o) => [o.tableId, o.tableName])
    ).entries()
  );

  // Filter completed orders by paid time (completedAt, falls back to updatedAt), area & table
  const filteredOrders = completedOrders.filter((o) => {
    const ts = o.completedAt || o.updatedAt;
    if (fromDateTime && ts < new Date(fromDateTime).getTime()) return false;
    if (toDateTime && ts > new Date(toDateTime).getTime()) return false;
    if (selectedAreaId && o.areaId !== selectedAreaId) return false;
    if (selectedTableId && o.tableId !== selectedTableId) return false;
    return true;
  });

  // Only orders currently visible in the (filtered) list can be selected/deleted
  const visibleSelectedIds = filteredOrders
    .map((o) => o.id)
    .filter((id) => selectedOrderIds.has(id));
  const isAllVisibleSelected = filteredOrders.length > 0 && visibleSelectedIds.length === filteredOrders.length;

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        filteredOrders.forEach((o) => next.delete(o.id));
      } else {
        filteredOrders.forEach((o) => next.add(o.id));
      }
      return next;
    });
  };

  const handleDeleteSelectedOrders = () => {
    if (visibleSelectedIds.length === 0) return;
    if (onDeleteOrders) onDeleteOrders(visibleSelectedIds);
    if (onToast) onToast(`Đã xóa ${visibleSelectedIds.length} hóa đơn khỏi lịch sử!`);
    setSelectedOrderIds(new Set());
    setIsConfirmingDeleteOrders(false);
  };

  const handleAreaFilterChange = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSelectedTableId(''); // reset table filter since it may not belong to the newly picked area
  };

  const handleClearDateFilter = () => {
    setFromDateTime('');
    setToDateTime('');
    setSelectedAreaId('');
    setSelectedTableId('');
  };
  // Export Data
  const handleExportData = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(completedOrders, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `lich-su-hoa-don-quan-nuong-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (onToast) onToast('Đã tải xuống file sao lưu Lịch sử hóa đơn thành công!');
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
        if (Array.isArray(parsed)) {
          if (onImportData) {
            onImportData(parsed);
          }
          if (onToast) onToast(`Đã nạp thành công ${parsed.length} hóa đơn!`);
        } else {
          if (onToast) onToast('File không đúng định dạng Lịch sử hóa đơn!');
        }
      } catch (err) {
        console.error('Import parse error', err);
        if (onToast) onToast('Lỗi khi đọc file!');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // Stats (computed from the date-filtered orders)
  const totalRevenue = filteredOrders.reduce((sum, o) => {
    const subtotal = o.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const orderTotal = o.totalAmount ?? Math.max(0, subtotal - (o.discountAmount || 0));
    return sum + orderTotal;
  }, 0);

  const totalGuests = filteredOrders.reduce((sum, o) => sum + (o.customerCount || 0), 0);

  // Top items sold calculation
  const itemCounts: { [name: string]: { count: number; revenue: number } } = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((i) => {
      if (!itemCounts[i.name]) {
        itemCounts[i.name] = { count: 0, revenue: 0 };
      }
      itemCounts[i.name].count += i.quantity;
      itemCounts[i.name].revenue += i.price * i.quantity;
    });
  });

  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-500" />
          Báo Cáo & Lịch Sử Hóa Đơn
        </h2>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap justify-end">
          <button
            type="button"
            onClick={() => {
              try {
                exportToExcel({ completedOrders: filteredOrders, areas, menuItems });
                if (onToast) onToast('Đã tải xuống file Excel (.xlsx) thành công!');
              } catch (err: unknown) {
                const error = err as Error;
                alert(error.message || 'Lỗi khi xuất file Excel');
              }
            }}
            disabled={filteredOrders.length === 0}
            title="Xuất 2 sheet báo cáo sang file Microsoft Excel (.xlsx) theo khoảng thời gian đang lọc"
            className="px-3 py-2 bg-[#107c41] hover:bg-[#0b5c30] disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-200 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                exportToCSV({ completedOrders: filteredOrders, areas, menuItems });
                if (onToast) onToast('Đã tải xuống file CSV (.csv) thành công!');
              } catch (err: unknown) {
                const error = err as Error;
                alert(error.message || 'Lỗi khi xuất file CSV');
              }
            }}
            disabled={filteredOrders.length === 0}
            title="Xuất báo cáo sang file CSV (.csv) theo khoảng thời gian đang lọc"
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-200 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExcelMockupOpen(true)}
            title="Xem trước cấu trúc các cột file Excel/CSV"
            className="px-3 py-2 bg-[#107c41]/10 hover:bg-[#107c41]/20 text-[#107c41] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-[#107c41]/30 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#107c41]" />
            <span>Xem trước</span>
          </button>

          <input
            id="import-history-input"
            type="file"
            accept=".json"
            onChange={handleImportData}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleExportData}
            title="Sao lưu toàn bộ Lịch sử hóa đơn sang file JSON"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Sao lưu JSON</span>
          </button>
          <label
            htmlFor="import-history-input"
            title="Phục hồi Lịch sử hóa đơn từ file JSON"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer mb-0"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Nhập JSON</span>
          </label>
        </div>
      </div>

      {/* Date/Time Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
          <Calendar className="w-4 h-4 text-amber-500" />
          Bộ lọc hóa đơn:
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-from-datetime" className="text-xs text-slate-500 font-medium">
              Từ:
            </label>
            <input
              id="filter-from-datetime"
              type="datetime-local"
              value={fromDateTime}
              max={toDateTime || undefined}
              onChange={(e) => setFromDateTime(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-to-datetime" className="text-xs text-slate-500 font-medium">
              Đến:
            </label>
            <input
              id="filter-to-datetime"
              type="datetime-local"
              value={toDateTime}
              min={fromDateTime || undefined}
              onChange={(e) => setToDateTime(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-area" className="text-xs text-slate-500 font-medium">
              Khu vực:
            </label>
            <select
              id="filter-area"
              value={selectedAreaId}
              onChange={(e) => handleAreaFilterChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer bg-white"
            >
              <option value="">Tất cả khu vực</option>
              {availableAreas.map(([areaId, areaName]) => (
                <option key={areaId} value={areaId}>
                  {areaName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-table" className="text-xs text-slate-500 font-medium">
              Bàn:
            </label>
            <select
              id="filter-table"
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer bg-white"
            >
              <option value="">Tất cả bàn</option>
              {availableTables.map(([tableId, tableName]) => (
                <option key={tableId} value={tableId}>
                  {tableName}
                </option>
              ))}
            </select>
          </div>

          {isFiltering && (
            <button
              type="button"
              onClick={handleClearDateFilter}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}

          {isFiltering && (
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
              Đang lọc: {filteredOrders.length}/{completedOrders.length} hóa đơn
            </span>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Doanh thu đã thu</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {formatCurrency(totalRevenue)}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Hóa đơn hoàn tất</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {filteredOrders.length} hóa đơn
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Lượt khách phục vụ</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {totalGuests} khách
            </h3>
          </div>
        </div>
      </div>

      {/* Top Selling Items (if any) */}
      {topItems.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Món ăn / Đồ uống bán chạy nhất hôm nay
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {topItems.map(([name, data]) => (
              <div
                key={name}
                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between"
              >
                <span className="font-bold text-xs text-slate-800 line-clamp-1">{name}</span>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{data.count} phần</span>
                  <span className="font-bold text-rose-700">{formatCurrency(data.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              Danh sách hóa đơn đã thanh toán ({filteredOrders.length})
            </h3>
            {filteredOrders.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  className="w-3.5 h-3.5 rounded border-slate-300 accent-amber-500 cursor-pointer"
                />
                Chọn tất cả
              </label>
            )}
          </div>

          {visibleSelectedIds.length > 0 && (
            !isConfirmingDeleteOrders ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDeleteOrders(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa hóa đơn ({visibleSelectedIds.length})
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-slate-600 font-medium">
                  Xóa {visibleSelectedIds.length} hóa đơn đã chọn?
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSelectedOrders}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Xác nhận xóa
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDeleteOrders(false)}
                  className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {completedOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 p-6">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">Chưa có hóa đơn nào hoàn tất</p>
              <p className="text-xs text-slate-400 mt-1">
                Khi thu tiền bàn xong, hóa đơn sẽ tự động lưu trữ tại đây.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 p-6">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">Không có hóa đơn nào trong khoảng thời gian đã chọn</p>
              <button
                type="button"
                onClick={handleClearDateFilter}
                className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 underline cursor-pointer"
              >
                Xóa bộ lọc thời gian
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const subtotal = order.items.reduce(
                (sum, i) => sum + i.price * i.quantity,
                0
              );
              const finalTotal =
                order.totalAmount ?? Math.max(0, subtotal - (order.discountAmount || 0));
              const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

              // Tiền khách đưa & tiền thối lại
              const cashGiven =
                order.cashGiven !== undefined
                  ? order.cashGiven
                  : finalTotal;
              const changeDue = order.changeDue !== undefined ? order.changeDue : 0;

              const isSelected = selectedOrderIds.has(order.id);

              return (
                <div
                  key={order.id}
                  className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOrder(order.id)}
                      className="w-4 h-4 mt-0.5 sm:mt-0 rounded border-slate-300 accent-amber-500 cursor-pointer shrink-0"
                    />

                    <div className="flex-1 min-w-0 pr-0 sm:pr-4 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{order.tableName}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(order.completedAt || order.updatedAt)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            order.paymentMethod === 'transfer'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {order.paymentMethod === 'transfer' ? (
                            <QrCode className="w-3 h-3" />
                          ) : (
                            <Banknote className="w-3 h-3" />
                          )}
                          {order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                        </span>
                        {order.batches && order.batches.length > 0 && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                            {order.batches.length} đợt gọi món
                          </span>
                        )}
                      </div>

                      <p
                        className="text-xs text-slate-600 truncate"
                        title={order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      >
                        {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right whitespace-nowrap space-y-0.5">
                      <div className="flex items-baseline justify-end gap-2">
                        <span className="text-xs text-slate-500 font-medium">{itemCount} món</span>
                        <span className="font-black text-rose-700 text-sm sm:text-base">
                          {formatCurrency(finalTotal)}
                        </span>
                      </div>

                      {/* Chi tiết tiền khách đưa & tiền thối */}
                      <div className="flex items-center justify-end gap-1.5 text-[11px] text-slate-500">
                        <span>
                          Khách đưa: <strong className="text-slate-800 font-bold">{formatCurrency(cashGiven)}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Thối lại: <strong className={changeDue > 0 ? "text-emerald-700 font-bold" : "text-slate-600 font-medium"}>
                            {formatCurrency(changeDue)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onPreviewReceipt(order)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-slate-600" />
                      <span>In lại phiếu</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Excel Preview Mockup Modal */}
      <ExcelMockupModal
        isOpen={isExcelMockupOpen}
        onClose={() => setIsExcelMockupOpen(false)}
        completedOrders={filteredOrders}
        areas={areas}
        menuItems={menuItems}
      />
    </div>
  );
};

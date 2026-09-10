import React, { useState } from 'react';
import { Area, AreaId, Table, Order } from '../types';
import { TableCard } from './TableCard';
import { LayoutGrid, Filter, CheckCircle2, UserCheck, AlertCircle, MapPin, ChevronDown, Settings2 } from 'lucide-react';

interface TableMapProps {
  areas: Area[];
  tables: Table[];
  orders: Order[];
  onSelectTable: (table: Table) => void;
  onOpenTransfer: (table: Table) => void;
  onOpenMerge: (table: Table) => void;
  onOpenTableManagement: () => void;
}

export const TableMap: React.FC<TableMapProps> = ({
  areas,
  tables,
  orders,
  onSelectTable,
  onOpenTransfer,
  onOpenMerge,
  onOpenTableManagement,
}) => {
  const [selectedAreaId, setSelectedAreaId] = useState<AreaId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'empty' | 'occupied' | 'waiting_payment'>('all');

  // Helper to determine effective table status (0 items = empty)
  const isTableEmpty = (table: Table) => {
    if (table.status === 'empty') return true;
    if (!table.currentOrderId) return true;
    const order = orders.find((o) => o.id === table.currentOrderId);
    if (!order) return true;
    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
    return totalQty === 0;
  };

  const isTableWaiting = (table: Table) => {
    return !isTableEmpty(table) && table.status === 'waiting_payment';
  };

  const isTableOccupied = (table: Table) => {
    return !isTableEmpty(table) && table.status === 'occupied';
  };

  // Filter tables
  const filteredTables = tables.filter((table) => {
    if (selectedAreaId !== 'all' && table.areaId !== selectedAreaId) return false;
    if (statusFilter === 'empty' && !isTableEmpty(table)) return false;
    if (statusFilter === 'occupied' && !isTableOccupied(table)) return false;
    if (statusFilter === 'waiting_payment' && !isTableWaiting(table)) return false;
    return true;
  });

  // Calculate stats
  const totalCount = tables.length;
  const emptyCount = tables.filter(isTableEmpty).length;
  const occupiedCount = tables.filter(isTableOccupied).length;
  const waitingCount = tables.filter(isTableWaiting).length;

  return (
    <div className="space-y-4">
      {/* Top Status Indicators bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Tất cả ({totalCount})
          </button>

          <button
            onClick={() => setStatusFilter('empty')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'empty'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Bàn trống ({emptyCount})
          </button>

          <button
            onClick={() => setStatusFilter('occupied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'occupied'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Đang có khách ({occupiedCount})
          </button>

          <button
            onClick={() => setStatusFilter('waiting_payment')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              statusFilter === 'waiting_payment'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Chờ thanh toán ({waitingCount})
          </button>
        </div>

        {/* Action button & hint */}
        <div className="flex items-center gap-2.5 ml-auto w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs text-slate-500 font-medium hidden lg:block">
            💡 Chạm vào bàn để gọi món hoặc thanh toán
          </div>

          <button
            id="btn-open-table-management"
            onClick={onOpenTableManagement}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm border border-slate-700"
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Quản lý Bàn & Khu vực</span>
          </button>
        </div>
      </div>

      {/* Mobile Area Dropdown */}
      <div className="block sm:hidden">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <label htmlFor="mobile-area-select" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>Lọc theo khu vực bàn ăn:</span>
          </label>
          <div className="relative">
            <select
              id="mobile-area-select"
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value as AreaId | 'all')}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all cursor-pointer"
            >
              <option value="all">
                Toàn bộ quán ({totalCount} bàn)
              </option>
              {areas.map((area) => {
                const areaTables = tables.filter((t) => t.areaId === area.id);
                const areaOccupied = areaTables.filter((t) => !isTableEmpty(t)).length;
                return (
                  <option key={area.id} value={area.id}>
                    {area.name} ({areaOccupied}/{areaTables.length} bàn có khách)
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Area Selector Tabs */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedAreaId('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shadow-sm ${
            selectedAreaId === 'all'
              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Toàn bộ quán ({totalCount} bàn)
        </button>

        {areas.map((area) => {
          const areaTables = tables.filter((t) => t.areaId === area.id);
          const areaOccupied = areaTables.filter((t) => !isTableEmpty(t)).length;

          return (
            <button
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border flex items-center gap-2 shadow-sm ${
                selectedAreaId === area.id
                  ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span>{area.name}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  areaOccupied > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {areaOccupied}/{areaTables.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* If "All" is selected, group by Area for clear visual hierarchy */}
      {selectedAreaId === 'all' ? (
        <div className="space-y-6">
          {areas.map((area) => {
            const areaTables = filteredTables.filter((t) => t.areaId === area.id);
            if (areaTables.length === 0) return null;

            return (
              <section key={area.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Khu vực: {area.name}
                    </h2>
                    <span className="text-xs text-slate-500 font-medium">
                      ({areaTables.length} bàn)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {areaTables.map((table) => {
                    const order = orders.find((o) => o.id === table.currentOrderId);
                    return (
                      <TableCard
                        key={table.id}
                        table={table}
                        order={order}
                        onSelectTable={onSelectTable}
                        onOpenTransfer={onOpenTransfer}
                        onOpenMerge={onOpenMerge}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* Specific Area Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredTables.map((table) => {
            const order = orders.find((o) => o.id === table.currentOrderId);
            return (
              <TableCard
                key={table.id}
                table={table}
                order={order}
                onSelectTable={onSelectTable}
                onOpenTransfer={onOpenTransfer}
                onOpenMerge={onOpenMerge}
              />
            );
          })}
        </div>
      )}

      {filteredTables.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-slate-500 text-sm">Không có bàn nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      )}
    </div>
  );
};

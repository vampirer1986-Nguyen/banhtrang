import React from 'react';
import { Table, Order } from '../types';
import { formatCurrency, formatTimeAgo } from '../utils/formatters';
import { Users, Clock, ArrowRightLeft, Merge, PlusCircle, CheckCircle2 } from 'lucide-react';

interface TableCardProps {
  table: Table;
  order?: Order;
  onSelectTable: (table: Table) => void;
  onOpenTransfer: (table: Table) => void;
  onOpenMerge: (table: Table) => void;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  order,
  onSelectTable,
  onOpenTransfer,
  onOpenMerge,
}) => {
  // Calculate total amount if order exists
  const totalAmount = order
    ? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0;

  const totalItemsCount = order
    ? order.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  // If table has no items ordered (totalItemsCount === 0) or status is empty, it displays as empty (green)
  const isEmpty = table.status === 'empty' || totalItemsCount === 0;
  const isWaiting = !isEmpty && table.status === 'waiting_payment';
  const isOccupied = !isEmpty && table.status === 'occupied';

  return (
    <div
      id={`table-card-${table.id}`}
      onClick={() => onSelectTable(table)}
      className={`group relative rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between p-3.5 sm:p-4 active:scale-[0.98] select-none ${
        isEmpty
          ? 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-300 hover:border-emerald-500 shadow-sm'
          : isWaiting
          ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-400 hover:border-amber-500 shadow-md ring-2 ring-amber-300/40'
          : 'bg-rose-50/90 hover:bg-rose-100/80 border-rose-400 hover:border-rose-500 shadow-md ring-2 ring-rose-200/50'
      }`}
    >
      {/* Top row: Table name, code, & Status badge */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base text-white shadow-sm ${
                isEmpty ? 'bg-emerald-600' : isWaiting ? 'bg-amber-600' : 'bg-rose-600'
              }`}
            >
              {table.code}
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                {table.name}
              </h3>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Users className="w-3 h-3 text-slate-400" />
                {table.capacity} chỗ ngồi
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isEmpty ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Bàn trống
              </span>
            ) : isWaiting ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 border border-amber-300 animate-bounce">
                Chờ tính tiền
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-200 text-rose-900 border border-rose-300">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                Có khách
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        {isEmpty ? (
          <div className="py-4 my-1 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-emerald-800">Chạm để mở bàn</p>
            <p className="text-[11px] text-emerald-600">Bắt đầu gọi món cho khách</p>
          </div>
        ) : (
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Thời gian:
              </span>
              <span className="font-medium text-slate-700">
                {formatTimeAgo(table.openedAt || order?.createdAt)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Món đã gọi:</span>
              <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {totalItemsCount} món ({order?.items.length || 0} loại)
              </span>
            </div>

            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-slate-600 font-medium">Tạm tính:</span>
              <span className="font-black text-rose-700 text-base">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer for occupied tables */}
      {!isEmpty && (
        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between gap-1.5">
          <button
            id={`btn-transfer-${table.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenTransfer(table);
            }}
            title="Chuyển sang bàn trống khác"
            className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors active:bg-slate-200"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Chuyển bàn</span>
          </button>

          <button
            id={`btn-merge-${table.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMerge(table);
            }}
            title="Gộp đơn vào bàn khác"
            className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors active:bg-slate-200"
          >
            <Merge className="w-3.5 h-3.5 text-purple-600" />
            <span>Gộp bàn</span>
          </button>
        </div>
      )}
    </div>
  );
};

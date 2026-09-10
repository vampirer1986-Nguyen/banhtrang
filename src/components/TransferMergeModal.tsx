import React, { useState } from 'react';
import { Table, Order, Area } from '../types';
import { INITIAL_AREAS } from '../mockData';
import { X, ArrowRightLeft, Merge, Check, AlertCircle } from 'lucide-react';

interface TransferMergeModalProps {
  sourceTable: Table;
  mode: 'transfer' | 'merge';
  allTables: Table[];
  orders: Order[];
  areas?: Area[];
  onClose: () => void;
  onExecuteTransfer: (sourceTableId: string, targetTableId: string) => void;
  onExecuteMerge: (sourceTableId: string, targetTableId: string) => void;
}

export const TransferMergeModal: React.FC<TransferMergeModalProps> = ({
  sourceTable,
  mode,
  allTables,
  orders,
  areas = INITIAL_AREAS,
  onClose,
  onExecuteTransfer,
  onExecuteMerge,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  // Transfer mode requires EMPTY target tables
  // Merge mode requires OCCUPIED/WAITING target tables (not the source table itself)
  const candidateTables = allTables.filter((t) => {
    if (t.id === sourceTable.id) return false;
    if (mode === 'transfer') {
      return t.status === 'empty';
    } else {
      return t.status === 'occupied' || t.status === 'waiting_payment';
    }
  });

  const handleConfirm = () => {
    if (!selectedTargetId) return;
    if (mode === 'transfer') {
      onExecuteTransfer(sourceTable.id, selectedTargetId);
    } else {
      onExecuteMerge(sourceTable.id, selectedTargetId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'transfer' ? (
              <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            ) : (
              <Merge className="w-5 h-5 text-purple-400" />
            )}
            <div>
              <h3 className="font-bold text-base">
                {mode === 'transfer' ? 'Chuyển bàn ăn' : 'Gộp bàn ăn'}
              </h3>
              <p className="text-xs text-slate-400">
                Từ bàn: <span className="text-amber-300 font-bold">{sourceTable.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              {mode === 'transfer'
                ? `Chọn một bàn còn trống để chuyển toàn bộ đơn hàng của ${sourceTable.name} sang.`
                : `Chọn một bàn đang có khách để gộp toàn bộ món ăn từ ${sourceTable.name} sang bàn đó. ${sourceTable.name} sau đó sẽ trở thành bàn trống.`}
            </p>
          </div>
        </div>

        {/* Target Table List Grouped by Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {candidateTables.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="font-semibold text-slate-600">
                {mode === 'transfer'
                  ? 'Hiện không có bàn nào đang trống để chuyển!'
                  : 'Hiện không có bàn nào khác đang có khách để gộp!'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Vui lòng kiểm tra lại sơ đồ bàn của quán.
              </p>
            </div>
          ) : (
            areas.map((area) => {
              const tablesInArea = candidateTables.filter((t) => t.areaId === area.id);
              if (tablesInArea.length === 0) return null;

              return (
                <div key={area.id} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    {area.name}
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tablesInArea.map((target) => {
                      const isSelected = selectedTargetId === target.id;
                      const targetOrder = orders.find((o) => o.id === target.currentOrderId);
                      const itemCount = targetOrder
                        ? targetOrder.items.reduce((s, i) => s + i.quantity, 0)
                        : 0;

                      return (
                        <div
                          key={target.id}
                          onClick={() => setSelectedTargetId(target.id)}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-sm">{target.name}</span>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-[11px] text-slate-500">
                            {mode === 'transfer' ? (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                                Bàn trống • {target.capacity} chỗ
                              </span>
                            ) : (
                              <span className="text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
                                Đang có {itemCount} món
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            disabled={!selectedTargetId}
            onClick={handleConfirm}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              selectedTargetId
                ? mode === 'transfer'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {mode === 'transfer' ? 'Xác nhận chuyển bàn' : 'Xác nhận gộp bàn'}
          </button>
        </div>
      </div>
    </div>
  );
};

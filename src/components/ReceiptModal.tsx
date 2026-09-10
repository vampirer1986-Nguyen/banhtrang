import React from 'react';
import { Order } from '../types';
import { formatCurrency, formatDateTime, formatTimeOnly } from '../utils/formatters';
import { Printer, X, Clock } from 'lucide-react';

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const discount = order.discountAmount || 0;
  const finalTotal = order.totalAmount ?? Math.max(0, subtotal - discount);
  const cashGiven = order.cashGiven !== undefined ? order.cashGiven : finalTotal;
  const changeDue = order.changeDue !== undefined ? order.changeDue : 0;
  const isTransfer = order.paymentMethod === 'transfer';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Phiếu thanh toán
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Content Body (Thermal Receipt Look) */}
        <div id="printable-receipt" className="flex-1 overflow-y-auto p-5 font-mono text-xs text-slate-800 space-y-3 bg-neutral-50">
          {/* Header */}
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
            <h2 className="text-base font-black text-slate-900 uppercase">
              Quán bánh tráng nướng dì Nguyệt
            </h2>
            <p className="text-[11px] text-slate-600">ĐC: 124 Nguyễn Thị Thập, P. Tân Quy, Q.7, TP.HCM</p>
            <p className="text-[11px] text-slate-600">Hotline: 0988 776 655</p>
            <p className="font-bold text-slate-900 text-sm mt-1 uppercase">HÓA ĐƠN THANH TOÁN</p>
          </div>

          {/* Meta Information */}
          <div className="space-y-1 text-[11px] text-slate-700 border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span>Bàn: <strong className="text-slate-900 font-bold">{order.tableName}</strong></span>
              <span>Khách: <strong>{order.customerCount || 2}</strong></span>
            </div>
            <div className="flex justify-between">
              <span>Mã đơn: #{order.id.slice(-6).toUpperCase()}</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            {order.paymentMethod && (
              <div className="flex justify-between">
                <span>Thanh toán:</span>
                <span className="font-bold uppercase">
                  {order.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                </span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-1">
              <span>Tên món</span>
              <span>SL / Đơn giá / T.Tiền</span>
            </div>
            {order.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span className="line-clamp-1">{item.name}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{item.note ? `*Ghi chú: ${item.note}` : ''}</span>
                  <span>{item.quantity} × {formatCurrency(item.price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Kitchen Batches History (if any) */}
          {order.batches && order.batches.length > 0 && (
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2.5 pt-1 text-[11px]">
              <div className="flex items-center gap-1 font-bold text-slate-800">
                <Clock className="w-3 h-3 text-slate-600" />
                <span>Chi tiết các đợt gọi món ({order.batches.length} đợt):</span>
              </div>
              <div className="space-y-1 pl-1">
                {order.batches.map((batch) => (
                  <div key={batch.id} className="text-slate-600 flex justify-between">
                    <span>
                      <strong className="text-slate-700">Đợt {batch.batchNumber}</strong> ({formatTimeOnly(batch.createdAt)}): {batch.items.map(i => `${i.quantity} ${i.name}`).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tổng số lượng món:</span>
              <span className="font-bold">{totalItemCount}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Giảm giá:</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-300">
              <span>TỔNG CỘNG:</span>
              <span className="text-base">{formatCurrency(finalTotal)}</span>
            </div>

            {/* Payment breakdown */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Phương thức:</span>
                <span className="font-semibold">
                  {isTransfer ? 'Chuyển khoản QR' : 'Tiền mặt'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tiền khách đưa:</span>
                <span className="font-bold">{formatCurrency(cashGiven)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>Tiền thối lại:</span>
                <span className={changeDue > 0 ? 'text-emerald-700' : ''}>
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-3 border-t border-dashed border-slate-300 space-y-1 text-[11px] text-slate-500">
            <p className="font-semibold text-slate-700">Cảm ơn Quý khách & Hẹn gặp lại!</p>
            <p className="text-[10px]">Wifi: HuongViet_Free • Pass: 88888888</p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            In hóa đơn
          </button>
        </div>
      </div>
    </div>
  );
};

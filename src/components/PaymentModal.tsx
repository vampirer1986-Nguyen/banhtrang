import React, { useState } from 'react';
import { Order, Table } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  Receipt,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface PaymentModalProps {
  order: Order;
  table: Table;
  onClose: () => void;
  onCompletePayment: (
    orderId: string,
    paymentMethod: 'cash' | 'transfer',
    paymentDetails?: {
      cashGiven: number;
      changeDue: number;
      discountAmount: number;
      totalAmount: number;
    }
  ) => void;
  onPrintReceipt: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  table,
  onClose,
  onCompletePayment,
  onPrintReceipt,
}) => {
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');

  // Total calculation
  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Cash denomination inputs
  const [cashGiven, setCashGiven] = useState<number>(finalTotal);
  const changeDue = Math.max(0, cashGiven - finalTotal);

  // Quick cash buttons
  const cashSuggestions = [
    finalTotal,
    Math.ceil(finalTotal / 50000) * 50000,
    Math.ceil(finalTotal / 100000) * 100000,
    500000,
  ].filter((val, idx, arr) => val >= finalTotal && arr.indexOf(val) === idx);

  // VietQR quick URL (MB Bank standard for Vietnam demo)
  const qrContent = encodeURIComponent(`BAN ${table.code} THANH TOAN`);
  const qrUrl = `https://img.vietqr.io/image/MB-0988776655-compact2.png?amount=${finalTotal}&addInfo=${qrContent}&accountName=BANH%20TRANG%20NUONG%20DI%20NGUYET`;

  const handleFinish = () => {
    onCompletePayment(order.id, method, {
      cashGiven: method === 'cash' ? cashGiven : finalTotal,
      changeDue: method === 'cash' ? changeDue : 0,
      discountAmount,
      totalAmount: finalTotal,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Thanh toán & Trả bàn</h3>
              <p className="text-xs text-slate-400">{table.name} • {order.items.length} món ăn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Bill summary highlight card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Tạm tính tiền món:</span>
              <span className="font-medium text-slate-200">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount selector */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-700/60">
              <span>Giảm giá khuyến mãi:</span>
              <div className="flex items-center gap-1">
                {[0, 5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      discountPercent === pct
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {pct === 0 ? '0%' : `-${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <span className="text-sm font-semibold text-slate-200">Cần thanh toán:</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Hình thức thanh toán
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`py-3 px-3 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  method === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                Tiền mặt
              </button>

              <button
                type="button"
                onClick={() => setMethod('transfer')}
                className={`py-3 px-3 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  method === 'transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5 text-blue-600" />
                Chuyển khoản QR
              </button>
            </div>
          </div>

          {/* Details for Cash */}
          {method === 'cash' ? (
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Tiền khách đưa (VNĐ):
                </label>
                <input
                  type="number"
                  step="1000"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-base sm:text-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {cashSuggestions.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCashGiven(val)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:border-emerald-500 rounded-lg text-slate-700 hover:text-emerald-700 transition-colors shadow-2xs"
                  >
                    {formatCurrency(val)}
                  </button>
                ))}
              </div>

              {/* Change due result */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-slate-700">Tiền thối lại khách:</span>
                <span
                  className={`font-black text-base sm:text-lg ${
                    changeDue < 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {changeDue < 0 ? 'Chưa đủ tiền' : formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          ) : (
            /* Details for QR Transfer */
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col items-center text-center space-y-3">
              <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm inline-block">
                <img
                  src={qrUrl}
                  alt="VietQR code thanh toán"
                  className="w-44 h-44 object-contain mx-auto"
                />
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-bold text-slate-900 text-sm">Quán Ăn Hương Việt</p>
                <p>Ngân hàng: <span className="font-semibold text-slate-800">MB Bank</span> • STK: <span className="font-semibold text-slate-800">0988776655</span></p>
                <p>Nội dung: <span className="font-bold text-blue-700">BAN {table.code} THANH TOAN</span></p>
                <p className="text-[11px] text-slate-500">Khách dùng ứng dụng ngân hàng quét mã QR để thanh toán chính xác {formatCurrency(finalTotal)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onPrintReceipt({
                  ...order,
                  totalAmount: finalTotal,
                  discountAmount,
                  cashGiven: method === 'cash' ? cashGiven : finalTotal,
                  changeDue: method === 'cash' ? changeDue : 0,
                  paymentMethod: method,
                })
              }
              className="px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Receipt className="w-4 h-4 text-slate-600" />
              In hóa đơn
            </button>

            <button
              id="btn-confirm-payment"
              onClick={handleFinish}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <CheckCircle className="w-4 h-4" />
              Đã thu tiền & Trả bàn ({formatCurrency(finalTotal)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { X, FileSpreadsheet, Layers, Info, Check, Eye, AlertCircle, ShoppingBag, Download, FileText } from 'lucide-react';
import { Order, Area, MenuItem } from '../types';
import { formatCurrency } from '../utils/formatters';
import { exportToExcel, exportToCSV } from '../utils/exportExcel';

interface ExcelMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedOrders: Order[];
  areas?: Area[];
  menuItems?: MenuItem[];
}

interface AggregatedItem {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  totalQuantity: number;
  totalRevenue: number;
  revenuePercentage: number;
}

export const ExcelMockupModal: React.FC<ExcelMockupModalProps> = ({
  isOpen,
  onClose,
  completedOrders,
  areas = [],
  menuItems = [],
}) => {
  const [activeSheet, setActiveSheet] = useState<'orders' | 'items'>('orders');

  // Helper map areaId -> Area name
  const areaMap = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [areas]);

  // Helper map menuItemId -> category name
  const menuMap = useMemo(() => {
    const map = new Map<string, { category: string; price: number }>();
    menuItems.forEach((m) => {
      map.set(m.id, {
        category: m.category === 'main' ? 'Món chính / Nướng' : 'Đồ uống',
        price: m.price,
      });
    });
    return map;
  }, [menuItems]);

  // Sheet 1 Computed Totals
  const orderSheetTotals = useMemo(() => {
    let totalItemsCount = 0;
    let totalSubtotal = 0;
    let totalDiscount = 0;
    let totalGrandAmount = 0;
    let cashCount = 0;
    let transferCount = 0;

    completedOrders.forEach((ord) => {
      const itemsCount = ord.items.reduce((sum, it) => sum + it.quantity, 0);
      const subtotal = ord.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const discount = ord.discountAmount || 0;
      const finalTotal = ord.totalAmount !== undefined ? ord.totalAmount : Math.max(0, subtotal - discount);

      totalItemsCount += itemsCount;
      totalSubtotal += subtotal;
      totalDiscount += discount;
      totalGrandAmount += finalTotal;

      if (ord.paymentMethod === 'transfer') {
        transferCount++;
      } else {
        cashCount++;
      }
    });

    return {
      totalOrders: completedOrders.length,
      totalItemsCount,
      totalSubtotal,
      totalDiscount,
      totalGrandAmount,
      cashCount,
      transferCount,
    };
  }, [completedOrders]);

  // Sheet 2 Computed Aggregated Items Sold
  const aggregatedItems = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, { name: string; price: number; quantity: number; revenue: number; category: string }>();

    completedOrders.forEach((ord) => {
      ord.items.forEach((item) => {
        const itemKey = item.menuItemId || item.name;
        const existing = map.get(itemKey);
        const itemSubtotal = item.price * item.quantity;
        const catInfo = menuMap.get(item.menuItemId);
        const categoryName = catInfo ? catInfo.category : 'Món ăn vặt';

        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += itemSubtotal;
        } else {
          map.set(itemKey, {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            revenue: itemSubtotal,
            category: categoryName,
          });
        }
      });
    });

    const totalRevenueAllItems = Array.from(map.values()).reduce((sum, it) => sum + it.revenue, 0);

    const list: AggregatedItem[] = Array.from(map.entries()).map(([id, data]) => {
      const percentage = totalRevenueAllItems > 0 ? (data.revenue / totalRevenueAllItems) * 100 : 0;
      return {
        id,
        name: data.name,
        categoryName: data.category,
        price: data.price,
        totalQuantity: data.quantity,
        totalRevenue: data.revenue,
        revenuePercentage: Math.round(percentage * 10) / 10,
      };
    });

    // Sắp xếp món bán chạy nhất lên đầu
    return list.sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [completedOrders, menuMap]);

  const itemsSheetTotals = useMemo(() => {
    const totalQty = aggregatedItems.reduce((sum, it) => sum + it.totalQuantity, 0);
    const totalRev = aggregatedItems.reduce((sum, it) => sum + it.totalRevenue, 0);
    return { totalQty, totalRev };
  }, [aggregatedItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Excel Title Bar */}
        <div className="bg-[#107c41] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base">MẪU XEM TRƯỚC FILE EXCEL / CSV (DỮ LIỆU THỰC TẾ)</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/20 text-xs text-white/90">
                  {completedOrders.length} hóa đơn đã thanh toán
                </span>
              </div>
              <p className="text-xs text-emerald-100 hidden sm:block">
                Các con số dưới đây được tính toán trực tiếp và đồng bộ 100% từ các đơn đã thanh toán thực tế của quán
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            title="Đóng xem trước"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sheet Switcher Tab Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSheet('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSheet === 'orders'
                  ? 'bg-white text-[#107c41] shadow-xs border border-slate-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sheet 1: Danh Sách Hóa Đơn ({completedOrders.length} Đơn thực tế)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSheet('items')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSheet === 'items'
                  ? 'bg-white text-[#107c41] shadow-xs border border-slate-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sheet 2: Chi Tiết Món Ăn Đã Bán ({aggregatedItems.length} Món)</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kéo ngang để xem toàn bộ các cột</span>
          </div>
        </div>

        {/* Sheet Content Area with Native Horizontal Scroll */}
        <div className="flex-1 overflow-auto bg-slate-50 p-3 sm:p-4">
          {activeSheet === 'orders' ? (
            /* ================= SHEET 1: ĐƠN HÀNG THỰC TẾ ================= */
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="bg-slate-50 p-2.5 border-b border-slate-200 text-xs font-medium text-slate-600 flex items-center justify-between">
                <span>Trang tính: <b>Danh sách Đơn hàng & Doanh thu Thực tế</b></span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold">
                  13 Cột Chuẩn ({completedOrders.length} hóa đơn)
                </span>
              </div>

              {completedOrders.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">Chưa có hóa đơn nào được thanh toán</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Khi bạn thực hiện thanh toán cho bất kỳ bàn ăn nào trong quán, dữ liệu thực tế sẽ lập tức xuất hiện đầy đủ trong bảng tính này.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[1100px]">
                    <thead>
                      <tr className="bg-[#107c41]/10 text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300 text-center w-12 bg-[#107c41]/15">STT</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[120px]">Mã hóa đơn</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[95px]">Ngày tạo</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[80px]">Giờ vào</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[95px]">Giờ thanh toán</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[130px]">Bàn / Khu vực</th>
                        <th className="p-2.5 border-r border-slate-300 text-center min-w-[75px]">Số món</th>
                        <th className="p-2.5 border-r border-slate-300 text-right min-w-[100px]">Tạm tính</th>
                        <th className="p-2.5 border-r border-slate-300 text-right min-w-[90px]">Giảm giá</th>
                        <th className="p-2.5 border-r border-slate-300 text-right min-w-[115px] bg-emerald-50 text-emerald-900">Tổng tiền</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[115px]">Phương thức TT</th>
                        <th className="p-2.5 border-r border-slate-300 text-center min-w-[95px]">Trạng thái</th>
                        <th className="p-2.5 min-w-[130px]">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {completedOrders.map((ord, idx) => {
                        const itemsCount = ord.items.reduce((s, i) => s + i.quantity, 0);
                        const subtotal = ord.items.reduce((s, i) => s + i.price * i.quantity, 0);
                        const discount = ord.discountAmount || 0;
                        const finalTotal = ord.totalAmount !== undefined ? ord.totalAmount : Math.max(0, subtotal - discount);

                        const createdDate = new Date(ord.createdAt);
                        const dateStr = createdDate.toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        });
                        const openTimeStr = createdDate.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        const completedTimeStr = ord.completedAt
                          ? new Date(ord.completedAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : openTimeStr;

                        const areaName = areaMap.get(ord.areaId) || '';
                        const fullTableName = areaName ? `${ord.tableName} (${areaName})` : ord.tableName;

                        const billIdDisplay = ord.id.startsWith('order-')
                          ? `HD-${ord.id.replace('order-', '').slice(0, 8)}`
                          : `HD-${ord.id.slice(0, 8)}`;

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 border-r border-slate-200 text-center font-semibold bg-slate-50">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-blue-700">
                              {billIdDisplay}
                            </td>
                            <td className="p-2.5 border-r border-slate-200">{dateStr}</td>
                            <td className="p-2.5 border-r border-slate-200">{openTimeStr}</td>
                            <td className="p-2.5 border-r border-slate-200">{completedTimeStr}</td>
                            <td className="p-2.5 border-r border-slate-200 font-medium">{fullTableName}</td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-medium">{itemsCount}</td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono">
                              {formatCurrency(subtotal)}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono text-amber-600">
                              {discount > 0 ? `-${formatCurrency(discount)}` : '0 đ'}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                              {formatCurrency(finalTotal)}
                            </td>
                            <td className="p-2.5 border-r border-slate-200">
                              {ord.paymentMethod === 'transfer' ? (
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-medium">
                                  Chuyển khoản
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-medium">
                                  Tiền mặt
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                                Hoàn thành
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 italic max-w-[150px] truncate">
                              {ord.note || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Total Row */}
                    <tfoot>
                      <tr className="bg-[#107c41]/15 text-slate-900 font-bold border-t-2 border-slate-400">
                        <td colSpan={6} className="p-2.5 border-r border-slate-300 text-right">
                          TỔNG CỘNG ({orderSheetTotals.totalOrders} HÓA ĐƠN):
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-bold">
                          {orderSheetTotals.totalItemsCount} món
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-right font-mono">
                          {formatCurrency(orderSheetTotals.totalSubtotal)}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-right font-mono text-amber-700">
                          {orderSheetTotals.totalDiscount > 0
                            ? `-${formatCurrency(orderSheetTotals.totalDiscount)}`
                            : '0 đ'}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-right font-mono text-emerald-900 bg-emerald-200 text-sm">
                          {formatCurrency(orderSheetTotals.totalGrandAmount)}
                        </td>
                        <td colSpan={3} className="p-2.5 text-slate-600 font-normal italic">
                          ({orderSheetTotals.transferCount} Chuyển khoản, {orderSheetTotals.cashCount} Tiền mặt)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ================= SHEET 2: MÓN ĂN ĐÃ BÁN THỰC TẾ ================= */
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="bg-slate-50 p-2.5 border-b border-slate-200 text-xs font-medium text-slate-600 flex items-center justify-between">
                <span>Trang tính: <b>Chi Tiết Món Ăn Đã Bán Thực Tế</b> (Xếp theo số lượng bán giảm dần)</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold">
                  8 Cột Chuẩn ({aggregatedItems.length} món)
                </span>
              </div>

              {aggregatedItems.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">Chưa có món nào trong đơn đã thanh toán</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Khi hoàn tất thanh toán hóa đơn, danh sách và số lượng các món đã bán sẽ được thống kê tự động tại đây.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[780px]">
                    <thead>
                      <tr className="bg-[#107c41]/10 text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-2.5 border-r border-slate-300 text-center w-12 bg-[#107c41]/15">STT</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[90px]">Mã món</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[220px]">Tên món ăn</th>
                        <th className="p-2.5 border-r border-slate-300 min-w-[140px]">Danh mục</th>
                        <th className="p-2.5 border-r border-slate-300 text-right min-w-[100px]">Đơn giá</th>
                        <th className="p-2.5 border-r border-slate-300 text-center min-w-[110px] bg-amber-50 text-amber-900">
                          Số lượng bán
                        </th>
                        <th className="p-2.5 border-r border-slate-300 text-right min-w-[120px] bg-emerald-50 text-emerald-900">
                          Thành tiền
                        </th>
                        <th className="p-2.5 text-center min-w-[115px]">Tỷ trọng doanh thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {aggregatedItems.map((item, idx) => {
                        const itemCode = item.id.startsWith('menu-')
                          ? `MN-${item.id.replace('menu-', '').slice(0, 4).toUpperCase()}`
                          : `MN-${(idx + 1).toString().padStart(2, '0')}`;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 border-r border-slate-200 text-center font-semibold bg-slate-50">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-slate-600">
                              {itemCode}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                              {item.name}
                            </td>
                            <td className="p-2.5 border-r border-slate-200">{item.categoryName}</td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold text-amber-700 bg-amber-50/50">
                              {item.totalQuantity} phần
                            </td>
                            <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                              {formatCurrency(item.totalRevenue)}
                            </td>
                            <td className="p-2.5 text-center font-semibold text-slate-700">
                              {item.revenuePercentage} %
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Total Row */}
                    <tfoot>
                      <tr className="bg-[#107c41]/15 text-slate-900 font-bold border-t-2 border-slate-400">
                        <td colSpan={5} className="p-2.5 border-r border-slate-300 text-right">
                          TỔNG CỘNG MÓN ĐÃ BÁN THỰC TẾ:
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-bold text-amber-900 bg-amber-200">
                          {itemsSheetTotals.totalQty} phần
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-right font-mono text-emerald-900 bg-emerald-200 text-sm">
                          {formatCurrency(itemsSheetTotals.totalRev)}
                        </td>
                        <td className="p-2.5 text-center text-slate-800">100 %</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tips / Note box */}
          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Dữ liệu thực tế khớp 100%:</p>
              <p className="text-slate-600 mt-0.5">
                Bảng này hiện đang lấy trực tiếp từ <b>{completedOrders.length} hóa đơn</b> trong Lịch sử đơn hàng của quán. Tổng doanh thu tạm tính và thực thu luôn khớp hoàn toàn với số liệu báo cáo trên thanh tiêu đề và hóa đơn của quán.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>
              Tổng thực thu: <b className="text-emerald-700 font-mono text-sm">{formatCurrency(orderSheetTotals.totalGrandAmount)}</b> ({completedOrders.length} hóa đơn)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            <button
              type="button"
              onClick={() => {
                try {
                  exportToCSV({ completedOrders, areas, menuItems });
                } catch (err: unknown) {
                  const error = err as Error;
                  alert(error.message || 'Lỗi khi xuất file CSV');
                }
              }}
              disabled={completedOrders.length === 0}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Xuất danh sách đơn hàng sang file .csv"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất CSV (.csv)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                try {
                  exportToExcel({ completedOrders, areas, menuItems });
                } catch (err: unknown) {
                  const error = err as Error;
                  alert(error.message || 'Lỗi khi xuất file Excel');
                }
              }}
              disabled={completedOrders.length === 0}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#107c41] hover:bg-[#0b5c30] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Xuất đầy đủ 2 sheet sang file Microsoft Excel .xlsx"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

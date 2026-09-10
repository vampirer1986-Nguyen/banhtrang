import * as XLSX from 'xlsx';
import { Order, Area, MenuItem } from '../types';

interface ExportDataParams {
  completedOrders: Order[];
  areas?: Area[];
  menuItems?: MenuItem[];
}

// Helper formats
const formatDateAndTime = (dateInput: string | number) => {
  try {
    const d = new Date(dateInput);
    const dateStr = d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: '', timeStr: '' };
  }
};

const getFileTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}`;
};

/**
 * Xuất file Excel (.xlsx) với 2 sheet chuẩn:
 * - Sheet 1: Danh sách đơn hàng & Doanh thu
 * - Sheet 2: Chi tiết món ăn đã bán
 */
export const exportToExcel = ({ completedOrders, areas = [], menuItems = [] }: ExportDataParams) => {
  if (completedOrders.length === 0) {
    throw new Error('Chưa có hóa đơn thanh toán nào để xuất file!');
  }

  // Build lookups
  const areaMap = new Map<string, string>();
  areas.forEach((a) => areaMap.set(a.id, a.name));

  const menuMap = new Map<string, { category: string; price: number }>();
  menuItems.forEach((m) => {
    mapMenuCategory(m, menuMap);
  });

  // 1. DATA CHO SHEET 1: ĐƠN HÀNG
  const ordersSheetData: Record<string, unknown>[] = [];
  let totalItemsCount = 0;
  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalGrand = 0;

  completedOrders.forEach((ord, index) => {
    const itemsCount = ord.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = ord.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = ord.discountAmount || 0;
    const grand = ord.totalAmount !== undefined ? ord.totalAmount : Math.max(0, subtotal - discount);

    totalItemsCount += itemsCount;
    totalSubtotal += subtotal;
    totalDiscount += discount;
    totalGrand += grand;

    const { dateStr, timeStr: openTime } = formatDateAndTime(ord.createdAt);
    const { timeStr: payTime } = ord.completedAt ? formatDateAndTime(ord.completedAt) : { timeStr: openTime };
    const areaName = areaMap.get(ord.areaId) || '';
    const tableDisplay = areaName ? `${ord.tableName} (${areaName})` : ord.tableName;

    const billIdDisplay = ord.id.startsWith('order-')
      ? `HD-${ord.id.replace('order-', '').slice(0, 8)}`
      : `HD-${ord.id.slice(0, 8)}`;

    ordersSheetData.push({
      'STT': index + 1,
      'Mã hóa đơn': billIdDisplay,
      'Ngày tạo': dateStr,
      'Giờ vào': openTime,
      'Giờ thanh toán': payTime,
      'Bàn / Khu vực': tableDisplay,
      'Số món': itemsCount,
      'Tạm tính (VNĐ)': subtotal,
      'Giảm giá (VNĐ)': discount,
      'Tổng tiền (VNĐ)': grand,
      'Phương thức TT': ord.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt',
      'Trạng thái': 'Hoàn thành',
      'Ghi chú': ord.note || '',
    });
  });

  // Thêm dòng Tổng cộng cho Sheet 1
  ordersSheetData.push({
    'STT': '',
    'Mã hóa đơn': 'TỔNG CỘNG',
    'Ngày tạo': '',
    'Giờ vào': '',
    'Giờ thanh toán': '',
    'Bàn / Khu vực': `${completedOrders.length} hóa đơn`,
    'Số món': totalItemsCount,
    'Tạm tính (VNĐ)': totalSubtotal,
    'Giảm giá (VNĐ)': totalDiscount,
    'Tổng tiền (VNĐ)': totalGrand,
    'Phương thức TT': '',
    'Trạng thái': '',
    'Ghi chú': '',
  });

  // 2. DATA CHO SHEET 2: MÓN ĂN ĐÃ BÁN
  const itemMap = new Map<string, { name: string; price: number; quantity: number; revenue: number; category: string }>();

  completedOrders.forEach((ord) => {
    ord.items.forEach((item) => {
      const itemKey = item.menuItemId || item.name;
      const existing = itemMap.get(itemKey);
      const itemSubtotal = item.price * item.quantity;
      const catInfo = menuMap.get(item.menuItemId);
      const categoryName = catInfo ? catInfo.category : 'Món ăn vặt';

      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += itemSubtotal;
      } else {
        itemMap.set(itemKey, {
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          revenue: itemSubtotal,
          category: categoryName,
        });
      }
    });
  });

  const totalRevenueAllItems = Array.from(itemMap.values()).reduce((sum, it) => sum + it.revenue, 0);
  const itemsSheetData: Record<string, unknown>[] = [];
  let totalQtyAll = 0;

  const sortedItems = Array.from(itemMap.entries()).sort((a, b) => b[1].quantity - a[1].quantity);

  sortedItems.forEach(([id, data], index) => {
    const percentage = totalRevenueAllItems > 0 ? Math.round((data.revenue / totalRevenueAllItems) * 1000) / 10 : 0;
    const itemCode = id.startsWith('menu-')
      ? `MN-${id.replace('menu-', '').slice(0, 4).toUpperCase()}`
      : `MN-${(index + 1).toString().padStart(2, '0')}`;

    totalQtyAll += data.quantity;

    itemsSheetData.push({
      'STT': index + 1,
      'Mã món': itemCode,
      'Tên món ăn': data.name,
      'Danh mục': data.category,
      'Đơn giá (VNĐ)': data.price,
      'Số lượng bán': data.quantity,
      'Thành tiền (VNĐ)': data.revenue,
      'Tỷ trọng doanh thu (%)': `${percentage}%`,
    });
  });

  // Dòng tổng cộng cho Sheet 2
  itemsSheetData.push({
    'STT': '',
    'Mã món': 'TỔNG CỘNG',
    'Tên món ăn': `${itemsSheetData.length} món`,
    'Danh mục': '',
    'Đơn giá (VNĐ)': '',
    'Số lượng bán': totalQtyAll,
    'Thành tiền (VNĐ)': totalRevenueAllItems,
    'Tỷ trọng doanh thu (%)': '100%',
  });

  // TẠO WORKBOOK VÀ ADD 2 SHEETS
  const wb = XLSX.utils.book_new();

  const wsOrders = XLSX.utils.json_to_sheet(ordersSheetData);
  const wsItems = XLSX.utils.json_to_sheet(itemsSheetData);

  // Căn chỉnh độ rộng cột tối ưu
  wsOrders['!cols'] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã hóa đơn
    { wch: 14 }, // Ngày tạo
    { wch: 10 }, // Giờ vào
    { wch: 15 }, // Giờ thanh toán
    { wch: 22 }, // Bàn / Khu vực
    { wch: 10 }, // Số món
    { wch: 16 }, // Tạm tính
    { wch: 15 }, // Giảm giá
    { wch: 18 }, // Tổng tiền
    { wch: 16 }, // Phương thức TT
    { wch: 14 }, // Trạng thái
    { wch: 22 }, // Ghi chú
  ];

  wsItems['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã món
    { wch: 32 }, // Tên món
    { wch: 18 }, // Danh mục
    { wch: 15 }, // Đơn giá
    { wch: 14 }, // Số lượng
    { wch: 18 }, // Thành tiền
    { wch: 22 }, // Tỷ trọng
  ];

  XLSX.utils.book_append_sheet(wb, wsOrders, 'Danh_Sach_Don_Hang');
  XLSX.utils.book_append_sheet(wb, wsItems, 'Chi_Tiet_Mon_Ban');

  const filename = `BaoCao_QuanNuong_${getFileTimestamp()}.xlsx`;
  XLSX.writeFile(wb, filename);
};

/**
 * Xuất file CSV (.csv) chuẩn UTF-8 (có BOM chống lỗi font chữ tiếng Việt trên Microsoft Excel)
 */
export const exportToCSV = ({ completedOrders, areas = [] }: ExportDataParams) => {
  if (completedOrders.length === 0) {
    throw new Error('Chưa có hóa đơn thanh toán nào để xuất file!');
  }

  const areaMap = new Map<string, string>();
  areas.forEach((a) => areaMap.set(a.id, a.name));

  const headers = [
    'STT',
    'Mã hóa đơn',
    'Ngày tạo',
    'Giờ vào',
    'Giờ thanh toán',
    'Bàn / Khu vực',
    'Số món',
    'Tạm tính (VNĐ)',
    'Giảm giá (VNĐ)',
    'Tổng tiền (VNĐ)',
    'Phương thức TT',
    'Trạng thái',
    'Ghi chú',
  ];

  const escapeCSV = (value: string | number) => {
    const stringValue = String(value ?? '');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const rows: string[] = [];
  rows.push(headers.map(escapeCSV).join(','));

  let totalItemsCount = 0;
  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalGrand = 0;

  completedOrders.forEach((ord, index) => {
    const itemsCount = ord.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = ord.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = ord.discountAmount || 0;
    const grand = ord.totalAmount !== undefined ? ord.totalAmount : Math.max(0, subtotal - discount);

    totalItemsCount += itemsCount;
    totalSubtotal += subtotal;
    totalDiscount += discount;
    totalGrand += grand;

    const { dateStr, timeStr: openTime } = formatDateAndTime(ord.createdAt);
    const { timeStr: payTime } = ord.completedAt ? formatDateAndTime(ord.completedAt) : { timeStr: openTime };
    const areaName = areaMap.get(ord.areaId) || '';
    const tableDisplay = areaName ? `${ord.tableName} (${areaName})` : ord.tableName;

    const billIdDisplay = ord.id.startsWith('order-')
      ? `HD-${ord.id.replace('order-', '').slice(0, 8)}`
      : `HD-${ord.id.slice(0, 8)}`;

    const row = [
      index + 1,
      billIdDisplay,
      dateStr,
      openTime,
      payTime,
      tableDisplay,
      itemsCount,
      subtotal,
      discount,
      grand,
      ord.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt',
      'Hoàn thành',
      ord.note || '',
    ];

    rows.push(row.map(escapeCSV).join(','));
  });

  // Hàng tổng cộng
  const totalRow = [
    '',
    'TỔNG CỘNG',
    '',
    '',
    '',
    `${completedOrders.length} hóa đơn`,
    totalItemsCount,
    totalSubtotal,
    totalDiscount,
    totalGrand,
    '',
    '',
    '',
  ];
  rows.push(totalRow.map(escapeCSV).join(','));

  // Thêm UTF-8 BOM (\uFEFF) để Excel mở tiếng Việt không bị bể font
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `BaoCao_DonHang_${getFileTimestamp()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function mapMenuCategory(m: MenuItem, map: Map<string, { category: string; price: number }>) {
  map.set(m.id, {
    category: m.category === 'main' ? 'Món chính / Nướng' : 'Đồ uống',
    price: m.price,
  });
}

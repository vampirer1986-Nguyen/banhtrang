import React, { useState, useMemo } from 'react';
import { Table, Order, MenuItem, OrderItem, MenuCategory, KitchenBatch } from '../types';
import { formatCurrency, formatDateTime, formatTimeOnly } from '../utils/formatters';
import { DEFAULT_FALLBACK_IMAGE } from './MenuManagement';
import { getReliableFoodImage, DEFAULT_FALLBACK_FOOD_IMAGE } from '../utils/imageUtils';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  Check,
  CreditCard,
  Utensils,
  ArrowRightLeft,
  Merge,
  FileText,
  Clock,
  Users,
  AlertCircle,
  MessageSquareQuote,
  History,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';

interface OrderPOSModalProps {
  table: Table;
  order?: Order;
  menuItems: MenuItem[];
  onClose: () => void;
  onSaveOrder: (updatedOrder: Order, newStatus?: 'serving' | 'waiting_payment') => void;
  onOpenPayment: (order: Order) => void;
  onOpenTransfer: (table: Table) => void;
  onOpenMerge: (table: Table) => void;
  onPreviewReceipt: (order: Order) => void;
}

export const OrderPOSModal: React.FC<OrderPOSModalProps> = ({
  table,
  order,
  menuItems,
  onClose,
  onSaveOrder,
  onOpenPayment,
  onOpenTransfer,
  onOpenMerge,
  onPreviewReceipt,
}) => {
  // Initialize current order state
  const [items, setItems] = useState<OrderItem[]>(order ? [...order.items] : []);
  const [customerCount, setCustomerCount] = useState<number>(order?.customerCount || table.capacity || 2);
  // Trạng thái chỉ do hệ thống quyết định (KDS báo bếp xong toàn bộ món), người dùng không được đổi tay
  const status: 'serving' | 'waiting_payment' = order?.status === 'waiting_payment' ? 'waiting_payment' : 'serving';
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'all' | 'popular'>('all');
  const [menuViewMode, setMenuViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMobileView, setActiveMobileView] = useState<'menu' | 'cart'>('menu');
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState<boolean>(false);
  const [cartTab, setCartTab] = useState<'current' | 'history'>('current');
  // Confirmed batches that have been sent to kitchen
  const [savedBatches, setSavedBatches] = useState<KitchenBatch[]>(() => {
    if (order?.batches && order.batches.length > 0) {
      return order.batches;
    }
    if (order && order.items.length > 0) {
      return [
        {
          id: `batch-init-${order.id}`,
          batchNumber: 1,
          createdAt: order.createdAt || Date.now(),
          items: [...order.items],
          note: 'Báo bếp đợt 1',
        },
      ];
    }
    return [];
  });

  // Calculate items called in current session that have not been sent to kitchen yet
  const pendingBatchItems: OrderItem[] = useMemo(() => {
    const savedQtyMap: Record<string, number> = {};
    savedBatches.forEach((b) => {
      b.items.forEach((it) => {
        savedQtyMap[it.menuItemId] = (savedQtyMap[it.menuItemId] || 0) + it.quantity;
      });
    });

    const deltaItems: OrderItem[] = [];
    items.forEach((it) => {
      const savedQty = savedQtyMap[it.menuItemId] || 0;
      const extra = it.quantity - savedQty;
      if (extra > 0) {
        deltaItems.push({
          ...it,
          quantity: extra,
        });
      }
    });
    return deltaItems;
  }, [items, savedBatches]);

  // Combined batches to display in "Lịch sử gọi"
  const allDisplayBatches: Array<KitchenBatch & { isPending?: boolean }> = useMemo(() => {
    const list: Array<KitchenBatch & { isPending?: boolean }> = [...savedBatches];
    if (pendingBatchItems.length > 0) {
      const totalPendingQty = pendingBatchItems.reduce((s, i) => s + i.quantity, 0);
      list.push({
        id: 'batch-pending',
        batchNumber: savedBatches.length + 1,
        createdAt: Date.now(),
        items: pendingBatchItems,
        note: savedBatches.length === 0 ? `Báo bếp lần đầu (${totalPendingQty} món)` : `Gọi thêm ${totalPendingQty} món`,
        isPending: true,
      });
    }
    return list;
  }, [savedBatches, pendingBatchItems]);

  // Pre-set quick notes for quick tap
  const QUICK_NOTES = ['Ít cay', 'Không ớt', 'Không hành', 'Nhiều đá', 'Không đá', 'Ít ngọt', 'Mang về', 'Làm nhanh'];

  // Helper to find or build "Rau răm" item from menuItems
  const getRauRamItem = (): OrderItem => {
    const found = menuItems.find(
      (m) =>
        m.name.toLowerCase().trim() === 'rau răm' ||
        m.name.toLowerCase().includes('rau răm')
    );
    if (found) {
      return {
        menuItemId: found.id,
        name: found.name,
        price: found.price,
        quantity: 1,
        image: found.image,
      };
    }
    return {
      menuItemId: 'auto-rau-ram',
      name: 'Rau răm',
      price: 0,
      quantity: 1,
    };
  };

  // Helper to check if item is "Combo mỗi loại một cái"
  const isComboMoiLoai = (name: string): boolean => {
    const norm = name.toLowerCase().trim().replace(/\s+/g, ' ');
    return (
      norm.includes('combo') &&
      (norm.includes('mỗi loại') || norm.includes('moi loai') || norm.includes('1 cái') || norm.includes('một cái'))
    );
  };

  // Helper to find sub-item from menu or fallback
  const getSubItem = (keywords: string[], fallbackName: string, fallbackPrice: number): OrderItem => {
    const found = menuItems.find((m) => {
      const n = m.name.toLowerCase().trim();
      return keywords.some((kw) => n.includes(kw.toLowerCase()));
    });
    if (found) {
      return {
        menuItemId: found.id,
        name: found.name,
        price: found.price,
        quantity: 1,
        image: found.image,
      };
    }
    return {
      menuItemId: `auto-${fallbackName.toLowerCase().replace(/\s+/g, '-')}`,
      name: fallbackName,
      price: fallbackPrice,
      quantity: 1,
    };
  };

  // 4 items of "Combo mỗi loại một cái"
  const getComboItems = (): OrderItem[] => {
    return [
      getSubItem(['ốp la', 'op la'], 'Ốp la', 15000),
      getSubItem(['trứng đánh', 'trung danh'], 'Trứng đánh', 15000),
      getSubItem(['hành giòn', 'hanh gion'], 'Hành giòn', 8000),
      getSubItem(['hành mềm', 'hanh mem'], 'Hành mềm', 8000),
    ];
  };

  // Add or increment item
  const handleAddItem = (menuItem: MenuItem) => {
    const isTableInitialStart = items.length === 0 && savedBatches.length === 0;
    const isCombo = isComboMoiLoai(menuItem.name);

    // If combo, split into 4 individual items: 1 ốp la, 1 trứng đánh, 1 hành giòn, 1 hành mềm
    const itemsToAdd: OrderItem[] = isCombo
      ? getComboItems()
      : [
          {
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            image: menuItem.image,
          },
        ];

    setItems((prev) => {
      let copy = [...prev];

      itemsToAdd.forEach((toAdd) => {
        const existingIndex = copy.findIndex((i) => i.menuItemId === toAdd.menuItemId);
        if (existingIndex > -1) {
          copy[existingIndex] = {
            ...copy[existingIndex],
            quantity: copy[existingIndex].quantity + 1,
          };
        } else {
          copy.push({ ...toAdd });
        }
      });

      // If starting to add food to a new table, automatically add "Rau răm"
      if (isTableInitialStart) {
        const isRauRamAlready = itemsToAdd.some(
          (it) =>
            it.name.toLowerCase().trim() === 'rau răm' ||
            it.name.toLowerCase().includes('rau răm')
        );

        if (!isRauRamAlready && !copy.some((it) => it.name.toLowerCase().trim() === 'rau răm')) {
          const rauRam = getRauRamItem();
          copy.push(rauRam);
        }
      }

      return copy;
    });
  };

  // Adjust quantity in Cart (Món hiện tại)
  const handleQuantityChange = (index: number, delta: number) => {
    const targetItem = items[index];
    if (!targetItem) return;

    setItems((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = { ...copy[index], quantity: newQty };
      }
      return copy;
    });

    // If reducing quantity and total in items drops below savedBatches total, deduct from savedBatches
    if (delta < 0) {
      const savedQtyTotal = savedBatches.reduce((sum, b) => {
        const f = b.items.find((it) => it.menuItemId === targetItem.menuItemId);
        return sum + (f ? f.quantity : 0);
      }, 0);

      const newTotalItemQty = targetItem.quantity + delta;
      if (newTotalItemQty < savedQtyTotal) {
        let toDeduct = savedQtyTotal - Math.max(0, newTotalItemQty);
        setSavedBatches((prevBatches) => {
          const copy = prevBatches.map((b) => ({
            ...b,
            items: b.items.map((it) => ({ ...it })),
          }));

          for (let bIdx = copy.length - 1; bIdx >= 0; bIdx--) {
            const batch = copy[bIdx];
            const itIdx = batch.items.findIndex((it) => it.menuItemId === targetItem.menuItemId);
            if (itIdx > -1) {
              const avail = batch.items[itIdx].quantity;
              if (avail <= toDeduct) {
                toDeduct -= avail;
                batch.items.splice(itIdx, 1);
              } else {
                batch.items[itIdx].quantity -= toDeduct;
                toDeduct = 0;
              }
            }
            if (toDeduct <= 0) break;
          }

          return copy
            .filter((b) => b.items.length > 0)
            .map((b, idx) => ({ ...b, batchNumber: idx + 1 }));
        });
      }
    }
  };

  // Remove item in Cart (Món hiện tại)
  const handleRemoveItem = (index: number) => {
    const targetItem = items[index];
    if (!targetItem) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    // Also remove from savedBatches to keep both tabs matching
    setSavedBatches((prevBatches) =>
      prevBatches
        .map((b) => ({
          ...b,
          items: b.items.filter((it) => it.menuItemId !== targetItem.menuItemId),
        }))
        .filter((b) => b.items.length > 0)
        .map((b, idx) => ({ ...b, batchNumber: idx + 1 }))
    );
  };

  // Helper to get current quantity of a menuItem in order (handles combo items as well)
  const getItemQuantityInOrder = (menuItem: MenuItem): number => {
    if (isComboMoiLoai(menuItem.name)) {
      const comboSubItems = getComboItems();
      const quantities = comboSubItems.map((ci) => {
        const found = items.find(
          (it) => it.name.toLowerCase().trim() === ci.name.toLowerCase().trim()
        );
        return found ? found.quantity : 0;
      });
      return quantities.length > 0 ? Math.min(...quantities) : 0;
    }
    const found = items.find((i) => i.menuItemId === menuItem.id);
    return found ? found.quantity : 0;
  };

  // Decrement item directly from menu catalog
  const handleDecrementItem = (menuItem: MenuItem) => {
    if (isComboMoiLoai(menuItem.name)) {
      const comboSubItems = getComboItems();
      comboSubItems.forEach((ci) => {
        const existingIdx = items.findIndex(
          (it) => it.name.toLowerCase().trim() === ci.name.toLowerCase().trim()
        );
        if (existingIdx > -1) {
          handleQuantityChange(existingIdx, -1);
        }
      });
      return;
    }
    const existingIndex = items.findIndex((i) => i.menuItemId === menuItem.id);
    if (existingIndex > -1) {
      handleQuantityChange(existingIndex, -1);
    }
  };

  // Adjust quantity in Batch History (Lịch sử gọi) with 100% two-way sync
  const handleBatchItemQuantityChange = (batchId: string, itemIndex: number, delta: number) => {
    if (batchId === 'batch-pending') {
      // Modifying an item in the pending draft batch
      const targetPendingItem = pendingBatchItems[itemIndex];
      if (!targetPendingItem) return;
      const existingIdx = items.findIndex((it) => it.menuItemId === targetPendingItem.menuItemId);
      if (existingIdx > -1) {
        handleQuantityChange(existingIdx, delta);
      }
      return;
    }

    let affectedMenuItemId = '';
    setSavedBatches((prevBatches) => {
      const nextBatches = prevBatches
        .map((batch) => {
          if (batch.id !== batchId) return batch;
          const targetItem = batch.items[itemIndex];
          if (!targetItem) return batch;

          affectedMenuItemId = targetItem.menuItemId;
          const newQty = targetItem.quantity + delta;
          if (newQty <= 0) {
            return {
              ...batch,
              items: batch.items.filter((_, idx) => idx !== itemIndex),
            };
          } else {
            const updatedItems = [...batch.items];
            updatedItems[itemIndex] = { ...targetItem, quantity: newQty };
            return { ...batch, items: updatedItems };
          }
        })
        .filter((batch) => batch.items.length > 0)
        .map((batch, idx) => ({
          ...batch,
          batchNumber: idx + 1,
        }));

      return nextBatches;
    });

    // Synchronize items in "Món hiện tại" so total count and amount match exactly
    if (affectedMenuItemId) {
      setItems((prevItems) => {
        const existingIdx = prevItems.findIndex((it) => it.menuItemId === affectedMenuItemId);
        if (existingIdx > -1) {
          const newQty = prevItems[existingIdx].quantity + delta;
          if (newQty <= 0) {
            return prevItems.filter((_, i) => i !== existingIdx);
          } else {
            const copy = [...prevItems];
            copy[existingIdx] = { ...copy[existingIdx], quantity: newQty };
            return copy;
          }
        }
        return prevItems;
      });
    }
  };

  // Save note
  const handleSaveNote = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], note: noteInput.trim() || undefined };
      return copy;
    });
    setEditingNoteIndex(null);
    setNoteInput('');
  };

  // Subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Build order object
  const buildCurrentOrder = (batchesToUse?: KitchenBatch[]): Order => {
    return {
      id: order?.id || `ord-${Date.now()}`,
      tableId: table.id,
      tableName: table.name,
      areaId: table.areaId,
      items,
      status,
      customerCount,
      createdAt: order?.createdAt || Date.now(),
      updatedAt: Date.now(),
      batches: batchesToUse !== undefined ? batchesToUse : savedBatches,
    };
  };

  // Helper to record new batch when saving/notifying kitchen
  const calculateBatchesOnSave = (): KitchenBatch[] => {
    if (items.length === 0) {
      return [];
    }

    if (savedBatches.length === 0) {
      // First save for a brand new table
      const totalQty = items.reduce((s, it) => s + it.quantity, 0);
      const firstBatch: KitchenBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        batchNumber: 1,
        createdAt: Date.now(),
        items: [...items],
        note: `Báo bếp lần đầu (${totalQty} món)`,
      };
      return [firstBatch];
    }

    // Existing table with prior saved batches
    if (pendingBatchItems.length > 0) {
      const nextBatchNum = savedBatches.length + 1;
      const totalNewQty = pendingBatchItems.reduce((s, i) => s + i.quantity, 0);
      const newBatch: KitchenBatch = {
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        batchNumber: nextBatchNum,
        createdAt: Date.now(),
        items: [...pendingBatchItems],
        note: `Gọi thêm ${totalNewQty} món`,
      };
      return [...savedBatches, newBatch];
    }

    // No new items added, return savedBatches as is
    return savedBatches;
  };

  // Save changes & notify kitchen
  const handleSaveAndNotify = () => {
    const nextBatches = calculateBatchesOnSave();
    setSavedBatches(nextBatches);
    const current = buildCurrentOrder(nextBatches);
    onSaveOrder(current, status);
    onClose();
  };

  // Payment handler with batch calculation. Chỉ được mở thanh toán khi bàn đang "Chờ thanh toán"
  // (tức bếp đã nấu xong toàn bộ món) — không cho tự ý chuyển trạng thái từ "Đang phục vụ".
  const handleOpenPaymentWithBatches = () => {
    if (status === 'serving') return;
    const nextBatches = calculateBatchesOnSave();
    setSavedBatches(nextBatches);
    const current = { ...buildCurrentOrder(nextBatches), status: 'waiting_payment' as const };
    onSaveOrder(current, 'waiting_payment');
    onOpenPayment(current);
  };

  // Popular items detection
  const POPULAR_KEYWORDS = [
    'combo',
    'trứng đánh',
    'ốp la',
    'hành giòn',
    'hành mềm',
    'bánh tráng',
    '7up',
    'coca',
    'cà phê',
    'trà đào',
    'bò húc',
    'trà đá',
  ];

  const isPopularItem = (item: MenuItem): boolean => {
    const n = item.name.toLowerCase();
    return POPULAR_KEYWORDS.some((kw) => n.includes(kw));
  };

  const popularCount = useMemo(
    () => menuItems.filter((i) => isPopularItem(i)).length,
    [menuItems]
  );

  // Filter and sort menu items (món chính lên đầu tiên, sau đó đến đồ uống)
  const filteredMenuItems = menuItems
    .filter((item) => {
      if (selectedCategory === 'popular') {
        if (!isPopularItem(item)) return false;
      } else if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.name.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.category !== b.category) {
        return a.category === 'main' ? -1 : 1;
      }
      return 0;
    });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-50 w-full h-full sm:h-[94vh] sm:max-w-6xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
              {table.code}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">{table.name}</h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    status === 'waiting_payment'
                      ? 'bg-amber-400 text-slate-950 animate-pulse'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {status === 'waiting_payment' ? 'Chờ thanh toán' : 'Đang phục vụ'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Số khách:
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  <button
                    onClick={() => setCustomerCount((c) => Math.max(1, c - 1))}
                    className="w-4 h-4 rounded text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold text-white px-1">{customerCount}</span>
                  <button
                    onClick={() => setCustomerCount((c) => c + 1)}
                    className="w-4 h-4 rounded text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <>
                <button
                  id="btn-transfer-in-modal"
                  onClick={() => onOpenTransfer(table)}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                  Chuyển bàn
                </button>
                <button
                  id="btn-merge-in-modal"
                  onClick={() => onOpenMerge(table)}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                >
                  <Merge className="w-3.5 h-3.5 text-purple-400" />
                  Gộp bàn
                </button>
                <button
                  id="btn-receipt-in-modal"
                  onClick={() => onPreviewReceipt(buildCurrentOrder())}
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Phiếu tính tiền
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile View Toggle Bar (Only visible on mobile screens) */}
        <div className="flex sm:hidden bg-slate-200 p-1 border-b border-slate-300">
          <button
            onClick={() => setActiveMobileView('menu')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMobileView === 'menu'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Chọn món từ Menu
          </button>
          <button
            onClick={() => setActiveMobileView('cart')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeMobileView === 'cart'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            Đơn của bàn ({totalItemCount}) - {formatCurrency(subtotal)}
          </button>
        </div>

        {/* Main Body Split Screen */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-12">
          {/* LEFT: Menu Selection Catalog (7 cols on desktop) */}
          <div
            className={`sm:col-span-7 flex flex-col border-r border-slate-200 bg-white overflow-hidden ${
              activeMobileView === 'menu' ? 'flex' : 'hidden sm:flex'
            }`}
          >
            {/* Search, View Toggle and Category Filters */}
            <div className="p-3 border-b border-slate-200 space-y-2.5 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm món ăn, đồ uống nhanh..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* View Mode Toggle: Grid ↔ Compact List */}
                <div className="flex items-center bg-slate-200/90 p-1 rounded-xl border border-slate-300 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuViewMode('grid')}
                    title="Chế độ lưới ảnh"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      menuViewMode === 'grid'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuViewMode('list')}
                    title="Chế độ danh sách rút gọn"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      menuViewMode === 'list'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({menuItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('popular')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    selectedCategory === 'popular'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Bán chạy ({popularCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('main')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'main'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🍲 Món chính ({menuItems.filter((i) => i.category === 'main').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('drink')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'drink'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🍺 Đồ uống ({menuItems.filter((i) => i.category === 'drink').length})
                </button>
              </div>
            </div>

            {/* Empty State when no items match search */}
            {filteredMenuItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <Utensils className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Không tìm thấy món phù hợp</p>
                <p className="text-xs text-slate-400 mt-1">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-3 text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : menuViewMode === 'grid' ? (
              /* GRID VIEW - SOLUTION A3: FULL-WIDTH APPETIZING CARDS ON MOBILE, RESPONSIVE GRID ON TABLET/DESKTOP */
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 content-start auto-rows-max sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-3">
                {filteredMenuItems.map((menuItem) => {
                  const quantity = getItemQuantityInOrder(menuItem);
                  const isAvailable = menuItem.isAvailable !== false;
                  const popular = isPopularItem(menuItem);
                  const itemImage = getReliableFoodImage(menuItem.name, menuItem.category, menuItem.image);

                  return (
                    <div
                      key={menuItem.id}
                      onClick={() => {
                        if (isAvailable) handleAddItem(menuItem);
                      }}
                      className={`group relative bg-white rounded-2xl overflow-hidden transition-all flex flex-col justify-between shadow-xs min-h-fit shrink-0 ${
                        !isAvailable
                          ? 'opacity-60 grayscale-[30%] cursor-not-allowed border border-slate-200 bg-slate-50'
                          : quantity > 0
                          ? 'border-2 border-amber-500 shadow-md ring-2 ring-amber-400/30 bg-amber-50/15 cursor-pointer active:scale-[0.99]'
                          : 'border border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer active:scale-[0.99]'
                      }`}
                    >
                      {/* High-definition food banner (Solution A3: Widescreen banner on mobile) */}
                      <div className="relative h-48 sm:h-36 lg:h-38 shrink-0 overflow-hidden bg-slate-100">
                        <img
                          src={itemImage}
                          alt={menuItem.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const fallback = getReliableFoodImage(menuItem.name, menuItem.category);
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            } else {
                              e.currentTarget.src = DEFAULT_FALLBACK_FOOD_IMAGE;
                            }
                          }}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isAvailable ? 'group-hover:scale-105' : ''
                          }`}
                        />
                        {/* Subtle gradient vignette for text legibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/20 pointer-events-none" />

                        {/* Top-left Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[70%]">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[10px] font-bold bg-slate-900/85 text-white backdrop-blur-xs border border-white/10 shadow-xs">
                            {menuItem.category === 'main' ? 'Món chính' : 'Đồ uống'}
                          </span>
                          {popular && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[10px] font-extrabold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs border border-amber-400">
                              <Sparkles className="w-2.5 h-2.5" /> Bán chạy
                            </span>
                          )}
                          {!isAvailable && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[10px] font-black bg-rose-600 text-white shadow-xs">
                              Hết hàng
                            </span>
                          )}
                        </div>

                        {/* Top-right Status Pill */}
                        {quantity > 0 && (
                          <div className="absolute top-2.5 right-2.5">
                            {/* Mobile prominent pill */}
                            <span className="sm:hidden px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md ring-2 ring-white animate-in zoom-in-50 duration-150">
                              Đã gọi: {quantity}
                            </span>
                            {/* Desktop compact circle */}
                            <span className="hidden sm:flex w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs items-center justify-center shadow-md ring-2 ring-white animate-in zoom-in-50 duration-150">
                              {quantity}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content Section */}
                      <div className="p-3 sm:p-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="font-bold text-sm sm:text-sm text-slate-900 line-clamp-1 leading-snug">
                              {menuItem.name}
                            </h4>
                          </div>

                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="font-black text-rose-700 text-base sm:text-sm">
                              {formatCurrency(menuItem.price)}
                            </span>
                            {menuItem.unit && (
                              <span className="text-xs sm:text-[11px] font-semibold text-slate-400">
                                / {menuItem.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Controls */}
                        <div className="mt-3 sm:mt-2.5">
                          {/* MOBILE CONTROLS (Solution A3: Full-width touch-friendly buttons) */}
                          <div className="sm:hidden">
                            {!isAvailable ? (
                              <div className="w-full py-2.5 text-center text-xs font-bold text-slate-400 bg-slate-100 rounded-xl border border-slate-200">
                                Tạm hết món
                              </div>
                            ) : quantity > 0 ? (
                              <div
                                className="w-full flex items-center justify-between bg-slate-900 text-white rounded-xl shadow-xs p-1 border border-slate-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDecrementItem(menuItem);
                                  }}
                                  title="Giảm số lượng"
                                  className="w-11 h-9 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 flex items-center justify-center font-bold transition-colors active:scale-90 cursor-pointer"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400 font-medium">Đã chọn:</span>
                                  <span className="font-black text-sm text-amber-400">
                                    {quantity} {menuItem.unit || 'phần'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddItem(menuItem);
                                  }}
                                  title="Tăng số lượng"
                                  className="w-11 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold transition-colors active:scale-90 cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddItem(menuItem);
                                }}
                                title="Thêm món vào đơn"
                                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Thêm vào đơn</span>
                              </button>
                            )}
                          </div>

                          {/* DESKTOP CONTROLS (Compact Corner Stepper) */}
                          <div className="hidden sm:flex items-center justify-end">
                            {!isAvailable ? (
                              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                Tạm hết
                              </span>
                            ) : quantity > 0 ? (
                              <div
                                className="flex items-center bg-slate-900 text-white rounded-xl shadow-xs p-0.5 border border-slate-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDecrementItem(menuItem);
                                  }}
                                  title="Giảm số lượng"
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-6 sm:w-7 text-center font-black text-xs text-amber-400 select-none">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddItem(menuItem);
                                  }}
                                  title="Tăng số lượng"
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold transition-colors active:scale-90 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddItem(menuItem);
                                }}
                                title="Thêm món"
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center justify-center transition-colors shadow-xs active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* COMPACT LIST VIEW */
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredMenuItems.map((menuItem) => {
                  const quantity = getItemQuantityInOrder(menuItem);
                  const isAvailable = menuItem.isAvailable !== false;
                  const itemImage = getReliableFoodImage(menuItem.name, menuItem.category, menuItem.image);

                  return (
                    <div
                      key={menuItem.id}
                      onClick={() => {
                        if (isAvailable) handleAddItem(menuItem);
                      }}
                      className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        !isAvailable
                          ? 'opacity-60 grayscale-[30%] cursor-not-allowed bg-slate-50 border-slate-200'
                          : quantity > 0
                          ? 'bg-amber-50/70 border-amber-400 shadow-xs cursor-pointer hover:bg-amber-50 ring-1 ring-amber-300'
                          : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50/70 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                          <img
                            src={itemImage}
                            alt={menuItem.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const fallback = getReliableFoodImage(menuItem.name, menuItem.category);
                              if (e.currentTarget.src !== fallback) {
                                e.currentTarget.src = fallback;
                              } else {
                                e.currentTarget.src = DEFAULT_FALLBACK_FOOD_IMAGE;
                              }
                            }}
                            className="w-full h-full object-cover"
                          />
                          {quantity > 0 && (
                            <span className="absolute inset-0 bg-amber-500/85 text-slate-950 font-black text-xs flex items-center justify-center backdrop-blur-xs">
                              {quantity}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                              {menuItem.name}
                            </h4>
                            {!isAvailable && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Hết
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs mt-0.5">
                            <span className="font-extrabold text-rose-700">
                              {formatCurrency(menuItem.price)}
                            </span>
                            {menuItem.unit && (
                              <span className="text-[11px] font-medium text-slate-400">
                                / {menuItem.unit}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {menuItem.category === 'main' ? 'Món chính' : 'Đồ uống'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stepper / Action button */}
                      <div className="shrink-0">
                        {!isAvailable ? (
                          <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            Tạm hết
                          </span>
                        ) : quantity > 0 ? (
                          <div
                            className="flex items-center bg-slate-900 text-white rounded-xl shadow-xs p-0.5 border border-slate-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDecrementItem(menuItem);
                              }}
                              title="Giảm số lượng"
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 sm:w-7 text-center font-black text-xs text-amber-400 select-none">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddItem(menuItem);
                              }}
                              title="Tăng số lượng"
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold transition-colors active:scale-90 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddItem(menuItem);
                            }}
                            title="Thêm món"
                            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors shadow-xs active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Current Order Cart & Billing (5 cols on desktop) */}
          <div
            className={`sm:col-span-5 flex flex-col bg-slate-50 overflow-hidden ${
              activeMobileView === 'cart' ? 'flex' : 'hidden sm:flex'
            }`}
          >
            {/* Cart Header */}
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  {cartTab === 'current' ? `Món đã gọi (${totalItemCount})` : `Lịch sử gọi (${allDisplayBatches.length} đợt)`}
                </h3>
                {cartTab === 'current' && items.length > 0 && (
                  !isConfirmingClearAll ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClearAll(true)}
                      title="Xóa tất cả món đã chọn"
                      className="text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa hết
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 animate-in fade-in duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setItems([]);
                          setSavedBatches([]);
                          setIsConfirmingClearAll(false);
                        }}
                        className="text-[11px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Xác nhận xóa hết
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClearAll(false)}
                        className="text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  )
                )}
              </div>
              <span
                title="Trạng thái chỉ tự động chuyển sang &quot;Chờ thanh toán&quot; khi bếp đã nấu xong toàn bộ món của mọi đợt (không thể đổi thủ công)"
                className={`px-3 py-1 rounded-xl text-xs font-bold border select-none ${
                  status === 'waiting_payment'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                Trạng thái: {status === 'waiting_payment' ? 'Chờ thanh toán' : 'Đang phục vụ'}
              </span>
            </div>

            {/* Cart Tab Switcher */}
            <div className="flex border-b border-slate-200 bg-slate-100/90 px-3 pt-2 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCartTab('current')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  cartTab === 'current'
                    ? 'border-amber-500 text-amber-950 bg-white rounded-t-lg shadow-2xs font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                Món hiện tại ({totalItemCount})
              </button>
              <button
                type="button"
                onClick={() => setCartTab('history')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  cartTab === 'history'
                    ? 'border-amber-500 text-amber-950 bg-white rounded-t-lg shadow-2xs font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                Lịch sử gọi ({allDisplayBatches.length})
              </button>
            </div>

            {/* Cart Item List OR Batch History */}
            {cartTab === 'current' ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Utensils className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">Chưa có món nào được chọn (0 món)</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Bàn hiện có 0 món ăn. Bấm "Xác nhận Bàn trống" bên dưới để đưa bàn về màu xanh ngay lập tức.
                    </p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <div
                      key={`${item.menuItemId}-${index}`}
                      className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                            <h4 className="font-bold text-slate-800 text-sm leading-tight">
                              {item.name}
                            </h4>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatCurrency(item.price)} × {item.quantity} ={' '}
                            <span className="font-bold text-rose-700">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Modifier Buttons */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                          <button
                            onClick={() => handleQuantityChange(index, -1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs active:scale-95 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-black text-slate-800 text-xs sm:text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(index, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center font-bold text-sm shadow-2xs active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(index)}
                          title="Xóa món"
                          className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Note row */}
                      {editingNoteIndex === index ? (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Ghi chú món (VD: ít đá, không hành...)"
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveNote(index)}
                              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-600"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditingNoteIndex(null)}
                              className="px-2 py-1 text-slate-500 text-xs hover:text-slate-800"
                            >
                              Hủy
                            </button>
                          </div>
                          {/* Quick tags */}
                          <div className="flex flex-wrap gap-1">
                            {QUICK_NOTES.map((qn) => (
                              <button
                                key={qn}
                                onClick={() => setNoteInput((prev) => (prev ? `${prev}, ${qn}` : qn))}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
                              >
                                +{qn}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          {item.note ? (
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 font-medium">
                              <MessageSquareQuote className="w-3 h-3 text-amber-600" />
                              {item.note}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Không có ghi chú</span>
                          )}
                          <button
                            onClick={() => {
                              setEditingNoteIndex(index);
                              setNoteInput(item.note || '');
                            }}
                            className="text-[11px] text-blue-600 hover:underline font-medium"
                          >
                            {item.note ? 'Sửa ghi chú' : '+ Thêm ghi chú'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Batch History List */
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {allDisplayBatches.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Clock className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">Chưa có lịch sử báo bếp</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Mỗi lần bạn bấm nút <strong className="text-slate-700">"Lưu & Báo bếp"</strong>, thời gian và các món được gọi sẽ được ghi lại chi tiết theo từng đợt tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
                      <span>Tổng cộng: <strong className="text-slate-800 font-bold">{allDisplayBatches.length} đợt gọi món</strong></span>
                      <span className="text-[11px] text-amber-700 font-medium">Đợt mới nhất ở trên cùng</span>
                    </div>

                    {[...allDisplayBatches].reverse().map((batch, revIdx) => {
                      const batchTotal = batch.items.reduce((s, it) => s + it.price * it.quantity, 0);
                      const batchQty = batch.items.reduce((s, it) => s + it.quantity, 0);
                      const isPending = !!batch.isPending;
                      const isLatest = revIdx === 0;

                      return (
                        <div
                          key={batch.id}
                          className={`bg-white rounded-xl border p-3 shadow-2xs space-y-2 transition-all ${
                            isPending
                              ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/50'
                              : isLatest
                              ? 'border-amber-400/80 ring-1 ring-amber-400/40'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Batch Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
                                  isPending
                                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                    : isLatest
                                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                Đợt {batch.batchNumber}
                              </span>
                              {isPending ? (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                  Chờ báo bếp
                                </span>
                              ) : isLatest ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Đã báo bếp
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  Đã báo bếp
                                </span>
                              )}
                              {batch.note && (
                                <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                                  ({batch.note})
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-800 font-mono">
                                {isPending ? 'Mới thêm' : formatTimeOnly(batch.createdAt)}
                              </span>
                              {!isPending && (
                                <span className="text-[10px] text-slate-400 block">
                                  {formatDateTime(batch.createdAt).split(' ')[1] || ''}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Batch Items List */}
                          <div className="space-y-1.5 pt-0.5">
                            {batch.items.map((it, itIdx) => (
                              <div
                                key={itIdx}
                                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0"
                              >
                                <div className="flex items-center gap-2.5 flex-1 pr-2 min-w-0">
                                  {/* Stepper modifier pill matching the design */}
                                  <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shrink-0 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleBatchItemQuantityChange(batch.id, itIdx, -1)}
                                      title="Giảm 1 món này trong đợt"
                                      className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-7 text-center font-black text-slate-800 text-xs">
                                      {it.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleBatchItemQuantityChange(batch.id, itIdx, 1)}
                                      title="Tăng 1 món này trong đợt"
                                      className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <span className="font-semibold text-slate-800 leading-tight block truncate">
                                      {it.name}
                                    </span>
                                    {it.note && (
                                      <span className="block text-[10px] text-amber-700 bg-amber-50/80 px-1.5 py-0.5 rounded mt-0.5 border border-amber-200/60 truncate max-w-[160px]">
                                        Ghi chú: {it.note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-slate-700 font-mono font-bold text-xs block">
                                    {formatCurrency(it.price * it.quantity)}
                                  </span>
                                  {it.quantity > 1 && (
                                    <span className="text-[10px] text-slate-400">
                                      ({formatCurrency(it.price)}/món)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Batch Footer */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs text-slate-500">
                            <span>{batchQty} món trong đợt này</span>
                            <span className="font-bold text-slate-800">
                              Tiền đợt: <span className="text-rose-700">{formatCurrency(batchTotal)}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Cart Footer / Bill Summary & Action Buttons */}
            <div className="p-3.5 bg-white border-t border-slate-200 space-y-3">
              {/* Total Calculation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Tổng số lượng món:</span>
                  <span className="font-semibold text-slate-800">{totalItemCount} món</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base pt-1 border-t border-slate-100">
                  <span className="font-bold text-slate-800">Tổng thanh toán:</span>
                  <span className="font-black text-rose-700 text-lg sm:text-xl">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-save-order"
                  onClick={handleSaveAndNotify}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                    items.length === 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  {items.length === 0 ? 'Xác nhận Bàn trống' : 'Lưu & Báo bếp'}
                </button>

                <button
                  id="btn-open-payment"
                  disabled={items.length === 0 || status === 'serving'}
                  onClick={handleOpenPaymentWithBatches}
                  title={
                    items.length > 0 && status === 'serving'
                      ? 'Cần bếp nấu xong toàn bộ món (mọi đợt) trước khi có thể thanh toán'
                      : undefined
                  }
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                    items.length === 0 || status === 'serving'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Thanh toán ngay
                </button>
              </div>

              {/* Mobile Quick Action Buttons */}
              <div className="flex sm:hidden items-center justify-between gap-1 pt-1 border-t border-slate-100 text-xs">
                <button
                  onClick={() => onOpenTransfer(table)}
                  className="flex-1 py-1.5 text-blue-600 font-medium flex items-center justify-center gap-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Chuyển bàn
                </button>
                <button
                  onClick={() => onOpenMerge(table)}
                  className="flex-1 py-1.5 text-purple-600 font-medium flex items-center justify-center gap-1"
                >
                  <Merge className="w-3.5 h-3.5" /> Gộp bàn
                </button>
                <button
                  onClick={() => onPreviewReceipt(buildCurrentOrder())}
                  className="flex-1 py-1.5 text-emerald-700 font-medium flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> Phiếu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

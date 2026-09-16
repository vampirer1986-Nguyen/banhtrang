import { useMemo, useState } from 'react';
import {
  CheckCheck,
  Layers,
  ListOrdered,
  CookingPot,
  ChevronUp,
  ChevronDown,
  ArrowDownWideNarrow,
  Utensils,
  Wine,
  CheckCircle2,
  Circle,
  Clock,
  Check,
  Flame,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateItemStatus, completeTableItems } from '../store/slices/ordersSlice';
import { setTables } from '../store/slices/tablesSlice';
import { MenuCategory } from '../types';

const LATE_THRESHOLD_MINUTES = 30;

function formatWaitMinutes(timestamp: number): string {
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const hours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  return `${hours}h ${remMinutes}p trước`;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

interface KdsBatchItem {
  menuItemId: string;
  name: string;
  quantity: number;
  category: MenuCategory;
}

interface KdsBatch {
  id: string;
  batchNumber: number;
  createdAt: number;
  label: string;
  items: KdsBatchItem[];
}

interface KdsTable {
  orderId: string;
  tableLabel: string;
  tableName: string;
  areaName: string;
  createdAt: number;
  isLate: boolean;
  timeWaitText: string;
  batches: KdsBatch[];
  totalRemaining: number;
}

interface AggregatedDish {
  menuItemId: string;
  name: string;
  category: MenuCategory;
  totalQuantity: number;
  breakdown: string[];
}

export function KitchenDashboard() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector((state) => state.orders);
  const menuItems = useAppSelector((state) => state.menuItems);
  const areas = useAppSelector((state) => state.areas);
  const tables = useAppSelector((state) => state.tables);

  const [excludedTableIds, setExcludedTableIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'A' | 'B'>('A');
  const [showBatchSummary, setShowBatchSummary] = useState(true);

  const categoryByMenuId = useMemo(() => {
    const map = new Map<string, MenuCategory>();
    menuItems.forEach((m) => map.set(m.id, m.category));
    return map;
  }, [menuItems]);

  const areaNameById = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [areas]);

  // Build KDS-shaped tables: only orders that still have pending (non-ready) kitchen items
  const kitchenTables: KdsTable[] = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'completed' && o.batches && o.batches.length > 0)
      .map((order): KdsTable => {
        const batches: KdsBatch[] = (order.batches || [])
          .map((b) => ({
            id: b.id,
            batchNumber: b.batchNumber,
            createdAt: b.createdAt,
            label: `Đợt ${b.batchNumber}${b.batchNumber > 1 ? ' (gọi thêm)' : ''}`,
            items: b.items
              .filter((i) => i.kitchenStatus !== 'ready')
              .map((i) => ({
                menuItemId: i.menuItemId,
                name: i.name,
                quantity: i.quantity,
                category: categoryByMenuId.get(i.menuItemId) || 'main',
              })),
          }))
          .filter((b) => b.items.length > 0);

        const totalRemaining = batches.reduce(
          (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0),
          0
        );
        const waitMinutes = Math.floor((Date.now() - order.createdAt) / 60000);

        return {
          orderId: order.id,
          tableLabel: order.tableName.replace('Bàn ', ''),
          tableName: order.tableName,
          areaName: areaNameById.get(order.areaId) || '',
          createdAt: order.createdAt,
          isLate: waitMinutes >= LATE_THRESHOLD_MINUTES,
          timeWaitText: `${formatWaitMinutes(order.createdAt)} (${formatClock(order.createdAt)})`,
          batches,
          totalRemaining,
        };
      })
      .filter((t) => t.totalRemaining > 0)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [orders, categoryByMenuId, areaNameById]);

  const selectedTables = kitchenTables.filter((t) => !excludedTableIds.has(t.orderId));

  const toggleSelectTable = (orderId: string) => {
    setExcludedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAllTables = () => setExcludedTableIds(new Set());

  // Aggregated dishes across every currently-selected table (the shared batching panel)
  const aggregatedAcrossTables = useMemo(() => {
    const map = new Map<string, { name: string; category: MenuCategory; count: number; tableNames: string[] }>();
    selectedTables.forEach((t) => {
      t.batches.forEach((b) => {
        b.items.forEach((i) => {
          const existing = map.get(i.name);
          if (existing) {
            existing.count += i.quantity;
            if (!existing.tableNames.includes(t.tableName)) existing.tableNames.push(t.tableName);
          } else {
            map.set(i.name, { name: i.name, category: i.category, count: i.quantity, tableNames: [t.tableName] });
          }
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.category === 'main' && b.category !== 'main') return -1;
      if (a.category !== 'main' && b.category === 'main') return 1;
      return b.count - a.count;
    });
  }, [selectedTables]);

  // Cách A: dishes summed across a single table's own batches
  const buildTableAggregation = (table: KdsTable): { mains: AggregatedDish[]; drinks: AggregatedDish[] } => {
    const map = new Map<string, AggregatedDish>();
    table.batches.forEach((b) => {
      b.items.forEach((i) => {
        const breakdownEntry = `${b.label}: x${i.quantity}`;
        const existing = map.get(i.menuItemId);
        if (existing) {
          existing.totalQuantity += i.quantity;
          existing.breakdown.push(breakdownEntry);
        } else {
          map.set(i.menuItemId, {
            menuItemId: i.menuItemId,
            name: i.name,
            category: i.category,
            totalQuantity: i.quantity,
            breakdown: [breakdownEntry],
          });
        }
      });
    });
    const all = Array.from(map.values());
    return {
      mains: all.filter((i) => i.category === 'main'),
      drinks: all.filter((i) => i.category === 'drink'),
    };
  };

  const handleMarkAggregatedItemDone = (orderId: string, menuItemId: string) => {
    const table = kitchenTables.find((t) => t.orderId === orderId);
    table?.batches.forEach((b) => {
      if (b.items.some((i) => i.menuItemId === menuItemId)) {
        dispatch(updateItemStatus({ orderId, batchId: b.id, menuItemId, status: 'ready' }));
      }
    });
  };

  const handleMarkBatchDone = (orderId: string, batch: KdsBatch) => {
    batch.items.forEach((i) => {
      dispatch(updateItemStatus({ orderId, batchId: batch.id, menuItemId: i.menuItemId, status: 'ready' }));
    });
  };

  const handleMarkTableDone = (orderId: string) => {
    dispatch(completeTableItems({ orderId }));

    const order = orders.find((o) => o.id === orderId);
    if (order) {
      dispatch(
        setTables(
          tables.map((t) => (t.id === order.tableId ? { ...t, status: 'waiting_payment' } : t))
        )
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* CONTROL PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        {/* Chọn bàn cần nấu cùng lúc */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                Chọn bàn cần nấu cùng lúc (Multi-Table Batching):
              </h2>
            </div>
            <p className="text-xs text-slate-500">Chọn 1, 2, 3 bàn hoặc tất cả bàn để gom đơn nấu chung 1 mẻ.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={selectAllTables}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tất cả bàn ({kitchenTables.length})
            </button>

            <div className="flex items-center gap-1.5 flex-wrap">
              {kitchenTables.map((t) => {
                const isSelected = !excludedTableIds.has(t.orderId);
                return (
                  <button
                    key={t.orderId}
                    onClick={() => toggleSelectTable(t.orderId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span>{t.tableName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.totalRemaining} món
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chế độ xem */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Chế độ xem List view:</span>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('A')}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'A' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${viewMode === 'A' ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Cách A: Cộng dồn theo từng món</span>
              </button>

              <button
                onClick={() => setViewMode('B')}
                className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'B' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                <ListOrdered className={`w-3.5 h-3.5 ${viewMode === 'B' ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Cách B: Theo món rồi theo đợt</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowBatchSummary((v) => !v)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CookingPot className="w-3.5 h-3.5" />
            <span>Bảng gom nướng chung ({selectedTables.length} bàn)</span>
            {showBatchSummary ? (
              <ChevronUp className="w-3 h-3 ml-1" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </button>
        </div>

        {/* Bảng tổng hợp gom món */}
        {showBatchSummary && (
          <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-3.5 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px]">
                  <Flame className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-indigo-950 text-sm">
                  Tổng số lượng các món cần nấu chung cho các bàn đang chọn:
                </span>
              </div>
              <span className="text-slate-500 text-[11px] flex items-center gap-1">
                <ArrowDownWideNarrow className="w-3 h-3 text-indigo-500" />
                Món chính trước &rarr; Đồ uống sau
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {aggregatedAcrossTables.length === 0 ? (
                <span className="text-slate-400 italic">Chưa chọn bàn nào hoặc không còn món cần nấu.</span>
              ) : (
                aggregatedAcrossTables.map((entry) => {
                  const isMain = entry.category === 'main';
                  return (
                    <div
                      key={entry.name}
                      className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 ${
                        isMain
                          ? 'bg-amber-100/80 border-amber-300 text-amber-950 font-bold'
                          : 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                      }`}
                    >
                      {isMain ? (
                        <Utensils className="w-3 h-3 text-amber-600" />
                      ) : (
                        <Wine className="w-3 h-3 text-blue-500" />
                      )}
                      <span>{entry.name}:</span>
                      <span className={`text-sm font-black ${isMain ? 'text-rose-700' : 'text-blue-700'}`}>
                        {entry.count}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">({entry.tableNames.join(', ')})</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* DANH SÁCH THẺ BÀN */}
      {selectedTables.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Tất cả bàn đã xong món!</h3>
          <p className="text-xs text-slate-500">
            Các món, đợt gọi và bàn đã hoàn tất đều đã được tự động loại khỏi màn hình.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {selectedTables.map((table) => {
            const priorityIndex = kitchenTables.findIndex((t) => t.orderId === table.orderId);
            const { mains, drinks } = buildTableAggregation(table);

            return (
              <div
                key={table.orderId}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl ${
                        table.isLate ? 'bg-rose-600' : 'bg-amber-500'
                      } text-white font-black text-base flex items-center justify-center shadow-xs`}
                    >
                      {table.tableLabel}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-base">{table.tableName}</h3>
                        <span className="text-xs text-slate-500">({table.areaName})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{table.timeWaitText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        table.isLate ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      ƯU TIÊN #{priorityIndex + 1}
                    </span>
                    <div className="text-xs font-bold text-slate-700 mt-1">
                      Còn <span className="text-rose-600 font-black">{table.totalRemaining}</span> món
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-4 flex-1">
                  {viewMode === 'A' ? (
                    <>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-1 border-b border-slate-100">
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <Layers className="w-3.5 h-3.5" /> CÁCH A: CỘNG DỒN THEO MÓN
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">Xong món tự loại</span>
                      </div>

                      {mains.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <Utensils className="w-3 h-3 text-amber-600" /> Món chính:
                          </div>
                          <div className="space-y-1">
                            {mains.map((item) => (
                              <div
                                key={item.menuItemId}
                                className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2 hover:bg-amber-100/70 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-xs text-slate-900">{item.name}</span>
                                    <span className="text-xs font-black text-rose-700 bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
                                      x{item.totalQuantity}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{item.breakdown.join(' • ')}</p>
                                </div>
                                <button
                                  onClick={() => handleMarkAggregatedItemDone(table.orderId, item.menuItemId)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-lg text-xs border border-emerald-300 transition-all flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
                                  title="Xong món này"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Xong món</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {drinks.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5 uppercase tracking-wide">
                            <Wine className="w-3 h-3 text-blue-600" /> Đồ uống:
                          </div>
                          <div className="space-y-1">
                            {drinks.map((item) => (
                              <div
                                key={item.menuItemId}
                                className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-2 hover:bg-blue-100/60 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-xs text-slate-900">{item.name}</span>
                                    <span className="text-xs font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                                      x{item.totalQuantity}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{item.breakdown.join(' • ')}</p>
                                </div>
                                <button
                                  onClick={() => handleMarkAggregatedItemDone(table.orderId, item.menuItemId)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-lg text-xs border border-emerald-300 transition-all flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
                                  title="Xong món này"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Xong món</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-1 border-b border-slate-100">
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <ListOrdered className="w-3.5 h-3.5" /> CÁCH B: THEO MÓN RỒI THEO ĐỢT
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">Có nút xong từng đợt</span>
                      </div>

                      {table.batches.map((batch) => {
                        const batchMains = batch.items.filter((i) => i.category === 'main');
                        const batchDrinks = batch.items.filter((i) => i.category === 'drink');
                        const batchTotal = batch.items.reduce((s, i) => s + i.quantity, 0);

                        return (
                          <div key={batch.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <strong className="text-xs text-slate-900 font-bold">
                                  {batch.label} • {formatClock(batch.createdAt)}
                                </strong>
                                <span className="text-[10px] text-slate-500">({formatWaitMinutes(batch.createdAt)})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                  {batchTotal} món
                                </span>
                                <button
                                  onClick={() => handleMarkBatchDone(table.orderId, batch)}
                                  className="px-2 py-1 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-lg text-[11px] border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Xong cả đợt này"
                                >
                                  <CheckCheck className="w-3 h-3" />
                                  <span>Xong đợt</span>
                                </button>
                              </div>
                            </div>

                            {batchMains.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                                  <Utensils className="w-2.5 h-2.5" /> MÓN CHÍNH:
                                </div>
                                {batchMains.map((item) => (
                                  <div
                                    key={item.menuItemId}
                                    className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-200/80"
                                  >
                                    <span className="text-slate-800 font-medium">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-rose-700">x{item.quantity}</span>
                                      <button
                                        onClick={() =>
                                          dispatch(
                                            updateItemStatus({
                                              orderId: table.orderId,
                                              batchId: batch.id,
                                              menuItemId: item.menuItemId,
                                              status: 'ready',
                                            })
                                          )
                                        }
                                        className="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Xong món này"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {batchDrinks.length > 0 && (
                              <div className="space-y-1 pt-1">
                                <div className="text-[10px] font-bold text-blue-800 flex items-center gap-1">
                                  <Wine className="w-2.5 h-2.5" /> ĐỒ UỐNG:
                                </div>
                                {batchDrinks.map((item) => (
                                  <div
                                    key={item.menuItemId}
                                    className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-200/80"
                                  >
                                    <span className="text-slate-700">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-blue-700">x{item.quantity}</span>
                                      <button
                                        onClick={() =>
                                          dispatch(
                                            updateItemStatus({
                                              orderId: table.orderId,
                                              batchId: batch.id,
                                              menuItemId: item.menuItemId,
                                              status: 'ready',
                                            })
                                          )
                                        }
                                        className="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Xong món này"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Card footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Đã ra hết món của bàn?</span>
                  <button
                    onClick={() => handleMarkTableDone(table.orderId)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xong cả bàn</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

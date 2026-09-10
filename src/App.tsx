import React, { useState, useEffect } from 'react';
import {
  Table,
  Order,
  MenuItem,
  Area,
  AreaId,
  TableStatus,
} from './types';
import {
  getStoredTables,
  saveStoredTables,
  getStoredOrders,
  saveStoredOrders,
  getStoredMenu,
  saveStoredMenu,
  getStoredAreas,
  saveStoredAreas,
  getStoredCompletedOrders,
  saveStoredCompletedOrders,
  getStoredSampleMenu,
  resetAllData,
} from './utils/storage';
import { Header } from './components/Header';
import { TableMap } from './components/TableMap';
import { OrderPOSModal } from './components/OrderPOSModal';
import { PaymentModal } from './components/PaymentModal';
import { TransferMergeModal } from './components/TransferMergeModal';
import { ReceiptModal } from './components/ReceiptModal';
import { MenuManagement } from './components/MenuManagement';
import { OrderHistoryView } from './components/OrderHistoryView';
import { TableManagementModal } from './components/TableManagementModal';
import { INITIAL_AREAS, INITIAL_TABLES, INITIAL_ORDERS, INITIAL_MENU_ITEMS } from './mockData';

export default function App() {
  // Main data states initialized from LocalStorage
  const [areas, setAreas] = useState<Area[]>(() => getStoredAreas());
  const [tables, setTables] = useState<Table[]>(() => getStoredTables());
  const [orders, setOrders] = useState<Order[]>(() => getStoredOrders());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getStoredMenu());
  const [completedOrders, setCompletedOrders] = useState<Order[]>(() => getStoredCompletedOrders());

  // Navigation tab: 'tables' | 'menu' | 'history'
  const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'history'>('tables');

  // Active Modals state
  const [isTableManagementOpen, setIsTableManagementOpen] = useState(false);
  const [selectedTableForPOS, setSelectedTableForPOS] = useState<Table | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [transferMergeState, setTransferMergeState] = useState<{
    sourceTable: Table;
    mode: 'transfer' | 'merge';
  } | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Sync to LocalStorage on updates
  useEffect(() => {
    saveStoredAreas(areas);
  }, [areas]);

  useEffect(() => {
    saveStoredTables(tables);
  }, [tables]);

  useEffect(() => {
    saveStoredOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveStoredMenu(menuItems);
  }, [menuItems]);

  useEffect(() => {
    saveStoredCompletedOrders(completedOrders);
  }, [completedOrders]);

  // Handle table selection
  const handleSelectTable = (table: Table) => {
    setSelectedTableForPOS(table);
  };

  // Save or update order from POS Modal
  const handleSaveOrder = (
    updatedOrder: Order,
    newStatus: 'serving' | 'waiting_payment' = 'serving'
  ) => {
    // If order has 0 items or total quantity is 0, reset table to empty and remove order
    const totalItemCount = updatedOrder.items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalItemCount === 0) {
      setOrders((prevOrders) => prevOrders.filter((o) => o.id !== updatedOrder.id));

      setTables((prevTables) =>
        prevTables.map((t) => {
          if (t.id === updatedOrder.tableId) {
            return {
              ...t,
              status: 'empty',
              currentOrderId: undefined,
              openedAt: undefined,
            };
          }
          return t;
        })
      );

      setSelectedTableForPOS(null);
      showToast(`Bàn ${updatedOrder.tableName} không có món ăn, đã chuyển về Bàn trống (màu xanh)!`);
      return;
    }

    const existingOrderIndex = orders.findIndex((o) => o.id === updatedOrder.id);
    let newOrders: Order[];

    if (existingOrderIndex > -1) {
      newOrders = [...orders];
      newOrders[existingOrderIndex] = {
        ...updatedOrder,
        status: newStatus,
        updatedAt: Date.now(),
      };
    } else {
      newOrders = [...orders, { ...updatedOrder, status: newStatus }];
    }

    setOrders(newOrders);

    // Update table status
    setTables((prevTables) =>
      prevTables.map((t) => {
        if (t.id === updatedOrder.tableId) {
          return {
            ...t,
            status: newStatus,
            currentOrderId: updatedOrder.id,
            openedAt: t.openedAt || Date.now(),
          };
        }
        return t;
      })
    );

    showToast(`Đã lưu đơn hàng cho ${updatedOrder.tableName}!`);
  };

  // Transfer Table Execution
  const handleExecuteTransfer = (sourceTableId: string, targetTableId: string) => {
    const sourceTable = tables.find((t) => t.id === sourceTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);

    if (!sourceTable || !targetTable || !sourceTable.currentOrderId) return;

    const orderId = sourceTable.currentOrderId;

    // 1. Update the order with target table info
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              tableId: targetTable.id,
              tableName: targetTable.name,
              areaId: targetTable.areaId,
              updatedAt: Date.now(),
            }
          : o
      )
    );

    // 2. Update tables: source becomes empty, target becomes occupied
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === sourceTableId) {
          return {
            ...t,
            status: 'empty',
            currentOrderId: undefined,
            openedAt: undefined,
          };
        }
        if (t.id === targetTableId) {
          return {
            ...t,
            status: sourceTable.status,
            currentOrderId: orderId,
            openedAt: sourceTable.openedAt || Date.now(),
          };
        }
        return t;
      })
    );

    setTransferMergeState(null);
    if (selectedTableForPOS?.id === sourceTableId) {
      setSelectedTableForPOS(null);
    }
    showToast(`Đã chuyển đơn từ ${sourceTable.name} sang ${targetTable.name}!`);
  };

  // Merge Table Execution
  const handleExecuteMerge = (sourceTableId: string, targetTableId: string) => {
    const sourceTable = tables.find((t) => t.id === sourceTableId);
    const targetTable = tables.find((t) => t.id === targetTableId);

    if (!sourceTable || !targetTable || !sourceTable.currentOrderId || !targetTable.currentOrderId) {
      return;
    }

    const sourceOrder = orders.find((o) => o.id === sourceTable.currentOrderId);
    const targetOrder = orders.find((o) => o.id === targetTable.currentOrderId);

    if (!sourceOrder || !targetOrder) return;

    // Merge items
    const mergedItems = [...targetOrder.items];
    sourceOrder.items.forEach((sourceItem) => {
      const existingIdx = mergedItems.findIndex((i) => i.menuItemId === sourceItem.menuItemId);
      if (existingIdx > -1) {
        mergedItems[existingIdx] = {
          ...mergedItems[existingIdx],
          quantity: mergedItems[existingIdx].quantity + sourceItem.quantity,
          note: [mergedItems[existingIdx].note, sourceItem.note].filter(Boolean).join(', ') || undefined,
        };
      } else {
        mergedItems.push({ ...sourceItem });
      }
    });

    // Merge batches
    const targetBatches = targetOrder.batches || [];
    const sourceBatches = sourceOrder.batches || [];
    const mergedBatches = [
      ...targetBatches,
      ...sourceBatches.map((b, idx) => ({
        ...b,
        id: `merged-${b.id}`,
        batchNumber: targetBatches.length + idx + 1,
        note: `Gộp từ ${sourceTable.name}${b.note ? ` (${b.note})` : ''}`,
      })),
    ];

    // 1. Update target order, remove source order
    setOrders((prev) =>
      prev
        .filter((o) => o.id !== sourceOrder.id)
        .map((o) =>
          o.id === targetOrder.id
            ? {
                ...o,
                items: mergedItems,
                batches: mergedBatches,
                customerCount: (o.customerCount || 0) + (sourceOrder.customerCount || 0),
                updatedAt: Date.now(),
              }
            : o
        )
    );

    // 2. Source table becomes empty
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === sourceTableId) {
          return {
            ...t,
            status: 'empty',
            currentOrderId: undefined,
            openedAt: undefined,
          };
        }
        return t;
      })
    );

    setTransferMergeState(null);
    if (selectedTableForPOS?.id === sourceTableId) {
      setSelectedTableForPOS(null);
    }
    showToast(`Đã gộp đơn từ ${sourceTable.name} vào ${targetTable.name}!`);
  };

  // Complete Payment & Vacate Table
  const handleCompletePayment = (
    orderId: string,
    paymentMethod: 'cash' | 'transfer',
    paymentDetails?: {
      cashGiven: number;
      changeDue: number;
      discountAmount: number;
      totalAmount: number;
    }
  ) => {
    const activeOrder = orders.find((o) => o.id === orderId);
    if (!activeOrder) return;

    const completed: Order = {
      ...activeOrder,
      status: 'completed',
      paymentMethod,
      completedAt: Date.now(),
      cashGiven: paymentDetails?.cashGiven,
      changeDue: paymentDetails?.changeDue,
      discountAmount: paymentDetails?.discountAmount,
      totalAmount: paymentDetails?.totalAmount,
    };

    // 1. Save to completed orders list
    setCompletedOrders((prev) => [completed, ...prev]);

    // 2. Remove from active orders
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    // 3. Clear the table
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === activeOrder.tableId) {
          return {
            ...t,
            status: 'empty',
            currentOrderId: undefined,
            openedAt: undefined,
          };
        }
        return t;
      })
    );

    setPaymentOrder(null);
    setSelectedTableForPOS(null);
    showToast(`Đã thanh toán thành công cho ${activeOrder.tableName}!`);
  };

  // Synchronize dish updates across active orders
  const handleEditMenuItem = (updatedItem: MenuItem) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        let hasChanged = false;
        const newItems = order.items.map((ordItem) => {
          if (ordItem.menuItemId === updatedItem.id) {
            hasChanged = true;
            return {
              ...ordItem,
              name: updatedItem.name,
              price: updatedItem.price,
            };
          }
          return ordItem;
        });

        if (!hasChanged) return order;

        const newSubtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        return {
          ...order,
          items: newItems,
          subtotal: newSubtotal,
          total: newSubtotal,
        };
      })
    );
  };

  // Handlers for Table & Area Management
  const handleAddTable = (newTableData: { name: string; code: string; areaId: AreaId; capacity: number }) => {
    const newTable: Table = {
      id: `table_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newTableData.name,
      code: newTableData.code,
      areaId: newTableData.areaId,
      capacity: newTableData.capacity,
      status: 'empty',
    };
    setTables((prev) => [...prev, newTable]);
    const areaName = areas.find((a) => a.id === newTableData.areaId)?.name || '';
    showToast(`Đã thêm "${newTable.name}" vào khu vực ${areaName}!`);
  };

  const handleDeleteTable = (tableId: string) => {
    const target = tables.find((t) => t.id === tableId);
    if (!target) return;

    const hasActiveOrder = orders.some((o) => o.tableId === tableId && o.items.length > 0);
    if (hasActiveOrder) {
      showToast(`⚠️ Không thể xóa ${target.name} vì bàn đang có khách phục vụ!`);
      return;
    }

    setTables((prev) => prev.filter((t) => t.id !== tableId));
    setOrders((prev) => prev.filter((o) => o.tableId !== tableId));
    showToast(`Đã xóa "${target.name}" thành công!`);
  };

  const handleAddArea = (newAreaData: { name: string; badgeColor: string }) => {
    const newAreaId = `area_${Date.now()}`;
    const newArea: Area = {
      id: newAreaId,
      name: newAreaData.name,
      badgeColor: newAreaData.badgeColor,
    };
    setAreas((prev) => [...prev, newArea]);
    showToast(`Đã tạo thành công khu vực mới: "${newArea.name}"!`);
  };

  const handleDeleteArea = (areaId: AreaId) => {
    const areaToDelete = areas.find((a) => a.id === areaId);
    if (!areaToDelete) return;

    const areaTables = tables.filter((t) => t.areaId === areaId);
    const hasOccupied = areaTables.some((t) => {
      if (t.status === 'empty') return false;
      const ord = orders.find((o) => o.id === t.currentOrderId);
      return ord && ord.items.reduce((s, i) => s + i.quantity, 0) > 0;
    });

    if (hasOccupied) {
      showToast(`⚠️ Không thể xóa khu vực "${areaToDelete.name}" vì có bàn đang phục vụ khách!`);
      return;
    }

    setAreas((prev) => prev.filter((a) => a.id !== areaId));
    setTables((prev) => prev.filter((t) => t.areaId !== areaId));
    showToast(`Đã xóa khu vực "${areaToDelete.name}" và các bàn liên quan!`);
  };

  // Reset demo data
  const handleResetData = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu mẫu ban đầu của quán ăn?')) {
      resetAllData();
      const currentSampleMenu = getStoredSampleMenu();
      const sampleItemIds = new Set(currentSampleMenu.map((m) => m.id));

      // Filter initial orders to ensure deleted sample items are excluded
      const sanitizedInitialOrders = INITIAL_ORDERS.map((ord) => ({
        ...ord,
        items: ord.items.filter((item) => sampleItemIds.has(item.menuItemId)),
      })).filter((ord) => ord.items.length > 0);

      setAreas(INITIAL_AREAS);
      setTables(INITIAL_TABLES);
      setOrders(sanitizedInitialOrders);
      setMenuItems(currentSampleMenu);
      setCompletedOrders([]);
      showToast('Đã đặt lại dữ liệu ban đầu thành công!');
    }
  };

  // Computed stats for Header
  const occupiedCount = tables.filter((t) => t.status !== 'empty').length;
  const waitingCount = tables.filter((t) => t.status === 'waiting_payment').length;
  const todayRevenue = completedOrders.reduce((sum, order) => {
    const orderTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    return sum + orderTotal;
  }, 0);

  // Active order of the selected table if any
  const currentSelectedOrder = selectedTableForPOS
    ? orders.find((o) => o.id === selectedTableForPOS.currentOrderId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white border border-amber-500/50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          {toastMessage}
        </div>
      )}

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        occupiedCount={occupiedCount}
        totalTables={tables.length}
        waitingCount={waitingCount}
        todayRevenue={todayRevenue}
        onResetData={handleResetData}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'tables' && (
          <TableMap
            areas={areas}
            tables={tables}
            orders={orders}
            onSelectTable={handleSelectTable}
            onOpenTransfer={(table) => setTransferMergeState({ sourceTable: table, mode: 'transfer' })}
            onOpenMerge={(table) => setTransferMergeState({ sourceTable: table, mode: 'merge' })}
            onOpenTableManagement={() => setIsTableManagementOpen(true)}
          />
        )}

        {activeTab === 'menu' && (
          <MenuManagement
            menuItems={menuItems}
            activeOrders={orders}
            onUpdateMenu={setMenuItems}
            onEditDish={handleEditMenuItem}
            onToast={showToast}
          />
        )}

        {activeTab === 'history' && (
          <OrderHistoryView
            completedOrders={completedOrders}
            areas={areas}
            menuItems={menuItems}
            onPreviewReceipt={(order) => setReceiptOrder(order)}
            onImportData={(newCompletedOrders) => {
              setCompletedOrders(newCompletedOrders);
              saveStoredCompletedOrders(newCompletedOrders);
            }}
            onToast={showToast}
          />
        )}
      </main>

      {/* Order POS Modal */}
      {selectedTableForPOS && (
        <OrderPOSModal
          table={selectedTableForPOS}
          order={currentSelectedOrder}
          menuItems={menuItems}
          onClose={() => setSelectedTableForPOS(null)}
          onSaveOrder={handleSaveOrder}
          onOpenPayment={(order) => {
            setPaymentOrder(order);
          }}
          onOpenTransfer={(table) =>
            setTransferMergeState({ sourceTable: table, mode: 'transfer' })
          }
          onOpenMerge={(table) =>
            setTransferMergeState({ sourceTable: table, mode: 'merge' })
          }
          onPreviewReceipt={(order) => setReceiptOrder(order)}
        />
      )}

      {/* Payment Modal */}
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          table={tables.find((t) => t.id === paymentOrder.tableId) || {
            id: paymentOrder.tableId,
            name: paymentOrder.tableName,
            code: paymentOrder.tableName.replace('Bàn ', ''),
            areaId: paymentOrder.areaId,
            status: 'waiting_payment',
            capacity: 4,
          }}
          onClose={() => setPaymentOrder(null)}
          onCompletePayment={handleCompletePayment}
          onPrintReceipt={(order) => setReceiptOrder(order)}
        />
      )}

      {/* Transfer or Merge Table Modal */}
      {transferMergeState && (
        <TransferMergeModal
          sourceTable={transferMergeState.sourceTable}
          mode={transferMergeState.mode}
          allTables={tables}
          orders={orders}
          areas={areas}
          onClose={() => setTransferMergeState(null)}
          onExecuteTransfer={handleExecuteTransfer}
          onExecuteMerge={handleExecuteMerge}
        />
      )}

      {/* Printable Receipt Preview Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* Table & Area Management Modal */}
      {isTableManagementOpen && (
        <TableManagementModal
          areas={areas}
          tables={tables}
          orders={orders}
          onClose={() => setIsTableManagementOpen(false)}
          onAddTable={handleAddTable}
          onDeleteTable={handleDeleteTable}
          onAddArea={handleAddArea}
          onDeleteArea={handleDeleteArea}
          onImportData={(newAreas, newTables) => {
            setAreas(newAreas);
            setTables(newTables);
            saveStoredAreas(newAreas);
            saveStoredTables(newTables);
          }}
          onToast={showToast}
        />
      )}
    </div>
  );
}

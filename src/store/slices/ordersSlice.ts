import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { KitchenItemStatus, Order } from '../../types';
import { getStoredOrders } from '../../utils/storage';

const ordersSlice = createSlice({
  name: 'orders',
  initialState: getStoredOrders(),
  reducers: {
    setOrders: (_state, action: PayloadAction<Order[]>) => action.payload,

    // KDS: mark a single item within a specific kitchen batch as ready/pending
    updateItemStatus: (
      state,
      action: PayloadAction<{ orderId: string; batchId: string; menuItemId: string; status: KitchenItemStatus }>
    ) => {
      const { orderId, batchId, menuItemId, status } = action.payload;
      const order = state.find((o) => o.id === orderId);
      const batch = order?.batches?.find((b) => b.id === batchId);
      const item = batch?.items.find((i) => i.menuItemId === menuItemId);
      if (item) item.kitchenStatus = status;
    },

    // KDS: mark every item across all batches of a table's order as ready and move it to "chờ thanh toán"
    completeTableItems: (state, action: PayloadAction<{ orderId: string }>) => {
      const order = state.find((o) => o.id === action.payload.orderId);
      if (!order) return;
      order.batches?.forEach((batch) => {
        batch.items.forEach((item) => {
          item.kitchenStatus = 'ready';
        });
      });
      order.status = 'waiting_payment';
      order.updatedAt = Date.now();
    },
  },
});

export const { setOrders, updateItemStatus, completeTableItems } = ordersSlice.actions;
export default ordersSlice.reducer;

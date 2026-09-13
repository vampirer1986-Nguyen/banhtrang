import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { Order } from '../../types';
import { getStoredCompletedOrders } from '../../utils/storage';

const completedOrdersSlice = createSlice({
  name: 'completedOrders',
  initialState: getStoredCompletedOrders(),
  reducers: {
    setCompletedOrders: (_state, action: PayloadAction<Order[]>) => action.payload,
  },
});

export const { setCompletedOrders } = completedOrdersSlice.actions;
export default completedOrdersSlice.reducer;

import { configureStore } from '@reduxjs/toolkit';
import areasReducer from './slices/areasSlice';
import tablesReducer from './slices/tablesSlice';
import ordersReducer from './slices/ordersSlice';
import menuItemsReducer from './slices/menuSlice';
import completedOrdersReducer from './slices/completedOrdersSlice';
import {
  saveStoredAreas,
  saveStoredTables,
  saveStoredOrders,
  saveStoredMenu,
  saveStoredCompletedOrders,
} from '../utils/storage';

export const store = configureStore({
  reducer: {
    areas: areasReducer,
    tables: tablesReducer,
    orders: ordersReducer,
    menuItems: menuItemsReducer,
    completedOrders: completedOrdersReducer,
  },
});

// Persist each slice to LocalStorage whenever it changes.
let prevState = store.getState();
store.subscribe(() => {
  const state = store.getState();
  if (state.areas !== prevState.areas) saveStoredAreas(state.areas);
  if (state.tables !== prevState.tables) saveStoredTables(state.tables);
  if (state.orders !== prevState.orders) saveStoredOrders(state.orders);
  if (state.menuItems !== prevState.menuItems) saveStoredMenu(state.menuItems);
  if (state.completedOrders !== prevState.completedOrders) saveStoredCompletedOrders(state.completedOrders);
  prevState = state;
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

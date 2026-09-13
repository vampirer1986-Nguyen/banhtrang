import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { Table } from '../../types';
import { getStoredTables } from '../../utils/storage';

const tablesSlice = createSlice({
  name: 'tables',
  initialState: getStoredTables(),
  reducers: {
    setTables: (_state, action: PayloadAction<Table[]>) => action.payload,
  },
});

export const { setTables } = tablesSlice.actions;
export default tablesSlice.reducer;

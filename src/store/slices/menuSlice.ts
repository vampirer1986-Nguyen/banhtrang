import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { MenuItem } from '../../types';
import { getStoredMenu } from '../../utils/storage';

const menuSlice = createSlice({
  name: 'menuItems',
  initialState: getStoredMenu(),
  reducers: {
    setMenuItems: (_state, action: PayloadAction<MenuItem[]>) => action.payload,
  },
});

export const { setMenuItems } = menuSlice.actions;
export default menuSlice.reducer;

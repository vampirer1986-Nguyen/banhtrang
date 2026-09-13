import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { Area } from '../../types';
import { getStoredAreas } from '../../utils/storage';

const areasSlice = createSlice({
  name: 'areas',
  initialState: getStoredAreas(),
  reducers: {
    setAreas: (_state, action: PayloadAction<Area[]>) => action.payload,
  },
});

export const { setAreas } = areasSlice.actions;
export default areasSlice.reducer;

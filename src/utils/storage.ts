import { INITIAL_AREAS, INITIAL_MENU_ITEMS, INITIAL_ORDERS, INITIAL_TABLES } from '../mockData';
import { Area, MenuItem, Order, Table } from '../types';

const STORAGE_KEYS = {
  TABLES: 'quan_an_tables_v2',
  ORDERS: 'quan_an_orders_v2',
  MENU: 'quan_an_menu_v2',
  SAMPLE_MENU: 'quan_an_sample_menu_v2',
  AREAS: 'quan_an_areas_v2',
  COMPLETED: 'quan_an_completed_orders_v2',
};

export function getStoredTables(): Table[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TABLES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load tables from storage', e);
  }
  return INITIAL_TABLES;
}

export function saveStoredTables(tables: Table[]) {
  localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
}

export function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load orders from storage', e);
  }
  return INITIAL_ORDERS;
}

export function saveStoredOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function sortMenuItemsByCategory(items: MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category === 'main' ? -1 : 1;
    }
    return 0;
  });
}

export function getStoredSampleMenu(): MenuItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAMPLE_MENU);
    if (raw) return sortMenuItemsByCategory(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load sample menu from storage', e);
  }
  return sortMenuItemsByCategory(INITIAL_MENU_ITEMS);
}

export function saveStoredSampleMenu(menu: MenuItem[]) {
  localStorage.setItem(STORAGE_KEYS.SAMPLE_MENU, JSON.stringify(sortMenuItemsByCategory(menu)));
}

export function getStoredMenu(): MenuItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MENU);
    if (raw) return sortMenuItemsByCategory(JSON.parse(raw));
  } catch (e) {
    console.error('Failed to load menu from storage', e);
  }
  return sortMenuItemsByCategory(getStoredSampleMenu());
}

export function saveStoredMenu(menu: MenuItem[]) {
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(sortMenuItemsByCategory(menu)));
}

export function getStoredCompletedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load completed orders', e);
  }
  return [];
}

export function saveStoredCompletedOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(orders));
}

export function getStoredAreas(): Area[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AREAS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load areas from storage', e);
  }
  return INITIAL_AREAS;
}

export function saveStoredAreas(areas: Area[]) {
  localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(areas));
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEYS.TABLES);
  localStorage.removeItem(STORAGE_KEYS.ORDERS);
  localStorage.removeItem(STORAGE_KEYS.MENU);
  localStorage.removeItem(STORAGE_KEYS.AREAS);
  localStorage.removeItem(STORAGE_KEYS.COMPLETED);
}

export type AreaId = string;

export interface Area {
  id: AreaId;
  name: string;
  badgeColor: string;
}

export type TableStatus = 'empty' | 'occupied' | 'waiting_payment';

export interface Table {
  id: string;
  name: string;
  code: string;
  areaId: AreaId;
  status: TableStatus;
  capacity: number;
  currentOrderId?: string;
  openedAt?: number;
}

export type MenuCategory = 'main' | 'drink';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  image: string;
  isAvailable: boolean;
  unit: string;
}

export type KitchenItemStatus = 'pending' | 'ready';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  image?: string;
  kitchenStatus?: KitchenItemStatus;
}

export interface KitchenBatch {
  id: string;
  batchNumber: number;
  createdAt: number;
  items: OrderItem[];
  note?: string;
}

export type OrderStatus = 'serving' | 'waiting_payment' | 'completed';

export interface Order {
  id: string;
  tableId: string;
  tableName: string;
  areaId: AreaId;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  paymentMethod?: 'cash' | 'transfer';
  customerCount: number;
  note?: string;
  batches?: KitchenBatch[];
  cashGiven?: number;
  changeDue?: number;
  discountAmount?: number;
  totalAmount?: number;
}

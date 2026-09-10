import React, { useState } from 'react';
import { MenuItem, MenuCategory, Order } from '../types';
import { formatCurrency } from '../utils/formatters';
import { getStoredSampleMenu, saveStoredSampleMenu } from '../utils/storage';
import { getReliableFoodImage, DEFAULT_FALLBACK_FOOD_IMAGE } from '../utils/imageUtils';
import {
  Utensils,
  Search,
  Plus,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Trash2,
  ShieldAlert,
  Pencil,
  Image as ImageIcon,
  Save,
  Download,
  Upload,
} from 'lucide-react';

export const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

interface MenuManagementProps {
  menuItems: MenuItem[];
  activeOrders?: Order[];
  onUpdateMenu: (updated: MenuItem[]) => void;
  onEditDish?: (updatedItem: MenuItem) => void;
  onToast?: (message: string) => void;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({
  menuItems,
  activeOrders = [],
  onUpdateMenu,
  onEditDish,
  onToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Edit item states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<MenuCategory>('main');
  const [editPrice, setEditPrice] = useState<number>(50000);
  const [editUnit, setEditUnit] = useState<string>('Đĩa');
  const [editImage, setEditImage] = useState<string>('');
  const [editImageError, setEditImageError] = useState<boolean>(false);

  // Deletion modal states
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ item: MenuItem; tableNames: string[] } | null>(null);

  // Form for new item
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<MenuCategory>('main');
  const [newPrice, setNewPrice] = useState<number>(50000);
  const [newUnit, setNewUnit] = useState<string>('Đĩa');
  const [newImage, setNewImage] = useState<string>(
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
  );
  const [addImageError, setAddImageError] = useState<boolean>(false);

  // Sample image suggestions for quick pick
  const SAMPLE_IMAGES = [
    { label: 'Trứng đánh / Điểm tâm', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80' },
    { label: 'Trứng cuộn vàng', url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80' },
    { label: 'Hải sản / Cơm', url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80' },
    { label: 'Thịt nướng', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80' },
    { label: 'Gà nướng', url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=80' },
    { label: 'Lẩu nghi ngút', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80' },
    { label: 'Rau xào', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80' },
    { label: 'Bia lon', url: 'https://images.unsplash.com/photo-1608270195726-5f36e4b85c16?auto=format&fit=crop&w=400&q=80' },
    { label: 'Trà trái cây', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80' },
    { label: 'Nước ép / Chanh', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80' },
  ];

  // Open Edit Modal
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditPrice(item.price);
    setEditUnit(item.unit);
    setEditImage(item.image);
    setEditImageError(false);
  };

  // Save Edit Item
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editName.trim() || editPrice <= 0) return;

    const finalImage = editImage.trim() || DEFAULT_FALLBACK_IMAGE;

    const updatedItem: MenuItem = {
      ...editingItem,
      name: editName.trim(),
      category: editCategory,
      price: Number(editPrice),
      unit: editUnit.trim() || 'Phần',
      image: finalImage,
    };

    // 1. Update active menu list
    const updated = menuItems.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    onUpdateMenu(updated);

    // 2. Notify parent to sync orders if provided
    if (onEditDish) {
      onEditDish(updatedItem);
    }

    // 3. Sync to sample menu storage
    const currentSample = getStoredSampleMenu();
    const updatedSample = currentSample.map((i) =>
      i.id === updatedItem.id ? updatedItem : i
    );
    saveStoredSampleMenu(updatedSample);

    if (onToast) {
      onToast(`Đã cập nhật món "${updatedItem.name}" thành công!`);
    }

    setEditingItem(null);
  };

  // Toggle availability (Còn món / Hết món)
  const handleToggleAvailability = (id: string) => {
    const updated = menuItems.map((item) =>
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    );
    onUpdateMenu(updated);
  };

  // Safe initiation of delete
  const handleInitiateDelete = (item: MenuItem) => {
    // Check if dish is currently part of any active, uncompleted orders
    const conflictingOrders = activeOrders.filter(
      (order) =>
        order.status !== 'completed' &&
        order.items.some((orderItem) => orderItem.menuItemId === item.id)
    );

    if (conflictingOrders.length > 0) {
      const tableNames = Array.from(new Set(conflictingOrders.map((o) => o.tableName)));
      setConflictInfo({ item, tableNames });
      return;
    }

    // No conflict - open confirmation modal
    setItemToDelete(item);
  };

  // Execute deletion confirmed by user
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;

    // 1. Remove from active menu list
    const updated = menuItems.filter((i) => i.id !== itemToDelete.id);
    onUpdateMenu(updated);

    // 2. Remove from sample menu template in storage so it won't be revived
    const currentSample = getStoredSampleMenu();
    const updatedSample = currentSample.filter((i) => i.id !== itemToDelete.id);
    saveStoredSampleMenu(updatedSample);

    if (onToast) {
      onToast(`Đã xóa món "${itemToDelete.name}" khỏi thực đơn và danh sách mẫu!`);
    }

    setItemToDelete(null);
  };

  // Add item
  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPrice <= 0) return;

    const finalImage = newImage.trim() || DEFAULT_FALLBACK_IMAGE;

    const newItem: MenuItem = {
      id: `menu-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      price: Number(newPrice),
      unit: newUnit.trim() || 'Phần',
      isAvailable: true,
      image: finalImage,
    };

    const updatedMenu = [newItem, ...menuItems].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category === 'main' ? -1 : 1;
      }
      return 0;
    });

    onUpdateMenu(updatedMenu);

    // Also add to sample menu storage
    const currentSample = getStoredSampleMenu();
    saveStoredSampleMenu([newItem, ...currentSample]);

    setShowAddModal(false);
    setNewName('');
    setNewPrice(50000);
    setNewImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80');

    if (onToast) {
      onToast(`Đã thêm món "${newItem.name}" vào thực đơn!`);
    }
  };

  // Export menu to JSON file
  const handleExportMenu = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(menuItems, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `thuc-don-quan-nuong-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (onToast) onToast('Đã tải xuống file sao lưu thực đơn thành công!');
    } catch (err) {
      console.error('Export failed', err);
      if (onToast) onToast('Không thể xuất file thực đơn. Vui lòng thử lại.');
    }
  };

  // Import menu from JSON file
  const handleImportMenu = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && parsed[0].price !== undefined) {
          onUpdateMenu(parsed);
          saveStoredSampleMenu(parsed);
          if (onToast) onToast(`Đã nạp thành công ${parsed.length} món vào thực đơn!`);
        } else {
          if (onToast) onToast('File không đúng định dạng danh sách thực đơn!');
        }
      } catch (err) {
        console.error('Import parse error', err);
        if (onToast) onToast('Lỗi khi đọc file thực đơn!');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // Filter and sort: Món chính lên đầu tiên, sau đó đến đồ uống
  const filteredItems = menuItems
    .filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.name.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.category !== b.category) {
        return a.category === 'main' ? -1 : 1;
      }
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Top Filter and Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm món ăn, đồ uống..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs & Add button */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả ({menuItems.length})
            </button>
            <button
              onClick={() => setSelectedCategory('main')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'main'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🍲 Món chính ({menuItems.filter((i) => i.category === 'main').length})
            </button>
            <button
              onClick={() => setSelectedCategory('drink')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'drink'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🍺 Đồ uống ({menuItems.filter((i) => i.category === 'drink').length})
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Hidden file input for import */}
            <input
              id="import-menu-input"
              type="file"
              accept=".json"
              onChange={handleImportMenu}
              className="hidden"
            />
            <button
              id="btn-export-menu"
              type="button"
              onClick={handleExportMenu}
              title="Sao lưu thực đơn ra file JSON"
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Xuất file</span>
            </button>
            <label
              htmlFor="import-menu-input"
              title="Nhập thực đơn từ file JSON"
              className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Nhập file</span>
            </label>
            <button
              id="btn-add-menu-item"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm món
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Menu Items */}
      <div className="grid grid-cols-1 content-start auto-rows-max sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md min-h-fit shrink-0 ${
              item.isAvailable ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'
            }`}
          >
            {/* Image & Badges */}
            <div className="relative h-44 sm:h-36 shrink-0 overflow-hidden bg-slate-100">
              <img
                src={getReliableFoodImage(item.name, item.category, item.image)}
                alt={item.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const fallback = getReliableFoodImage(item.name, item.category);
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  } else {
                    e.currentTarget.src = DEFAULT_FALLBACK_FOOD_IMAGE;
                  }
                }}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                {item.category === 'main' ? 'Món chính' : 'Đồ uống'}
              </span>

              <span
                className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  item.isAvailable
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {item.isAvailable ? 'Còn món' : 'Hết món'}
              </span>
            </div>

            {/* Details */}
            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-snug">
                  {item.name}
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>Đơn vị: {item.unit}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="font-black text-rose-700 text-sm sm:text-base">
                  {formatCurrency(item.price)}
                </span>

                <div className="flex items-center gap-1">
                  {/* Edit button */}
                  <button
                    id={`btn-edit-${item.id}`}
                    onClick={() => handleOpenEditModal(item)}
                    title="Chỉnh sửa món"
                    className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 border border-slate-200 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleAvailability(item.id)}
                    title={item.isAvailable ? 'Đánh dấu Hết món' : 'Đánh dấu Còn món'}
                    className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      item.isAvailable
                        ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-300'
                        : 'text-slate-500 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    {item.isAvailable ? 'Còn' : 'Hết'}
                  </button>

                  <button
                    id={`btn-delete-${item.id}`}
                    onClick={() => handleInitiateDelete(item)}
                    title="Xóa món khỏi thực đơn"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
          <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600 font-semibold text-sm">Không tìm thấy món ăn nào</p>
          <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa hoặc danh mục lọc.</p>
        </div>
      )}

      {/* Add New Dish Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Thêm món mới vào thực đơn</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewItem} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên món ăn / Đồ uống *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lẩu bò nhúng giấm, Bia Sapporo..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Danh mục
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MenuCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="main">🍲 Món chính</option>
                    <option value="drink">🍺 Đồ uống</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Đĩa, Nồi, Ly, Lon..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Giá bán (VNĐ) *
                </label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-rose-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Hình ảnh minh họa
                </label>
                <input
                  type="url"
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none mb-2"
                />

                {/* Quick image samples */}
                <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Hoặc chọn nhanh ảnh mẫu có sẵn:</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SAMPLE_IMAGES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewImage(sample.url)}
                      className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        newImage === sample.url ? 'border-amber-500 ring-2 ring-amber-300' : 'border-slate-200'
                      }`}
                    >
                      <img
                        src={sample.url}
                        alt={sample.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-950/70 text-white text-[9px] truncate px-1 text-center">
                        {sample.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-sm"
                >
                  Thêm vào thực đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dish Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">Chỉnh sửa thông tin món</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                    {editingItem.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên món ăn / Đồ uống *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Danh mục
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as MenuCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="main">🍲 Món chính</option>
                    <option value="drink">🍺 Đồ uống</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="Đĩa, Nồi, Ly, Phần..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Giá bán (VNĐ) *
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-rose-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Image URL & Live Preview */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Đường dẫn hình ảnh minh họa (URL)
                </label>
                <input
                  type="url"
                  value={editImage}
                  onChange={(e) => {
                    setEditImage(e.target.value);
                    setEditImageError(false);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none mb-2"
                />

                {/* Live Preview Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                    <img
                      src={editImage || DEFAULT_FALLBACK_IMAGE}
                      alt="Xem trước hình ảnh"
                      referrerPolicy="no-referrer"
                      onLoad={() => setEditImageError(false)}
                      onError={() => {
                        setEditImageError(true);
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 text-xs space-y-1">
                    <p className="font-bold text-slate-700 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                      Xem trước hiển thị hình ảnh
                    </p>
                    {editImageError ? (
                      <p className="text-rose-600 text-[11px] leading-relaxed">
                        ⚠️ Link ảnh tải thất bại. Khi lưu, ứng dụng sẽ tự động dùng ảnh dự phòng chuẩn để không bị vỡ giao diện.
                      </p>
                    ) : (
                      <p className="text-emerald-700 text-[11px] leading-relaxed">
                        ✓ Hình ảnh tải thành công, sắc nét và sẵn sàng sử dụng.
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick image samples */}
                <div className="mt-3">
                  <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Hoặc bấm chọn nhanh ảnh mẫu sắc nét:</p>
                  <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {SAMPLE_IMAGES.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEditImage(sample.url);
                          setEditImageError(false);
                        }}
                        className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all ${
                          editImage === sample.url ? 'border-amber-500 ring-2 ring-amber-300' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={sample.url}
                          alt={sample.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-slate-950/75 text-white text-[8px] truncate px-0.5 text-center block">
                          {sample.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-save-edit-dish"
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Warning Modal: Cannot delete because item is ordered at active tables */}
      {conflictInfo && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-5 sm:p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                Không thể xóa món ăn này!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Món <strong className="text-slate-900">"{conflictInfo.item.name}"</strong> hiện đang được gọi phục vụ tại các bàn:
              </p>
            </div>

            {/* List of conflicting tables */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-wrap items-center justify-center gap-2">
              {conflictInfo.tableNames.map((tableName, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-amber-200 text-amber-900 rounded-xl text-xs font-bold shadow-2xs"
                >
                  📍 {tableName}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Theo quy tắc bảo đảm an toàn dữ liệu quán, bạn vui lòng hoàn tất đơn thanh toán hoặc đổi món tại các bàn trên trước khi xóa món này khỏi thực đơn.
            </p>

            <button
              onClick={() => setConflictInfo(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Xác nhận xóa món ăn
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xóa món ăn ra khỏi thực đơn & danh sách mẫu
                  </p>
                </div>
              </div>

              {/* Item Preview Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                <img
                  src={itemToDelete.image}
                  alt={itemToDelete.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 inline-block mb-1">
                    {itemToDelete.category === 'main' ? 'Món chính' : 'Đồ uống'} • {itemToDelete.unit}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm truncate">
                    {itemToDelete.name}
                  </h4>
                  <p className="text-rose-700 font-extrabold text-sm">
                    {formatCurrency(itemToDelete.price)}
                  </p>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 text-xs text-rose-900 leading-relaxed">
                <p className="font-bold mb-0.5">⚠️ Lưu ý quan trọng:</p>
                <p>
                  Món ăn này sẽ bị xóa khỏi thực đơn hiện tại và loại bỏ vĩnh viễn khỏi danh sách món ăn mẫu của ứng dụng.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-delete-item"
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Utensils, Clock, DollarSign, Users, AlertCircle, ChefHat } from 'lucide-react';

interface HeaderProps {
  activeTab: 'tables' | 'menu' | 'kitchen' | 'history';
  setActiveTab: (tab: 'tables' | 'menu' | 'kitchen' | 'history') => void;
  occupiedCount: number;
  totalTables: number;
  waitingCount: number;
  todayRevenue: number;
  onResetData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  occupiedCount,
  totalTables,
  waitingCount,
  onResetData,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center shadow-inner text-white font-bold">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-1.5">
              Quán bánh tráng nướng dì Nguyệt
              <span className="hidden sm:inline-block text-[11px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                POS Trực Tiếp
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                {timeStr}
              </span>
              <span className="hidden md:inline">• Bán hàng tại bàn</span>
            </p>
          </div>
        </div>

        {/* Quick Stat Pill & Reset */}
        <div className="flex items-center gap-2">
          {/* Occupied pill */}
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-amber-300">{occupiedCount}</span>
            <span className="text-slate-400">/{totalTables} bàn</span>
            {waitingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-300 font-medium text-[10px] animate-pulse">
                {waitingCount} chờ tính
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="bg-slate-800 border-t border-slate-700/60 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
          <button
            id="tab-tables"
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'tables'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Sơ đồ bàn ăn
            {waitingCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {waitingCount}
              </span>
            )}
          </button>

          <button
            id="tab-menu"
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'menu'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Quản lý Thực đơn
          </button>

          <button
            id="tab-kitchen"
            onClick={() => setActiveTab('kitchen')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'kitchen'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Màn hình bếp (KDS)
          </button>

          <button
            id="tab-history"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Lịch sử hóa đơn & Doanh thu
          </button>
        </div>
      </div>
    </header>
  );
};

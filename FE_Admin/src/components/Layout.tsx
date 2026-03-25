import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  LayoutDashboard,
  Package,
  BarChart3,
  AlertTriangle,
  Sparkles,
  FileText,
  LogOut,
  Menu,
  X,
  Factory,
  User,
  Shield,
  Settings,
  Circle,
  BoxIcon } from
'lucide-react';
import { Button } from './ui/Button';
interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, logout } = useInventory();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    enabled: true
  },
  {
    id: 'materials',
    label: 'Kho hàng',
    icon: Package,
    enabled: true
  },
  {
    id: 'products',
    label: 'Sản phẩm & Định mức',
    icon: BoxIcon,
    enabled: true
  },
  {
    id: 'production',
    label: 'Sản xuất',
    icon: BarChart3,
    enabled: false
  },
  {
    id: 'restock',
    label: 'Cảnh báo kho',
    icon: AlertTriangle,
    enabled: true
  },
  {
    id: 'ai-pricing',
    label: 'Định giá AI',
    icon: Sparkles,
    enabled: false,
    badge: true
  },
  {
    id: 'ai-marketing',
    label: 'Tiếp thị AI',
    icon: FileText,
    enabled: false,
    badge: true
  },
  {
    id: 'history',
    label: 'Báo cáo',
    icon: BarChart3,
    enabled: true,
    badge: true
  }];

  const handleNavClick = (id: string, enabled: boolean) => {
    if (!enabled) return;
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };
  const activeTabLabel =
  navItems.find((i) => i.id === activeTab)?.label || 'Dashboard';
  return (
    <div className="min-h-screen bg-craft-bg flex font-sans">
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen &&
      <div
        className="fixed inset-0 z-20 bg-stone-900/50 lg:hidden"
        onClick={() => setIsMobileMenuOpen(false)} />

      }

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-stone-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Logo Section */}
        <div className="flex items-center px-5 pt-6 pb-5 shrink-0">
          <div className="h-11 w-11 bg-craft-primary rounded-xl flex items-center justify-center mr-3 shrink-0 shadow-sm">
            <Factory className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-extrabold text-xl tracking-tight text-stone-900 leading-none">
              CRAFTFLOW
            </h2>
            <span className="text-xs text-stone-400 mt-0.5"></span>
          </div>
          <button
            className="lg:hidden ml-auto text-stone-400 hover:text-stone-600"
            onClick={() => setIsMobileMenuOpen(false)}>
            
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User Profile Section */}
        <div className="px-5 pb-5 flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 bg-stone-50 rounded-full flex items-center justify-center shrink-0 border border-stone-200">
            <User className="h-5 w-5 text-stone-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate">
              {user?.name || 'Nguyễn Quách Khang Ninh'}
            </p>
            <div className="mt-0.5">
              <span className="inline-block px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-semibold rounded-md">
                {user?.role || 'Quản lý'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isEnabled = item.enabled;
            const hasBadge = (item as any).badge;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, isEnabled)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${isActive ? 'bg-craft-primary text-white shadow-sm' : isEnabled ? 'text-stone-600 hover:bg-stone-50 hover:text-stone-900' : 'text-stone-400 cursor-default'}`}>
                
                {/* Green left accent bar for active state */}
                {isActive &&
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime-400 rounded-r-full" />
                }
                <Icon
                  className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                
                <span className="font-medium text-sm flex-1 text-left">
                  {item.label}
                </span>
                {hasBadge && !isActive &&
                <Circle className="h-3 w-3 text-stone-300 shrink-0" />
                }
              </button>);

          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pb-5 pt-3 border-t border-stone-100 space-y-0.5 shrink-0">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-xl transition-colors">
            <Settings className="h-5 w-5 shrink-0" />
            <span>Cài đặt</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 rounded-xl transition-colors">
            <Menu className="h-5 w-5 shrink-0" />
            <span>Thu gọn</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-craft-bg border-b border-stone-200 flex items-center px-4 lg:px-8 py-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}>
              
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">
                {activeTabLabel}
              </h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Chào Mừng đến với CRAFTFLOW
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="gap-2 hidden sm:flex bg-transparent border-stone-300 text-stone-700 hover:bg-stone-100">
              
              <Shield className="h-4 w-4" />
              Chế độ quản lý
            </Button>
            <Button
              variant="secondary"
              onClick={logout}
              className="gap-2 bg-transparent border-stone-300 text-stone-700 hover:bg-stone-100">
              
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>);

}
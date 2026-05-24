'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  TrendingUp, 
  Settings, 
  ShieldCheck, 
  History, 
  ChevronLeft, 
  Menu,
  Building,
  Award
} from 'lucide-react';

interface SidebarProps {
  onSearchFocus?: () => void;
}

export default function Sidebar({ onSearchFocus }: SidebarProps) {
  const { 
    currentScreen, 
    setCurrentScreen, 
    sidebarCollapsed, 
    toggleSidebar, 
    currentTenant, 
    theme 
  } = useAuthStore();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Facturação (AGT)', icon: FileText },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'products', label: 'Produtos e IVA', icon: Package },
    { id: 'reports', label: 'Relatórios & Mapas', icon: TrendingUp },
    { id: 'users', label: 'Utilizadores', icon: ShieldCheck },
    { id: 'audit_logs', label: 'Logs de Auditoria', icon: History },
    { id: 'settings', label: 'Parâmetros ERP', icon: Settings },
  ] as const;

  // Render Sidebar and style depending on light/dark mode
  const sidebarBg = 'bg-[#0F172A] text-slate-100 border-r border-slate-200/10';

  const itemHover = 'hover:bg-slate-800 hover:text-white transition-colors';

  const itemActive = 'bg-blue-650 text-white font-medium shadow-sm';

  const footerBg = 'border-t border-slate-750 bg-[#0F172A]';

  return (
    <aside 
      id="ndf-sidebar" 
      className={`h-screen flex flex-col transition-all duration-300 select-none print:hidden ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } ${sidebarBg} relative z-30`}
    >
      {/* Brand Header */}
      <div className={`flex items-center justify-between h-16 border-b border-slate-750 bg-[#1E293B] ${sidebarCollapsed ? 'px-3.5' : 'px-6'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm font-sans font-bold text-base select-all">
            ND
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-sans font-bold text-base tracking-tight leading-none text-white">
                NDFATURA
              </span>
              <span className="text-[9px] font-mono mt-0.5 tracking-wider text-slate-400">
                ERP COMPLIANT
              </span>
            </div>
          )}
        </div>
        
        <button 
          id="btn-toggle-sidebar"
          onClick={toggleSidebar}
          className="p-1 rounded-md transition-colors hover:bg-slate-800 text-slate-400 hover:text-white"
          title={sidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Tenant Indicator Area */}
      {!sidebarCollapsed && currentTenant && (
        <div className="p-3.5 mx-3 mt-4 rounded-lg border border-slate-750 bg-slate-800/40">
          <div className="flex gap-2.5 items-start">
            <Building className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold truncate leading-tight text-white">
                {currentTenant.name}
              </h4>
              <p className="text-[10px] font-mono mt-0.5 text-slate-400">
                NIF: {currentTenant.nif}
              </p>
              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-emerald-400 font-medium">
                <Award className="h-3 w-3 shrink-0" />
                <span>Cert. AGT {currentTenant.agtCertificateNo}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Modules */}
      <nav className="flex-grow px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-3.5 px-2">
          {!sidebarCollapsed ? 'Menu Enterprise' : '••'}
        </div>
        
        {menuItems.map((item) => {
          const itemActiveState = currentScreen === item.id;
          const Icon = item.icon;

          return (
            <button
              id={`nav-item-${item.id}`}
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-all ${
                itemActiveState ? itemActive : `${itemHover} text-slate-450`
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${itemActiveState ? 'text-white' : 'text-slate-400'}`} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer operator check */}
      <div className={`p-3 ${footerBg}`}>
        {!sidebarCollapsed && currentTenant ? (
          <div className="flex items-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-750">
            <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center font-bold text-white text-xs mr-2.5">
              OK
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate leading-none">NIF: {currentTenant.nif}</p>
              <p className="text-slate-400 text-[10px] truncate mt-1 leading-none">Comercial Angola</p>
            </div>
          </div>
        ) : (
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 mx-auto animate-pulse" title="AGT Webservice Conectado" />
        )}
      </div>
    </aside>
  );
}

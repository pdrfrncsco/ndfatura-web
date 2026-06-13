'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import QueryProvider from '../providers/queryProvider';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import DashboardView from '../components/dashboard/DashboardView';
import InvoiceModule from '../components/invoices/InvoiceModule';
import { PaymentsModule } from '../components/payments/PaymentsModule';
import ClientsModule from '../components/clients/ClientsModule';
import ProductsModule from '../components/products/ProductsModule';
import ReportsModule from '../components/reports/ReportsModule';
import UsersModule from '../components/users/UsersModule';
import AuditLogsView from '../components/audit/AuditLogsView';
import SettingsModule from '../components/settings/SettingsModule';
import { hasAccessToken } from '../services/api';

function ApplicationShell() {
  const router = useRouter();
  const { currentScreen, isAuthenticated, bootstrapSession, currentTenant, theme } = useAuthStore();
  const { loadTenantData, isLoadingRemoteData, remoteDataError } = useDataStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  React.useEffect(() => {
    const init = async () => {
      if (hasAccessToken()) {
        await bootstrapSession();
      }
      setIsInitializing(false);
    };
    init();
  }, [bootstrapSession]);

  React.useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitializing, isAuthenticated, router]);

  React.useEffect(() => {
    if (isAuthenticated && currentTenant) {
      loadTenantData(currentTenant.id);
    }
  }, [currentTenant, isAuthenticated, loadTenantData]);

  const mainBg = theme === 'dark' 
    ? 'bg-[#0B0F19] text-slate-100' 
    : 'bg-[#F8FAFC] text-slate-900';

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050B14]">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // 2. Render complete multi-tenant platform
  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} transition-all font-sans relative overflow-hidden`}>
      
      {/* Sidebar collapsible left drawer (Fixed on mobile, Relative on desktop) */}
      <Sidebar />

      {/* Main workspace region */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Institutional Header navigators */}
        <Topbar />

        {/* Dynamic Canvas Area */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 ${mainBg}`}>
          {remoteDataError && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-500">
              {remoteDataError}
            </div>
          )}
          {isLoadingRemoteData && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-semibold text-blue-500">
              A sincronizar dados com a API...
            </div>
          )}
          {currentScreen === 'dashboard' && <DashboardView />}
          {currentScreen === 'invoices' && <InvoiceModule />}
          {currentScreen === 'payments' && <PaymentsModule />}
          {currentScreen === 'clients' && <ClientsModule />}
          {currentScreen === 'products' && <ProductsModule />}
          {currentScreen === 'reports' && <ReportsModule />}
          {currentScreen === 'users' && <UsersModule />}
          {currentScreen === 'audit_logs' && <AuditLogsView />}
          {currentScreen === 'settings' && <SettingsModule />}
        </main>

        {/* Status Bar / Footer (Clean Minimalism) */}
        <footer className={`h-10 shrink-0 border-t px-6 md:px-8 flex items-center justify-between text-[10px] font-medium transition-colors print:hidden ${
          theme === 'dark' 
            ? 'bg-slate-950 border-slate-900 text-slate-400' 
            : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-[#10B981] mr-2 animate-pulse"></span>
              <span>Sistemas Operacionais: 100% Online</span>
            </div>
            <div className="hidden sm:block">Canal AGT: 24ms</div>
            <div className="hidden md:block">Fuso Horário: WAT (Luanda)</div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400 italic">Software Validado pela AGT n.º 245</span>
            <span className="font-mono">v1.5.0-stable</span>
          </div>
        </footer>
      </div>

    </div>
  );
}

export default function RootMainPage() {
  return (
    <QueryProvider>
      <ApplicationShell />
    </QueryProvider>
  );
}

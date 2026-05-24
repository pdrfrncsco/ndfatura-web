'use client';

import * as React from 'react';
import QueryProvider from '../providers/queryProvider';
import { useAuthStore } from '../stores/authStore';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import DashboardView from '../components/dashboard/DashboardView';
import InvoiceModule from '../components/invoices/InvoiceModule';
import ClientsModule from '../components/clients/ClientsModule';
import ProductsModule from '../components/products/ProductsModule';
import ReportsModule from '../components/reports/ReportsModule';
import UsersModule from '../components/users/UsersModule';
import AuditLogsView from '../components/audit/AuditLogsView';
import SettingsModule from '../components/settings/SettingsModule';
import { Building, Lock, Mail, ChevronRight, CheckCircle } from 'lucide-react';

function ApplicationShell() {
  const { currentScreen, isAuthenticated, login, theme } = useAuthStore();
  
  // Auth Form State inside SPA Shell
  const [email, setEmail] = React.useState('ndeasdigital@gmail.com');
  const [password, setPassword] = React.useState('••••••••••••');
  const [role, setRole] = React.useState('Admin');

  // Trigger login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, role);
  };

  const mainBg = theme === 'dark' 
    ? 'bg-[#0B0F19] text-slate-100' 
    : 'bg-[#F8FAFC] text-slate-900';

  // 1. If not authenticated, render beautiful fintech login/register
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors font-sans bg-slate-950 text-slate-100 relative overflow-hidden`}>
        {/* Ambient subtle light blobs */}
        <div className="absolute top-[-10%] right-[-1%] h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-1%] h-[400px] w-[400px] rounded-full bg-emerald-600/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          
          {/* Logo center */}
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto shadow-sm tracking-tighter">
              ND
            </div>
            <h1 className="text-xl font-bold font-sans tracking-tight text-white mt-4">
              NDFATURA ERP
            </h1>
            <p className="text-slate-400 text-xs">
              SaaS de Facturação Electrónica Certificada para Angola
            </p>
          </div>

          {/* Login card */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-2 mb-2">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                Aceder ao Painel Corporativo
              </span>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Endereço de E-mail de Operador</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    id="input-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:border-blue-500 focus:outline-none"
                    placeholder="nome@empresa.ao"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Palavra-passe de Segurança</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    id="input-login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Roles Simulator Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Perfil de Acesso (Simulação)</label>
                <select
                  id="select-login-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:border-blue-500 focus:outline-none font-sans font-bold"
                >
                  <option value="Admin">Administrador (Manuel Bento)</option>
                  <option value="Financial_Director">Director Financeiro (Afonso Henriques)</option>
                  <option value="Billing_Clerk">Técnico de Facturação (Elsa Patrício)</option>
                  <option value="Auditor">Inspector Fiscal AGT (Carlos Neves)</option>
                </select>
              </div>

              {/* Login submit */}
              <button
                id="btn-login-submit"
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 transition-transform"
              >
                <span>Aceder ao Sistema</span>
                <ChevronRight className="h-4 w-4" />
              </button>

            </form>
          </div>

          {/* Registration placeholder info */}
          <div className="text-center text-[11px] text-slate-600 flex items-center justify-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            <span>Assinado digitalmente por chaves municipais autorizadas.</span>
          </div>

        </div>
      </div>
    );
  }

  // 2. Render complete multi-tenant platform
  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} transition-all font-sans relative overflow-hidden`}>
      
      {/* Sidebar collapsible left drawer */}
      <Sidebar />

      {/* Main workspace region */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Institutional Header navigators */}
        <Topbar />

        {/* Dynamic Canvas Area */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 ${mainBg}`}>
          {currentScreen === 'dashboard' && <DashboardView />}
          {currentScreen === 'invoices' && <InvoiceModule />}
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

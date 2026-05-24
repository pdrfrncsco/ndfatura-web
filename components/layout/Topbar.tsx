'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { 
  Sun, 
  Moon, 
  Bell, 
  ChevronDown, 
  Building, 
  LogOut, 
  User as UserIcon, 
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';

export default function Topbar() {
  const { 
    currentTenant, 
    tenants, 
    switchTenant, 
    user, 
    logout, 
    theme, 
    toggleTheme,
    notifications,
    markNotificationsAsRead
  } = useAuthStore();

  const [tenantOpen, setTenantOpen] = React.useState(false);
  const [notiOpen, setNotiOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [localTime, setLocalTime] = React.useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    // Luanda is UTC+1. The machine states coordinate timezone or local offset.
    // Let's print an elegant readable clock matching Angola's local time (UTC +1).
    const updateClock = () => {
      const now = new Date();
      // To get Angola time, we can handle it via Intl
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Africa/Luanda',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      setLocalTime(new Intl.DateTimeFormat('pt-PT', options).format(now));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const topbarBg = theme === 'dark' 
    ? 'bg-slate-950 border-b border-slate-900 text-slate-100' 
    : 'bg-white border-b border-slate-200 text-slate-900 shadow-sm';

  const menuCardBg = theme === 'dark'
    ? 'bg-slate-950 border border-slate-900 text-slate-100 shadow-xl'
    : 'bg-white border border-slate-200 text-slate-800 shadow-lg';

  const hoverBg = theme === 'dark'
    ? 'hover:bg-slate-900'
    : 'hover:bg-slate-50';

  return (
    <header className={`h-16 w-full px-6 flex items-center justify-between sticky top-0 z-20 ${topbarBg}`}>
      {/* 1. Left Side: Active Tenant Selector dropdown */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            id="btn-organization-selector"
            onClick={() => {
              setTenantOpen(!tenantOpen);
              setNotiOpen(false);
              setProfileOpen(false);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${hoverBg} border ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}
          >
            <Building className="h-4 w-4 text-blue-500" />
            <span>{currentTenant?.name || 'Seleccione Empresa'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {tenantOpen && (
            <div className={`absolute left-0 mt-2 w-72 rounded-lg p-2.5 z-40 ${menuCardBg}`}>
              <div className="px-2 py-1.5 border-b border-slate-900/10 mb-2">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                  Mudar de Organização
                </span>
              </div>
              <div className="space-y-1">
                {tenants.map((t) => (
                  <button
                    id={`tenant-option-${t.id}`}
                    key={t.id}
                    onClick={() => {
                      switchTenant(t.id);
                      setTenantOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-md flex flex-col transition-colors ${
                      currentTenant?.id === t.id 
                        ? (theme === 'dark' ? 'bg-blue-950/35 text-blue-400' : 'bg-blue-50 text-blue-700')
                        : hoverBg
                    }`}
                  >
                    <span className="text-xs font-semibold">{t.name}</span>
                    <span className="text-[9px] font-mono opacity-80 mt-0.5">NIF: {t.nif} | {t.city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Luanda Clock Indicator */}
        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900/60 rounded-full text-[10px] font-mono text-slate-500`}>
          <Clock className="h-3.5 w-3.5 text-blue-500" />
          <span>LUANDA:</span>
          <span className="text-slate-700 dark:text-slate-300 font-bold">{localTime}</span>
        </div>
      </div>

      {/* 2. Right Side Action Bars: Theme, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* AGT Conectado Pill */}
        <div className="hidden sm:flex items-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-full text-[10px] font-bold tracking-tight uppercase text-emerald-700 dark:text-emerald-400 mr-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></div>
          <span>AGT Conectado</span>
        </div>

        {/* Theme Toggle */}
        <button
          id="btn-theme-toggle"
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-all ${hoverBg} ${theme === 'dark' ? 'text-amber-400' : 'text-slate-500'}`}
          title={theme === 'dark' ? 'Activar Modo Claro' : 'Activar Modo Escuro'}
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            id="btn-notifications-toggle"
            onClick={() => {
              setNotiOpen(!notiOpen);
              setTenantOpen(false);
              setProfileOpen(false);
              if (unreadCount > 0) {
                markNotificationsAsRead();
              }
            }}
            className={`p-2 rounded-lg transition-all relative ${hoverBg} text-slate-400`}
            title="Sinalizações e Alertas"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse border border-white dark:border-slate-950" />
            )}
          </button>

          {notiOpen && (
            <div className={`absolute right-0 mt-2 w-96 rounded-lg p-3.5 z-40 ${menuCardBg}`}>
              <div className="flex justify-between items-center border-b border-slate-900/5 dark:border-slate-900/60 pb-2 mb-2">
                <span className="text-xs font-bold">Notificações e Alertas</span>
                <span className="text-[9px] px-2 py-0.5 bg-blue-550/10 text-blue-400 font-mono rounded-full">
                  Fiscais e Canal AGT
                </span>
              </div>
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="flex gap-2.5 items-start p-2 rounded-md bg-slate-50 dark:bg-slate-900/30 text-xs">
                    {n.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />}
                    {n.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                    {n.type === 'info' && <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
                      <span className="text-[9px] text-slate-400 dark:text-slate-600 font-mono mt-1 block">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            id="btn-profile-dropdown"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setTenantOpen(false);
              setNotiOpen(false);
            }}
            className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors ${hoverBg} text-xs`}
          >
            <div className="h-7 w-7 rounded-md bg-blue-500 text-white font-sans font-semibold flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="Avatar de Manuel Bento" className="h-full w-full object-cover" />
              ) : (
                'MB'
              )}
            </div>
            <div className="hidden sm:flex flex-col items-start text-left shrink-0">
              <span className="font-bold leading-tight truncate max-w-28">{user?.name || 'Sessão Convidado'}</span>
              <span className="text-[9px] font-mono text-slate-400">{user?.role || 'Utilizador'}</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>

          {profileOpen && (
            <div className={`absolute right-0 mt-2 w-56 rounded-lg p-2 z-40 ${menuCardBg}`}>
              <div className="p-2 border-b border-slate-900/10 mb-1">
                <p className="text-xs font-semibold">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 p-2 text-xs text-slate-400">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Perfil: {user?.role}</span>
                </div>
                <button
                  id="btn-user-profile-profile"
                  className={`w-full flex items-center gap-2 p-2 text-xs rounded-md transition-colors text-left ${hoverBg}`}
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Configurar Perfil</span>
                </button>
                <button
                  id="btn-user-logout"
                  onClick={logout}
                  className={`w-full flex items-center gap-2 p-2 text-xs rounded-md transition-colors text-left font-semibold text-red-500 ${hoverBg}`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

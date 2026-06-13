import { create } from 'zustand';
import { User, Tenant } from '../types/invoice';
import { AuthService, TenantService, hasAccessToken, setActiveTenantHeaders } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  currentTenant: Tenant | null;
  tenants: Tenant[];
  theme: 'light' | 'dark';
  currentScreen: 'dashboard' | 'invoices' | 'payments' | 'clients' | 'products' | 'reports' | 'settings' | 'users' | 'audit_logs';
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  notifications: Array<{ id: string; title: string; desc: string; time: string; read: boolean; type: 'success' | 'warning' | 'info' }>;
  
  // Actions
  login: (email: string, password: string, otp?: string) => Promise<void>;
  bootstrapSession: () => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  updateTenantProfile: (updated: Partial<Tenant>) => Promise<void>;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrentScreen: (screen: 'dashboard' | 'invoices' | 'payments' | 'clients' | 'products' | 'reports' | 'settings' | 'users' | 'audit_logs') => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  markNotificationsAsRead: () => void;
  addNotification: (noti: { title: string; desc: string; type: 'success' | 'warning' | 'info' }) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  currentTenant: null,
  tenants: [],
  theme: 'dark', 
  currentScreen: 'dashboard',
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  notifications: [
    {
      id: 'noti-1',
      title: 'Comunicação AGT Bem-sucedida',
      desc: 'Factura FT 2026/014 enviada e assinada com sucesso pelo servidor da AGT.',
      time: 'Há 5 minutos',
      read: false,
      type: 'success'
    },
    {
      id: 'noti-2',
      title: 'Limite de Certificado',
      desc: 'O certificado de assinatura digital expira em 42 dias. Considere actualizar nas definições.',
      time: 'Há 2 horas',
      read: false,
      type: 'warning'
    }
  ],

  login: async (email: string, password: string, otp?: string) => {
    const session = await AuthService.login(email, password, otp);
    const currentTenant = session.tenants[0] || null;
    setActiveTenantHeaders(currentTenant);
    set({
      isAuthenticated: true,
      user: session.user,
      tenants: session.tenants,
      currentTenant
    });
  },

  bootstrapSession: async () => {
    if (!hasAccessToken()) return;
    try {
      const session = await AuthService.me();
      const currentTenant = session.tenants[0] || null;
      setActiveTenantHeaders(currentTenant);
      set({
        isAuthenticated: true,
        user: session.user,
        tenants: session.tenants,
        currentTenant
      });
    } catch {
      AuthService.logout();
      set({ isAuthenticated: false, user: null, tenants: [], currentTenant: null });
    }
  },

  logout: () => {
    AuthService.logout();
    set({ isAuthenticated: false, user: null, tenants: [], currentTenant: null });
  },

  switchTenant: (tenantId: string) => {
    set((state) => {
      const selected = state.tenants.find((t) => t.id === tenantId) || state.currentTenant;
      setActiveTenantHeaders(selected);
      return { currentTenant: selected };
    });
  },

  updateTenantProfile: async (updated: Partial<Tenant>) => {
    const { currentTenant, tenants } = useAuthStore.getState();
    if (!currentTenant) return;

    try {
        const serverTenant = await TenantService.update(currentTenant.id, updated);
        set({
            currentTenant: serverTenant,
            tenants: tenants.map((t) => t.id === serverTenant.id ? serverTenant : t)
        });
    } catch (error) {
        console.error('Error updating tenant profile:', error);
        throw error;
    }
  },

  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  setTheme: (theme: 'light' | 'dark') => set({ theme }),

  setCurrentScreen: (screen) => set({ currentScreen: screen, mobileSidebarOpen: false }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

  markNotificationsAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true }))
  })),

  addNotification: (noti) => set((state) => ({
    notifications: [
      {
        id: `noti-${Date.now()}`,
        title: noti.title,
        desc: noti.desc,
        time: 'Agora',
        read: false,
        type: noti.type
      },
      ...state.notifications
    ]
  }))
}));

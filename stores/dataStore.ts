import { create } from 'zustand';
import { Client, Product, Invoice, AuditLog, DashboardStats, Receipt } from '../types/invoice';
import { AuditService, ClientService, DashboardService, InvoiceService, ProductService, ReceiptService } from '../services/api';

interface DataState {
  clients: Client[];
  products: Product[];
  invoices: Invoice[];
  receipts: Receipt[];
  auditLogs: AuditLog[];
  dashboardStatsByTenant: Record<string, DashboardStats>;
  isLoadingRemoteData: boolean;
  remoteDataError: string | null;

  // Remote sync
  loadTenantData: (tenantId: string) => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchReceipts: () => Promise<void>;
  
  // Actions for Clients
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, updated: Partial<Client>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;
  
  // Actions for Products
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, updated: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Actions for Invoices
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNo' | 'invoiceHash' | 'qrcodeString'>) => Promise<Invoice>;
  issueInvoice: (id: string) => Promise<Invoice>;
  cancelInvoice: (id: string, reason: string) => Promise<Invoice>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void;
  syncInvoiceWithAGT: (id: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  
  // Actions for Receipts
  addReceipt: (receipt: Receipt) => void;
  
  // Stats Calculator
  getDashboardStats: (tenantId: string) => DashboardStats;
}

// Initial Seeds
const SEED_CLIENTS: Client[] = [];
const SEED_PRODUCTS: Product[] = [];
const SEED_INVOICES: Invoice[] = [];
const SEED_AUDIT_LOGS: AuditLog[] = [];

// Helper to load/save state
const isBrowser = typeof window !== 'undefined';
const getStorageItem = <T>(key: string, fallback: T): T => {
  if (!isBrowser) return fallback;
  const val = localStorage.getItem(key);
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const setStorageItem = <T>(key: string, data: T) => {
  if (isBrowser) {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

export const useDataStore = create<DataState>((set, get) => ({
  clients: getStorageItem('ndf_clients', SEED_CLIENTS),
  products: getStorageItem('ndf_products', SEED_PRODUCTS),
  invoices: getStorageItem('ndf_invoices', SEED_INVOICES),
  receipts: getStorageItem('ndf_receipts', []),
  auditLogs: getStorageItem('ndf_audit_logs', SEED_AUDIT_LOGS),
  dashboardStatsByTenant: {},
  isLoadingRemoteData: false,
  remoteDataError: null,

  loadTenantData: async (tenantId) => {
    set({ isLoadingRemoteData: true, remoteDataError: null });
    try {
      const [clients, products, invoices, receipts, auditLogs, dashboardStats] = await Promise.all([
        ClientService.getAll(),
        ProductService.getAll(),
        InvoiceService.getAll(),
        ReceiptService.getAll(),
        AuditService.getAll(),
        DashboardService.getStats()
      ]);

      set((state) => ({
        clients,
        products,
        invoices,
        receipts,
        auditLogs,
        dashboardStatsByTenant: {
          ...state.dashboardStatsByTenant,
          [tenantId]: dashboardStats
        },
        isLoadingRemoteData: false,
        remoteDataError: null
      }));

      setStorageItem('ndf_clients', clients);
      setStorageItem('ndf_products', products);
      setStorageItem('ndf_invoices', invoices);
      setStorageItem('ndf_receipts', receipts);
      setStorageItem('ndf_audit_logs', auditLogs);
    } catch (error) {
      set({
        isLoadingRemoteData: false,
        remoteDataError: error instanceof Error ? error.message : 'Falha ao sincronizar dados com a API.'
      });
    }
  },

  fetchClients: async () => {
    try {
      const clients = await ClientService.getAll();
      set({ clients });
      setStorageItem('ndf_clients', clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  },

  fetchInvoices: async () => {
    try {
      const invoices = await InvoiceService.getAll();
      set({ invoices });
      setStorageItem('ndf_invoices', invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  },

  fetchReceipts: async () => {
    try {
      const receipts = await ReceiptService.getAll();
      set({ receipts });
      setStorageItem('ndf_receipts', receipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  },

  addClient: async (clientData) => {
    set({ remoteDataError: null });
    try {
      const newClient = await ClientService.create(clientData);
      const updated = [...get().clients.filter((client) => client.id !== newClient.id), newClient];
      set({ clients: updated });
      setStorageItem('ndf_clients', updated);
      return newClient;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao criar cliente na API.' });
      throw error;
    }
  },

  updateClient: async (id, updatedFields) => {
    set({ remoteDataError: null });
    try {
      const serverClient = await ClientService.update(id, updatedFields);
      const updated = get().clients.map((client) => (client.id === id ? serverClient : client));
      set({ clients: updated });
      setStorageItem('ndf_clients', updated);
      return serverClient;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao actualizar cliente na API.' });
      throw error;
    }
  },

  deleteClient: async (id) => {
    set({ remoteDataError: null });
    try {
      await ClientService.delete(id);
      const updated = get().clients.filter((c) => c.id !== id);
      set({ clients: updated });
      setStorageItem('ndf_clients', updated);
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao remover cliente na API.' });
      throw error;
    }
  },

  addProduct: async (productData) => {
    set({ remoteDataError: null });
    try {
      const newProduct = await ProductService.create(productData);
      const updated = [...get().products.filter((product) => product.id !== newProduct.id), newProduct];
      set({ products: updated });
      setStorageItem('ndf_products', updated);
      return newProduct;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao criar produto na API.' });
      throw error;
    }
  },

  updateProduct: async (id, updatedFields) => {
    set({ remoteDataError: null });
    try {
      const serverProduct = await ProductService.update(id, updatedFields);
      const updated = get().products.map((product) => (product.id === id ? serverProduct : product));
      set({ products: updated });
      setStorageItem('ndf_products', updated);
      return serverProduct;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao actualizar produto na API.' });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ remoteDataError: null });
    try {
      await ProductService.delete(id);
      const updated = get().products.filter((p) => p.id !== id);
      set({ products: updated });
      setStorageItem('ndf_products', updated);
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao remover produto na API.' });
      throw error;
    }
  },

  addInvoice: async (invoiceData) => {
    set({ remoteDataError: null });
    try {
      const newInvoice = await InvoiceService.create(invoiceData);
      const updated = [newInvoice, ...get().invoices.filter((invoice) => invoice.id !== newInvoice.id)];
      set({ invoices: updated });
      setStorageItem('ndf_invoices', updated);
      return newInvoice;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao criar rascunho de factura na API.' });
      throw error;
    }
  },

  issueInvoice: async (id) => {
    set({ remoteDataError: null });
    try {
      const issuedInvoice = await InvoiceService.issue(id);
      const updated = get().invoices.map((invoice) => (invoice.id === id ? issuedInvoice : invoice));
      set({ invoices: updated });
      setStorageItem('ndf_invoices', updated);
      return issuedInvoice;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao emitir documento fiscal na API.' });
      throw error;
    }
  },

  cancelInvoice: async (id, reason) => {
    set({ remoteDataError: null });
    try {
      const cancelledInvoice = await InvoiceService.cancel(id, reason);
      const updated = get().invoices.map((invoice) => (invoice.id === id ? cancelledInvoice : invoice));
      set({ invoices: updated });
      setStorageItem('ndf_invoices', updated);
      return cancelledInvoice;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao cancelar documento fiscal na API.' });
      throw error;
    }
  },

  updateInvoiceStatus: (id, status) => {
    const updated = get().invoices.map((i) => {
      if (i.id === id) {
        return { ...i, status };
      }
      return i;
    });
    set({ invoices: updated });
    setStorageItem('ndf_invoices', updated);
  },

  syncInvoiceWithAGT: (id) => {
    const updated = get().invoices.map((i) => {
      if (i.id === id) {
        return {
          ...i,
          status: 'AGT_Synced' as const,
        };
      }
      return i;
    });
    set({ invoices: updated });
    setStorageItem('ndf_invoices', updated);
  },

  addAuditLog: (logData) => {
    const newLog: AuditLog = {
      ...logData,
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    const updated = [newLog, ...get().auditLogs].slice(0, 100); 
    set({ auditLogs: updated });
    setStorageItem('ndf_audit_logs', updated);
  },

  addReceipt: (receipt) => {
    const updated = [receipt, ...get().receipts];
    set({ receipts: updated });
    setStorageItem('ndf_receipts', updated);
  },

  getDashboardStats: (tenantId) => {
    const remoteStats = get().dashboardStatsByTenant[tenantId];
    if (remoteStats) return remoteStats;

    // Fallback or computed stats logic...
    return {
      totalInvoiced: 0,
      revenueCollected: 0,
      taxesCollected: 0,
      withholdingCollected: 0,
      pendingAmount: 0,
      draftCount: 0,
      issuedCount: 0,
      paidCount: 0,
      syncSuccessRate: 100,
      monthlyRevenue: [],
      categorySales: [],
      recentActivity: []
    };
  }
}));

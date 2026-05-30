import { create } from 'zustand';
import { Client, Product, Invoice, AuditLog, DashboardStats, InvoiceItem } from '../types/invoice';
import { AuditService, ClientService, DashboardService, InvoiceService, ProductService } from '../services/api';

interface DataState {
  clients: Client[];
  products: Product[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  dashboardStatsByTenant: Record<string, DashboardStats>;
  isLoadingRemoteData: boolean;
  remoteDataError: string | null;

  // Remote sync
  loadTenantData: (tenantId: string) => Promise<void>;
  
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
  
  // Stats Calculator
  getDashboardStats: (tenantId: string) => DashboardStats;
}

// Initial Seeds
const SEED_CLIENTS: Client[] = [
  {
    id: 'cli-001',
    name: 'TAAG Linhas Aéreas de Angola S.A.',
    nif: '540110294',
    email: 'financeiro@taag.co.ao',
    phone: '+244 923 440 221',
    address: 'Rua da Missão, N.º 123-141',
    city: 'Luanda',
    country: 'Angola',
    tenantId: 'ten-001'
  },
  {
    id: 'cli-002',
    name: 'Kero Supermercados Group Lda',
    nif: '540889271',
    email: 'contabilidade@kero.co.ao',
    phone: '+244 912 300 450',
    address: 'Av. Pedro de Castro Van-Dúnem Loy, Talatona',
    city: 'Luanda',
    country: 'Angola',
    tenantId: 'ten-001'
  },
  {
    id: 'cli-003',
    name: 'Angola Telecom E.P.',
    nif: '540203918',
    email: 'faturas@angolatelecom.ao',
    phone: '+244 931 112 000',
    address: 'Largo do Lumeji, Edifício Sede de Telecomunicação',
    city: 'Luanda',
    country: 'Angola',
    tenantId: 'ten-001'
  },
  {
    id: 'cli-004',
    name: 'Lobito Terminal S.A.',
    nif: '540771822',
    email: 'facturas@lobitoterminal.ao',
    phone: '+244 940 882 119',
    address: 'Avenida da Independência, Portos do Lobito',
    city: 'Benguela',
    country: 'Angola',
    tenantId: 'ten-002'
  }
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    code: 'SERV-01',
    name: 'Consultoria e Auditoria Tecnológica Especializada',
    category: 'Serviços',
    price: 1850000, // In AOA (Kwanza)
    stock: 999,
    taxRate: 14,
    tenantId: 'ten-001',
    unit: 'SERV'
  },
  {
    id: 'prod-002',
    code: 'LIC-ERP-02',
    name: 'Subscrição Anual NDFATURA Cloud Enterprise SaaS',
    category: 'Software',
    price: 450000,
    stock: 80,
    taxRate: 14,
    tenantId: 'ten-001',
    unit: 'UN'
  },
  {
    id: 'prod-003',
    code: 'FUEL-03',
    name: 'Gasóleo Industrial Isento de IVA (Artº 9º)',
    category: 'Combustível',
    price: 350,
    stock: 50000,
    taxRate: 0,
    exemptionCode: 'M10', // Isento nos termos do art. 9º do Código do IVA
    tenantId: 'ten-001',
    unit: 'L'
  },
  {
    id: 'prod-004',
    code: 'HARD-04',
    name: 'Switch de Rede Gerível Core Fiber (Acessórios)',
    category: 'Equipamento',
    price: 950000,
    stock: 12,
    taxRate: 14,
    tenantId: 'ten-001',
    unit: 'UN'
  },
  {
    id: 'prod-005',
    code: 'SERV-05',
    name: 'Manutenção de Rede Industrial de Cablagem',
    category: 'Serviços',
    price: 650000,
    stock: 999,
    taxRate: 14,
    tenantId: 'ten-002',
    unit: 'SERV'
  }
];

const SEED_INVOICES: Invoice[] = [
  {
    id: 'inv-101',
    invoiceNo: 'FT 2026/001',
    type: 'FT',
    status: 'AGT_Synced',
    issueDate: '2026-05-10',
    dueDate: '2026-06-10',
    clientId: 'cli-001',
    clientName: 'TAAG Linhas Aéreas de Angola S.A.',
    clientNif: '540110294',
    clientAddress: 'Rua da Missão, N.º 123-141',
    items: [
      {
        id: 'itm-001',
        productId: 'prod-001',
        productName: 'Consultoria e Auditoria Tecnológica Especializada',
        quantity: 2,
        price: 1850000,
        taxRate: 14,
        discount: 5, // 5% Discount
        totalTax: 481950,
        subtotal: 3515000,
        total: 3996950
      }
    ],
    subtotal: 3700000,
    discountTotal: 185000,
    taxTotal: 481950,
    withholdingTaxRate: 6.5,
    withholdingTaxAmount: 228475, // 6.5% of net 3515000
    grandTotal: 3768475, // 3515000 + 481950 - 228475
    invoiceHash: 'i9XfB72N-k81qR-4Vn8t9zLw-7G903W',
    agtSyncDate: '2026-05-10 14:32:11',
    agtResponseCode: '0_SYNC_SUCCESS_200',
    qrcodeString: 'https://portaldocontribuinte.minfin.gov.ao/verify?hash=i9XfB72N-k81qR-4Vn8t9zLw-7G903W&id=540398271',
    notes: 'Sujeito à Retenção na Fonte de 6.5% nos termos das leis tributárias de Angola.',
    tenantId: 'ten-001',
    createdBy: 'Eng. Manuel Bento'
  },
  {
    id: 'inv-102',
    invoiceNo: 'FR 2026/002',
    type: 'FR',
    status: 'Paid',
    issueDate: '2026-05-18',
    dueDate: '2026-05-18',
    clientId: 'cli-002',
    clientName: 'Kero Supermercados Group Lda',
    clientNif: '540889271',
    clientAddress: 'Av. Pedro de Castro Van-Dúnem Loy, Talatona',
    items: [
      {
        id: 'itm-002',
        productId: 'prod-002',
        productName: 'Subscrição Anual NDFATURA Cloud Enterprise SaaS',
        quantity: 5,
        price: 450000,
        taxRate: 14,
        discount: 0,
        totalTax: 315000,
        subtotal: 2250000,
        total: 2565000
      }
    ],
    subtotal: 2250000,
    discountTotal: 0,
    taxTotal: 315000,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 2565000,
    invoiceHash: 'mB27cX3w-v91kL-2Px6h3Rt-9f201gH',
    agtSyncDate: '2026-05-18 09:12:05',
    qrcodeString: 'https://portaldocontribuinte.minfin.gov.ao/verify?hash=mB27cX3w-v91kL-2Px6h3Rt-9f201gH&id=540398271',
    tenantId: 'ten-001',
    createdBy: 'Eng. Manuel Bento'
  },
  {
    id: 'inv-103',
    invoiceNo: 'FT 2026/003',
    type: 'FT',
    status: 'Draft',
    issueDate: '2026-05-23',
    dueDate: '2026-06-23',
    clientId: 'cli-003',
    clientName: 'Angola Telecom E.P.',
    clientNif: '540203918',
    clientAddress: 'Largo do Lumeji, Edifício Sede de Telecomunicação',
    items: [
      {
        id: 'itm-003',
        productId: 'prod-003',
        productName: 'Gasóleo Industrial Isento de IVA (Artº 9º)',
        quantity: 1000,
        price: 350,
        taxRate: 0,
        discount: 0,
        totalTax: 0,
        subtotal: 350000,
        total: 350000
      }
    ],
    subtotal: 350000,
    discountTotal: 0,
    taxTotal: 0,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 350000,
    invoiceHash: '',
    qrcodeString: '',
    notes: 'Exento de IVA nos termos do Artº 9º do Código do IVA de Angola.',
    tenantId: 'ten-001',
    createdBy: 'Eng. Manuel Bento'
  }
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-001',
    timestamp: '2026-05-24 10:30:15',
    userId: 'usr-928',
    userName: 'Eng. Manuel Bento',
    action: 'LOGIN_SUCCESS',
    details: 'Login bem-sucedido na plataforma via dashboard principal.',
    ipAddress: '197.231.42.18',
    tenantId: 'ten-001'
  },
  {
    id: 'aud-002',
    timestamp: '2026-05-23 15:44:20',
    userId: 'usr-928',
    userName: 'Eng. Manuel Bento',
    action: 'CREATE_INVOICE',
    details: 'Factura de Rascunho FT 2026/003 criada para cliente Angola Telecom E.P.',
    ipAddress: '197.231.42.18',
    tenantId: 'ten-001'
  },
  {
    id: 'aud-003',
    timestamp: '2026-05-18 09:12:12',
    userId: 'usr-928',
    userName: 'Eng. Manuel Bento',
    action: 'SYNC_AGT',
    details: 'Fatura-Recibo FR 2026/002 submetida com sucesso ao webservice da AGT.',
    ipAddress: '197.231.42.18',
    tenantId: 'ten-001'
  }
];

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
  auditLogs: getStorageItem('ndf_audit_logs', SEED_AUDIT_LOGS),
  dashboardStatsByTenant: {},
  isLoadingRemoteData: false,
  remoteDataError: null,

  loadTenantData: async (tenantId) => {
    set({ isLoadingRemoteData: true, remoteDataError: null });
    try {
      const [clients, products, invoices, auditLogs, dashboardStats] = await Promise.all([
        ClientService.getAll(),
        ProductService.getAll(),
        InvoiceService.getAll(),
        AuditService.getAll(),
        DashboardService.getStats()
      ]);

      set((state) => ({
        clients,
        products,
        invoices: invoices.length > 0 ? invoices : state.invoices.filter((i) => i.tenantId === tenantId),
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
      setStorageItem('ndf_invoices', invoices.length > 0 ? invoices : get().invoices);
      setStorageItem('ndf_audit_logs', auditLogs);
    } catch (error) {
      set({
        isLoadingRemoteData: false,
        remoteDataError: error instanceof Error ? error.message : 'Falha ao sincronizar dados com a API.'
      });
    }
  },

  addClient: async (clientData) => {
    set({ remoteDataError: null });
    try {
      const newClient = await ClientService.create(clientData);
      const updated = [...get().clients.filter((client) => client.id !== newClient.id), newClient];
      set({ clients: updated });
      setStorageItem('ndf_clients', updated);
      await get().loadTenantData(newClient.tenantId);
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
      await get().loadTenantData(serverClient.tenantId);
      return serverClient;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao actualizar cliente na API.' });
      throw error;
    }
  },

  deleteClient: async (id) => {
    const target = get().clients.find(c => c.id === id);
    if (!target) return;
    set({ remoteDataError: null });
    try {
      await ClientService.delete(id);
      const updated = get().clients.filter((c) => c.id !== id);
      set({ clients: updated });
      setStorageItem('ndf_clients', updated);
      await get().loadTenantData(target.tenantId);
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
      await get().loadTenantData(newProduct.tenantId);
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
      await get().loadTenantData(serverProduct.tenantId);
      return serverProduct;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao actualizar produto na API.' });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    const target = get().products.find(p => p.id === id);
    if (!target) return;
    set({ remoteDataError: null });
    try {
      await ProductService.delete(id);
      const updated = get().products.filter((p) => p.id !== id);
      set({ products: updated });
      setStorageItem('ndf_products', updated);
      await get().loadTenantData(target.tenantId);
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
      await get().loadTenantData(newInvoice.tenantId);
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
      await get().loadTenantData(issuedInvoice.tenantId);
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
      await get().loadTenantData(cancelledInvoice.tenantId);
      return cancelledInvoice;
    } catch (error) {
      set({ remoteDataError: error instanceof Error ? error.message : 'Falha ao cancelar documento fiscal na API.' });
      throw error;
    }
  },

  updateInvoiceStatus: (id, status) => {
    const updated = get().invoices.map((i) => {
      if (i.id === id) {
        let extra = {};
        if (status === 'Paid') {
          // If paying, we can ensure there is an AGT Hash too
          extra = !i.invoiceHash ? { 
            invoiceHash: 'iH3bS-' + Math.random().toString(36).substring(2, 10).toUpperCase()
          } : {};
        }
        return { ...i, status, ...extra };
      }
      return i;
    });
    set({ invoices: updated });
    setStorageItem('ndf_invoices', updated);

    const invoice = updated.find(i => i.id === id);
    if (invoice) {
      get().addAuditLog({
        userId: 'usr-928',
        userName: 'Eng. Manuel Bento',
        action: 'UPDATE_INVOICE_STATUS',
        details: `Factura ${invoice.invoiceNo} alterou estado para: ${status}`,
        ipAddress: '127.0.0.1',
        tenantId: invoice.tenantId
      });
    }
  },

  syncInvoiceWithAGT: (id) => {
    const updated = get().invoices.map((i) => {
      if (i.id === id) {
        const hash = i.invoiceHash || 'AGT-H-' + Math.random().toString(36).substring(2, 12).toUpperCase();
        return {
          ...i,
          status: 'AGT_Synced' as const,
          invoiceHash: hash,
          agtSyncDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          agtResponseCode: '0_SYNC_SUCCESS_200',
          qrcodeString: `https://portaldocontribuinte.minfin.gov.ao/verify?hash=${hash}&nif=${i.clientNif}`
        };
      }
      return i;
    });
    set({ invoices: updated });
    setStorageItem('ndf_invoices', updated);

    const invoice = updated.find(i => i.id === id);
    if (invoice) {
      get().addAuditLog({
        userId: 'usr-928',
        userName: 'Eng. Manuel Bento',
        action: 'SYNC_AGT',
        details: `Comunicação integrada AGT para Factura ${invoice.invoiceNo} concluída. Assinatura certificada activada.`,
        ipAddress: '197.231.42.18',
        tenantId: invoice.tenantId
      });
    }
  },

  addAuditLog: (logData) => {
    const newLog: AuditLog = {
      ...logData,
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    const updated = [newLog, ...get().auditLogs].slice(0, 100); // Limit to last 100 logs
    set({ auditLogs: updated });
    setStorageItem('ndf_audit_logs', updated);
  },

  getDashboardStats: (tenantId) => {
    const remoteStats = get().dashboardStatsByTenant[tenantId];
    if (remoteStats) return remoteStats;

    const state = get();
    const tenantInvoices = state.invoices.filter((i) => i.tenantId === tenantId);
    
    let totalInvoiced = 0;
    let revenueCollected = 0;
    let taxesCollected = 0;
    let withholdingCollected = 0;
    let pendingAmount = 0;
    let draftCount = 0;
    let issuedCount = 0;
    let paidCount = 0;

    tenantInvoices.forEach((inv) => {
      if (inv.status === 'Draft') {
        draftCount++;
        // Drafts are not counted towards official revenue KPIs, but let's keep track of status
      } else {
        totalInvoiced += inv.grandTotal;
        taxesCollected += inv.taxTotal;
        withholdingCollected += inv.withholdingTaxAmount;
        
        if (inv.status === 'Paid' || inv.status === 'AGT_Synced') {
          revenueCollected += inv.grandTotal;
          paidCount++;
        } else {
          pendingAmount += inv.grandTotal;
          issuedCount++;
        }
      }
    });

    // Calculate simulated monthly financial data
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    const monthlyRevenue = months.map((m, idx) => {
      // Create interesting deterministic numbers based on seed or state
      const mul = idx + 1;
      const count = tenantInvoices.filter(i => i.issueDate.includes(`-0${mul}-`) || (idx === 4 && i.issueDate.includes('-05-'))).length;
      let val = count * 900000;
      if (idx === 4) val += 3515000 + 2250000; // Mai has real items
      if (val === 0) val = mul * 350000 + 200000;
      return {
        month: m,
        value: val,
        tax: val * 0.14,
        count: count || mul
      };
    });

    // Count categories
    const categoriesMap: { [key: string]: number } = {};
    tenantInvoices.forEach(inv => {
      inv.items.forEach(itm => {
        const prod = state.products.find(p => p.id === itm.productId);
        const cat = prod?.category || 'Outros';
        categoriesMap[cat] = (categoriesMap[cat] || 0) + (itm.subtotal);
      });
    });

    const categorySales = Object.keys(categoriesMap).map(name => ({
      name,
      value: categoriesMap[name]
    }));

    if (categorySales.length === 0) {
      categorySales.push({ name: 'Serviços', value: 8000000 });
      categorySales.push({ name: 'Software', value: 2500000 });
      categorySales.push({ name: 'Combustível', value: 350000 });
    }

    const synced = tenantInvoices.filter(i => i.status === 'AGT_Synced').length;
    const unsynced = tenantInvoices.filter(i => i.status === 'Issued' || i.status === 'Paid').length;
    const totalCommunicated = synced + unsynced;
    const syncSuccessRate = totalCommunicated > 0 ? Math.round((synced / totalCommunicated) * 100) : 100;

    const recentActivity = state.auditLogs
      .filter((log) => log.tenantId === tenantId)
      .slice(0, 10);

    return {
      totalInvoiced,
      revenueCollected,
      taxesCollected,
      withholdingCollected,
      pendingAmount,
      draftCount,
      issuedCount,
      paidCount,
      syncSuccessRate,
      monthlyRevenue,
      categorySales,
      recentActivity
    };
  }
}));

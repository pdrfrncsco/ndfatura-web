import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { 
  AuditLog, 
  Client, 
  DashboardStats, 
  Invoice, 
  Product, 
  Receipt, 
  Tenant, 
  User, 
  StockMovement,
  Estabelecimento,
  ExchangeRate
} from '../types/invoice';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ndf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const tenantId = localStorage.getItem('ndf_active_tenant_id');
    if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
    }
  }
  return config;
});

export const hasAccessToken = () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('ndf_token');
};

export const setActiveTenantHeaders = (tenant: Tenant | null) => {
    if (typeof window === 'undefined') return;
    if (tenant) {
        localStorage.setItem('ndf_active_tenant_id', tenant.id);
    } else {
        localStorage.removeItem('ndf_active_tenant_id');
    }
};

export interface ApiEnvelope<T> {
  results?: T;
  data?: T;
  count?: number;
  next?: string | null;
  previous?: string | null;
}

function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.results !== undefined ? response.data.results : (response.data.data !== undefined ? response.data.data : response.data as T);
}

export const EstabelecimentoService = {
  getAll: async (): Promise<Estabelecimento[]> => {
    const response = await apiClient.get<ApiEnvelope<Estabelecimento[]>>('/estabelecimentos/');
    return unwrap(response);
  },
  create: async (data: Omit<Estabelecimento, 'id'>): Promise<Estabelecimento> => {
    const response = await apiClient.post<ApiEnvelope<Estabelecimento>>('/estabelecimentos/', data);
    return unwrap(response);
  },
  update: async (id: string, data: Partial<Estabelecimento>): Promise<Estabelecimento> => {
    const response = await apiClient.patch<ApiEnvelope<Estabelecimento>>(`/estabelecimentos/${id}/`, data);
    return unwrap(response);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/estabelecimentos/${id}/`);
  }
};

export const ExchangeRateService = {
  getAll: async (): Promise<ExchangeRate[]> => {
    const response = await apiClient.get<ApiEnvelope<ExchangeRate[]>>('/taxas-cambio/');
    return unwrap(response);
  },
  create: async (data: Omit<ExchangeRate, 'id'>): Promise<ExchangeRate> => {
    const response = await apiClient.post<ApiEnvelope<ExchangeRate>>('/taxas-cambio/', data);
    return unwrap(response);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/taxas-cambio/${id}/`);
  }
};

export const TenantService = {
  update: async (id: string, data: Partial<Tenant>): Promise<Tenant> => {
    const response = await apiClient.patch<ApiEnvelope<Tenant>>(`/empresas/${id}/`, data);
    return unwrap(response);
  }
};

export const AuthService = {
  login: async (email: string, password: string): Promise<{ user: User; tenants: Tenant[]; token: string }> => {
    const response = await apiClient.post<ApiEnvelope<{ user: User; tenants: Tenant[]; access: string }>>('/auth/login/', { email, password });
    const data = unwrap(response);
    if (typeof window !== 'undefined') {
        localStorage.setItem('ndf_token', data.access);
    }
    return {
        user: data.user,
        tenants: data.tenants,
        token: data.access
    };
  },
  me: async (): Promise<{ user: User; tenants: Tenant[] }> => {
    const response = await apiClient.get<ApiEnvelope<{ user: User; tenants: Tenant[] }>>('/auth/me/');
    return unwrap(response);
  },
  logout: () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('ndf_token');
        localStorage.removeItem('ndf_active_tenant_id');
    }
  }
};

export const ClientService = {
  getAll: async (): Promise<Client[]> => {
    const response = await apiClient.get<ApiEnvelope<Client[]>>('/clientes/');
    return unwrap(response);
  },
  create: async (client: Omit<Client, 'id' | 'tenantId'>): Promise<Client> => {
    const response = await apiClient.post<ApiEnvelope<Client>>('/clientes/', client);
    return unwrap(response);
  },
  update: async (id: string, client: Partial<Client>): Promise<Client> => {
    const response = await apiClient.patch<ApiEnvelope<Client>>(`/clientes/${id}/`, client);
    return unwrap(response);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clientes/${id}/`);
  },
};

export const ProductService = {
  getAll: async (): Promise<Product[]> => {
    const response = await apiClient.get<ApiEnvelope<Product[]>>('/produtos/');
    return unwrap(response);
  },
  create: async (product: Omit<Product, 'id' | 'tenantId'>): Promise<Product> => {
    const response = await apiClient.post<ApiEnvelope<Product>>('/produtos/', product);
    return unwrap(response);
  },
  update: async (id: string, product: Partial<Product>): Promise<Product> => {
    const response = await apiClient.patch<ApiEnvelope<Product>>(`/produtos/${id}/`, product);
    return unwrap(response);
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/produtos/${id}/`);
  },
  adjustStock: async (id: string, quantity: number, type: 'In' | 'Out', reason: string): Promise<StockMovement> => {
    const response = await apiClient.post<ApiEnvelope<StockMovement>>(`/produtos/${id}/adjust-stock/`, {
      quantity,
      type,
      reason
    });
    return unwrap(response);
  },
  getMovements: async (): Promise<StockMovement[]> => {
    const response = await apiClient.get<ApiEnvelope<StockMovement[]>>('/movimentos-stock/');
    return unwrap(response);
  }
};

export const InvoiceService = {
  getAll: async (): Promise<Invoice[]> => {
    const response = await apiClient.get<ApiEnvelope<Invoice[]>>('/facturas/');
    return unwrap(response);
  },
  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<ApiEnvelope<Invoice>>(`/facturas/${id}/`);
    return unwrap(response);
  },
  create: async (invoiceData: any): Promise<Invoice> => {
    const response = await apiClient.post<ApiEnvelope<Invoice>>('/facturas/', invoiceData);
    return unwrap(response);
  },
  issue: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiEnvelope<Invoice>>(`/facturas/${id}/issue/`);
    return unwrap(response);
  },
  cancel: async (id: string, reason: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiEnvelope<Invoice>>(`/facturas/${id}/cancel/`, { reason });
    return unwrap(response);
  },
  syncAGT: async (id: string): Promise<void> => {
    await apiClient.post(`/facturas/${id}/sync-agt/`);
  },
  getPdfInfo: async (id: string): Promise<{ status: string; url?: string }> => {
    const response = await apiClient.get(`/facturas/${id}/pdf/`);
    return response.data;
  }
};

export const ReceiptService = {
  getAll: async (): Promise<Receipt[]> => {
    const response = await apiClient.get<ApiEnvelope<Receipt[]>>('/recibos/');
    return unwrap(response);
  },
  create: async (data: { clientId: string; items: { invoiceId: string; amountPaid: number }[]; paymentMethod: string; issueDate: string; notes?: string }): Promise<Receipt> => {
    const response = await apiClient.post<ApiEnvelope<Receipt>>('/recibos/', data);
    return unwrap(response);
  },
};

export const AuditService = {
  getAll: async (): Promise<AuditLog[]> => {
    const response = await apiClient.get<ApiEnvelope<AuditLog[]>>('/auditoria/');
    return unwrap(response);
  }
};

export const ReportService = {
  getIvaMap: async (year: number, month: number): Promise<any> => {
    const response = await apiClient.get<ApiEnvelope<any>>('/relatorios/iva-map/', {
      params: { year, month }
    });
    return unwrap(response);
  },
  getAccountStatement: async (clientId: string): Promise<any> => {
    const response = await apiClient.get<ApiEnvelope<any>>(`/relatorios/account-statement/${clientId}/`);
    return unwrap(response);
  },
  getAgingReport: async (): Promise<any> => {
    const response = await apiClient.get<ApiEnvelope<any>>('/relatorios/aging-report/');
    return unwrap(response);
  }
};

export const SaftService = {
  exportSaftXml: async (tenantId: string, year: number, month: number): Promise<any> => {
    const response = await apiClient.post<ApiEnvelope<any>>('/saft/export/', { year, month });
    return unwrap(response);
  },
};

export const DashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiEnvelope<DashboardStats>>('/dashboard/stats/');
    return unwrap(response);
  },
};

export function getApiFieldErrors(error: any): Record<string, string> {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    const errors: Record<string, string> = {};
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        errors[key] = data[key][0];
      } else if (typeof data[key] === 'string') {
        errors[key] = data[key];
      }
    });
    return errors;
  }
  return {};
}

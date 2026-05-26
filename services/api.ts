import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuditLog, Client, DashboardStats, Invoice, Product, Tenant, User } from '../types/invoice';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
const ACCESS_TOKEN_KEY = 'ndf_access_token';
const REFRESH_TOKEN_KEY = 'ndf_refresh_token';
const TENANT_ID_KEY = 'ndf_current_tenant_id';
const TENANT_NIF_KEY = 'ndf_current_tenant_nif';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  errors?: unknown;
  meta?: unknown;
};

type Paginated<T> = {
  results: T[];
  meta?: {
    count: number;
    page: number;
    pages: number;
    next: string | null;
    previous: string | null;
  };
};

type LoginResponse = {
  access: string;
  refresh: string;
  user: User;
  tenants: Tenant[];
};

export class ApiError extends Error {
  errors: unknown;
  status?: number;

  constructor(message: string, errors: unknown, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.errors = errors;
    this.status = status;
  }
}

const isBrowser = typeof window !== 'undefined';

const readStorage = (key: string) => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(key);
};

const writeStorage = (key: string, value: string) => {
  if (isBrowser) window.localStorage.setItem(key, value);
};

const removeStorage = (key: string) => {
  if (isBrowser) window.localStorage.removeItem(key);
};

export const setAuthTokens = (access: string, refresh?: string) => {
  writeStorage(ACCESS_TOKEN_KEY, access);
  if (refresh) writeStorage(REFRESH_TOKEN_KEY, refresh);
};

export const clearAuthTokens = () => {
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
  removeStorage(TENANT_ID_KEY);
  removeStorage(TENANT_NIF_KEY);
};

export const setActiveTenantHeaders = (tenant: Tenant | null) => {
  if (!tenant) {
    removeStorage(TENANT_ID_KEY);
    removeStorage(TENANT_NIF_KEY);
    return;
  }
  writeStorage(TENANT_ID_KEY, tenant.id);
  writeStorage(TENANT_NIF_KEY, tenant.nif);
};

export const hasAccessToken = () => Boolean(readStorage(ACCESS_TOKEN_KEY));

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = readStorage(ACCESS_TOKEN_KEY);
  const tenantId = readStorage(TENANT_ID_KEY);
  const tenantNif = readStorage(TENANT_NIF_KEY);

  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (tenantId && config.headers) {
    config.headers['X-Organization-ID'] = tenantId;
  }
  if (tenantNif && config.headers) {
    config.headers['X-Organization-NIF'] = tenantNif;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = readStorage(REFRESH_TOKEN_KEY);

    if (error.response?.status === 401 && refreshToken && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const response = await axios.post<ApiEnvelope<{ access: string }>>(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken
        });
        const access = unwrap(response).access;
        setAuthTokens(access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearAuthTokens();
        return Promise.reject(normalizeApiError(refreshError));
      }
    }

    return Promise.reject(normalizeApiError(error));
  }
);

function firstMessage(value: unknown): string {
  if (Array.isArray(value)) return firstMessage(value[0]);
  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const firstKey = Object.keys(objectValue)[0];
    return firstKey ? firstMessage(objectValue[firstKey]) : 'Erro de validação.';
  }
  if (typeof value === 'string') return value;
  return 'Erro de validação.';
}

function normalizeApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown> | unknown>;
    const payload = axiosError.response?.data;
    if (payload && typeof payload === 'object' && 'success' in payload && 'errors' in payload) {
      const envelope = payload as ApiEnvelope<unknown>;
      return new ApiError(firstMessage(envelope.errors), envelope.errors, axiosError.response?.status);
    }
    return new ApiError(axiosError.message, payload, axiosError.response?.status);
  }
  return error instanceof Error ? error : new Error('Falha inesperada na API.');
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.errors || typeof error.errors !== 'object') {
    return {};
  }

  const payload = error.errors as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};
  Object.entries(payload).forEach(([field, value]) => {
    fieldErrors[field] = firstMessage(value);
  });
  return fieldErrors;
}

function unwrap<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (!envelope.success) {
      throw new ApiError(firstMessage(envelope.errors), envelope.errors);
    }
    return envelope.data;
  }
  return payload as T;
}

function listFromResponse<T>(response: AxiosResponse<ApiEnvelope<Paginated<T>> | Paginated<T> | T[]>): T[] {
  const data = unwrap<Paginated<T> | T[]>(response);
  return Array.isArray(data) ? data : data.results;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
};

const normalizeProduct = (product: Product): Product => ({
  ...product,
  price: toNumber(product.price),
  stock: toNumber(product.stock),
  taxRate: toNumber(product.taxRate)
});

const normalizeInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  subtotal: toNumber(invoice.subtotal),
  discountTotal: toNumber(invoice.discountTotal),
  taxTotal: toNumber(invoice.taxTotal),
  withholdingTaxRate: toNumber(invoice.withholdingTaxRate),
  withholdingTaxAmount: toNumber(invoice.withholdingTaxAmount),
  grandTotal: toNumber(invoice.grandTotal),
  items: invoice.items.map((item) => ({
    ...item,
    quantity: toNumber(item.quantity),
    price: toNumber(item.price),
    taxRate: toNumber(item.taxRate),
    discount: toNumber(item.discount),
    totalTax: toNumber(item.totalTax),
    subtotal: toNumber(item.subtotal),
    total: toNumber(item.total)
  }))
});

const normalizeDashboardStats = (stats: DashboardStats): DashboardStats => ({
  ...stats,
  totalInvoiced: toNumber(stats.totalInvoiced),
  revenueCollected: toNumber(stats.revenueCollected),
  taxesCollected: toNumber(stats.taxesCollected),
  withholdingCollected: toNumber(stats.withholdingCollected),
  pendingAmount: toNumber(stats.pendingAmount)
});

export const AuthService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiEnvelope<LoginResponse>>('/auth/login/', { email, password });
    const data = unwrap(response);
    setAuthTokens(data.access, data.refresh);
    setActiveTenantHeaders(data.tenants[0] || null);
    return data;
  },

  me: async (): Promise<{ user: User; tenants: Tenant[] }> => {
    const response = await apiClient.get<ApiEnvelope<{ user: User; tenants: Tenant[] }>>('/auth/me/');
    return unwrap(response);
  },

  logout: () => clearAuthTokens()
};

export const EmpresaService = {
  getAll: async (): Promise<Tenant[]> => {
    const response = await apiClient.get<ApiEnvelope<Paginated<Tenant>>>('/empresas/');
    return listFromResponse(response);
  }
};

export const ClientService = {
  getAll: async (): Promise<Client[]> => {
    const response = await apiClient.get<ApiEnvelope<Paginated<Client>>>('/clientes/');
    return listFromResponse(response);
  },

  create: async (clientData: Omit<Client, 'id'>): Promise<Client> => {
    const { tenantId: _tenantId, ...payload } = clientData;
    const response = await apiClient.post<ApiEnvelope<Client>>('/clientes/', payload);
    return unwrap(response);
  },

  update: async (id: string, clientData: Partial<Client>): Promise<Client> => {
    const { tenantId: _tenantId, ...payload } = clientData;
    const response = await apiClient.patch<ApiEnvelope<Client>>(`/clientes/${id}/`, payload);
    return unwrap(response);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clientes/${id}/`);
  }
};

export const ProductService = {
  getAll: async (): Promise<Product[]> => {
    const response = await apiClient.get<ApiEnvelope<Paginated<Product>>>('/produtos/');
    return listFromResponse(response).map(normalizeProduct);
  },

  create: async (productData: Omit<Product, 'id'>): Promise<Product> => {
    const { tenantId: _tenantId, ...payload } = productData;
    const response = await apiClient.post<ApiEnvelope<Product>>('/produtos/', payload);
    return normalizeProduct(unwrap(response));
  },

  update: async (id: string, productData: Partial<Product>): Promise<Product> => {
    const { tenantId: _tenantId, ...payload } = productData;
    const response = await apiClient.patch<ApiEnvelope<Product>>(`/produtos/${id}/`, payload);
    return normalizeProduct(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/produtos/${id}/`);
  }
};

export const InvoiceService = {
  getAll: async (): Promise<Invoice[]> => {
    const response = await apiClient.get<ApiEnvelope<Paginated<Invoice>>>('/facturas/');
    return listFromResponse(response).map(normalizeInvoice);
  },

  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<ApiEnvelope<Invoice>>(`/facturas/${id}/`);
    return normalizeInvoice(unwrap(response));
  },

  create: async (invoiceData: Omit<Invoice, 'id' | 'invoiceNo' | 'invoiceHash' | 'qrcodeString'>): Promise<Invoice> => {
    const response = await apiClient.post<ApiEnvelope<Invoice>>('/facturas/', {
      type: invoiceData.type,
      clientId: invoiceData.clientId,
      dueDate: invoiceData.dueDate,
      withholdingTaxRate: invoiceData.withholdingTaxRate,
      notes: invoiceData.notes || '',
      items: invoiceData.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount
      }))
    });
    return normalizeInvoice(unwrap(response));
  },

  update: async (id: string, invoiceData: Omit<Invoice, 'id' | 'invoiceNo' | 'invoiceHash' | 'qrcodeString'>): Promise<Invoice> => {
    const response = await apiClient.put<ApiEnvelope<Invoice>>(`/facturas/${id}/`, {
      type: invoiceData.type,
      clientId: invoiceData.clientId,
      dueDate: invoiceData.dueDate,
      withholdingTaxRate: invoiceData.withholdingTaxRate,
      notes: invoiceData.notes || '',
      items: invoiceData.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount
      }))
    });
    return normalizeInvoice(unwrap(response));
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/facturas/${id}/`);
  },

  issue: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<ApiEnvelope<Invoice>>(`/facturas/${id}/emitir/`);
    return normalizeInvoice(unwrap(response));
  },

  updateStatus: async (): Promise<never> => {
    throw new Error('A alteração de estado fiscal será activada no milestone fiscal.');
  },

  syncAGT: async (id: string) => {
    const response = await apiClient.post<ApiEnvelope<{ detail: string }>>(`/facturas/${id}/sync-agt/`);
    return unwrap(response);
  }
};

export const AuditService = {
  getAll: async (): Promise<AuditLog[]> => {
    const response = await apiClient.get<ApiEnvelope<Paginated<AuditLog>>>('/auditoria/');
    return listFromResponse(response);
  }
};

export const DashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiEnvelope<DashboardStats>>('/dashboard/stats/');
    return normalizeDashboardStats(unwrap(response));
  }
};

export const SaftService = {
  exportSaftXml: async (_tenantId: string, year: number, month: number) => {
    const response = await apiClient.post<ApiEnvelope<{ filename: string; status: string }>>('/saft/export/', {
      year,
      month
    });
    const data = unwrap(response);
    return {
      success: true,
      filename: data.filename,
      xml: '',
      status: data.status
    };
  }
};

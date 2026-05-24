import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useDataStore } from '../stores/dataStore';

// In a real environment, this comes from an env variable like NEXT_PUBLIC_API_URL
const API_BASE_URL = 'https://api.ndfatura.co.ao/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Simulated Auth Secrets
let mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItOTI4IiwibmFtZSI6Ik1hbnVlbCBCZW50byIsImVtYWlsIjoibmRlYXNkaWdpdGFsQGdtYWlsLmNvbSIsImlhdCI6MTcxNjU1MjExM30.signature';
let mockRefreshToken = 'ndf_refresh_token_xyz987abc123';

// 1. Request Interceptor: Attach authentication tokens and standard multi-tenant headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inject Simulated JWT Token
    if (mockAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${mockAccessToken}`;
    }
    
    // Inject Selected Multi-Tenant Organization NIF/ID
    const tenant = useAuthStore.getState().currentTenant;
    if (tenant && config.headers) {
      config.headers['X-Organization-ID'] = tenant.id;
      config.headers['X-Organization-NIF'] = tenant.nif;
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} -> ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Manage JWT validation errors and Token Refresh Loops
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Simulate 401 Unauthorized - Run Token Refresh Loop
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn('[API Auth] Access Token expired. Initiating JWT Refresh Token Loop...');
      
      try {
        // Mock Refresh API request
        const refreshedTokens = await simulateTokenRefresh();
        mockAccessToken = refreshedTokens.accessToken;
        
        // Retry initial request with new token
        originalRequest.headers.Authorization = `Bearer ${mockAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[API Auth] Refresh token expired or invalid. Redirecting to login.');
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Simulated token refresh service
function simulateTokenRefresh(): Promise<{ accessToken: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        accessToken: `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3ItOTI4IiwicmVmcmVzaGVkIjp0cnVlfQ.${Math.random().toString(36).substring(7)}`
      });
    }, 400);
  });
}

// -------------------------------------------------------------
// CORE INTERCEPTED SERVICE SERVICES (Simulated REST Endpoints with Local Storage backup)
// -------------------------------------------------------------
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const InvoiceService = {
  getAll: async (tenantId: string) => {
    await delay(500);
    const invoices = useDataStore.getState().invoices;
    return invoices.filter(i => i.tenantId === tenantId);
  },
  
  getById: async (id: string) => {
    await delay(250);
    const invoice = useDataStore.getState().invoices.find(i => i.id === id);
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  },
  
  create: async (invoiceData: any) => {
    await delay(600);
    return useDataStore.getState().addInvoice(invoiceData);
  },
  
  updateStatus: async (id: string, status: any) => {
    await delay(300);
    useDataStore.getState().updateInvoiceStatus(id, status);
    return { success: true };
  },
  
  syncAGT: async (id: string) => {
    await delay(800);
    useDataStore.getState().syncInvoiceWithAGT(id);
    return { success: true };
  }
};

export const ClientService = {
  getAll: async (tenantId: string) => {
    await delay(400);
    const clients = useDataStore.getState().clients;
    return clients.filter(c => c.tenantId === tenantId);
  },
  
  create: async (clientData: any) => {
    await delay(400);
    return useDataStore.getState().addClient(clientData);
  },
  
  update: async (id: string, clientData: any) => {
    await delay(300);
    useDataStore.getState().updateClient(id, clientData);
    return { success: true };
  },
  
  delete: async (id: string) => {
    await delay(300);
    useDataStore.getState().deleteClient(id);
    return { success: true };
  }
};

export const ProductService = {
  getAll: async (tenantId: string) => {
    await delay(350);
    const products = useDataStore.getState().products;
    return products.filter(p => p.tenantId === tenantId);
  },
  
  create: async (productData: any) => {
    await delay(400);
    return useDataStore.getState().addProduct(productData);
  },
  
  update: async (id: string, productData: any) => {
    await delay(300);
    useDataStore.getState().updateProduct(id, productData);
    return { success: true };
  },
  
  delete: async (id: string) => {
    await delay(300);
    useDataStore.getState().deleteProduct(id);
    return { success: true };
  }
};

export const SaftService = {
  exportSaftXml: async (tenantId: string, year: number, month: number) => {
    await delay(1200);
    
    // Register audit log for fiscal action
    useDataStore.getState().addAuditLog({
      userId: 'usr-928',
      userName: 'Eng. Manuel Bento',
      action: 'EXPORT_SAFT',
      details: `Ficheiro fiscal XML SAF-T (AO) exportado com sucesso para o período ${year}-${String(month).padStart(2, '0')}.`,
      ipAddress: '197.231.42.18',
      tenantId
    });

    const tenant = useAuthStore.getState().currentTenant;
    const xmlHeading = `<?xml version="1.0" encoding="Windows-1252"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO_1.01_01" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <AuditFileSchemaVersion>1.01_01</AuditFileSchemaVersion>
    <CompanyID>${tenant?.nif}</CompanyID>
    <TaxRegistrationNumber>${tenant?.nif}</TaxRegistrationNumber>
    <CompanyName>${tenant?.name}</CompanyName>
    <BusinessName>NDFATURA SaaS Platform</BusinessName>
    <SoftwareCertificateNumber>${tenant?.agtCertificateNo || '241/AGT/2026'}</SoftwareCertificateNumber>
    <TaxPeriod>${month}</TaxPeriod>
    <Year>${year}</Year>
  </Header>
  <!-- Simulating full SAFT contents -->
</AuditFile>`;

    return {
      success: true,
      filename: `SAFT_AO_${tenant?.nif || '540'}_${year}_${String(month).padStart(2, '0')}.xml`,
      xml: xmlHeading
    };
  }
};

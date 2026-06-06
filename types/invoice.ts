export type UserRole = 'Admin' | 'Financial_Director' | 'Billing_Clerk' | 'Auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Tenant {
  id: string;
  name: string;
  nif: string;
  address: string;
  city: string;
  country: string;
  fiscalRegime: string;
  logoUrl?: string;
  agtCertificateNo?: string;
}

export interface Estabelecimento {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface ExchangeRate {
  id: string;
  currencyCode: string;
  rate: number;
  date: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  type: 'P' | 'S';
  price: number;
  costPrice?: number;
  stock: number;
  minStock?: number;
  taxRate: number; // e.g., 14, 7, 5, 0 (IVA)
  exemptionCode?: string; // required if taxRate === 0 (e.g. M10 - Isento Artigo 9º, etc.)
  tenantId: string;
  unit: string; // e.g., 'UN', 'KG', 'L', 'SERV'
  isActive: boolean;
}

export interface StockMovement {
  id: string;
  product: string;
  productName: string;
  productCode: string;
  type: 'In' | 'Out';
  quantity: number;
  reason: string;
  operator: string;
  operatorName: string;
  timestamp: string;
}

export interface Client {
  id: string;
  name: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tenantId: string;
}

export type InvoiceType = 'FT' | 'FR' | 'NC' | 'VD';
export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Partial' | 'Cancelled' | 'AGT_Synced' | 'AGT_Error';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  taxRate: number;
  discount: number;
  totalTax: number;
  subtotal: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  estabelecimentoId?: string;
  estabelecimentoCode?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  exchangeRate: number;
  issueDate: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  withholdingTaxRate: number;
  withholdingTaxAmount: number;
  grandTotal: number;
  invoiceHash: string;
  previousHash: string;
  agtSyncDate?: string;
  agtResponseCode?: string;
  qrcodeString: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  notes: string;
  originDocumentId?: string;
  rectificationReason?: string;
  tenantId: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userName: string;
  action: string;
  details: string;
  entityType: string;
  entityId: string;
}

export interface DashboardStats {
  totalRevenue: number;
  ivaCollected: number;
  withholdingCollected: number;
  pendingAmount: number;
  draftCount: number;
  issuedCount: number;
  paidCount: number;
  syncSuccessRate: number;
  monthlyRevenue: Array<{ month: string, amount: number, tax: number }>;
  categorySales: Array<{ category: string, value: number }>;
  recentActivity: AuditLog[];
}

export type PaymentMethod = 'NU' | 'TB' | 'CC' | 'OU';
export type ReceiptStatus = 'Draft' | 'Issued' | 'Cancelled';

export interface ReceiptItem {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  amountPaid: number;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  clientId: string;
  clientName: string;
  clientNif: string;
  issueDate: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: ReceiptStatus;
  receiptHash: string;
  qrcodeString: string;
  notes: string;
  items: ReceiptItem[];
  createdAt: string;
  updatedAt: string;
}

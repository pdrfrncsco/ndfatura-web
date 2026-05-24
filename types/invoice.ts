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
  fiscalRegime: string; // e.g., 'Regime Geral', 'Regime Simplificado', 'Regime de Exclusão'
  logoUrl?: string;
  agtCertificateNo?: string; // Standard AGT software certification e.g. "250/AGT/2026"
}

export interface Client {
  id: string;
  name: string;
  nif: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  country: string;
  tenantId: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  taxRate: number; // e.g., 14, 7, 5, 0 (IVA)
  exemptionCode?: string; // required if taxRate === 0 (e.g. M10 - Isento Artigo 9º, etc.)
  tenantId: string;
  unit: string; // e.g., 'UN', 'KG', 'L', 'SERV'
}

export type InvoiceType = 'FT' | 'FR' | 'VD' | 'NC'; // FT (Fatura), FR (Fatura-Recibo), VD (Venda a Dinheiro), NC (Nota de Crédito)
export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Cancelled' | 'AGT_Synced' | 'AGT_Error';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  taxRate: number;
  discount: number; // percentage e.g., 5 for 5%
  totalTax: number;
  subtotal: number; // net of discount and tax
  total: number; // gross with tax
}

export interface Invoice {
  id: string;
  invoiceNo: string; // FT 2026/001
  type: InvoiceType;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number; // Before taxes and discount
  discountTotal: number;
  taxTotal: number;
  withholdingTaxRate: number; // e.g., 6.5% standard for services
  withholdingTaxAmount: number;
  grandTotal: number; // Subtotal + Tax - Withholding
  invoiceHash: string; // AGT validation signature hash e.g. "Z6yH-..."
  agtSyncDate?: string;
  agtResponseCode?: string;
  qrcodeString: string; // AGT validation QR Code string
  notes?: string;
  tenantId: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string; // e.g. "CREATE_INVOICE", "VOID_INVOICE", "EXPORT_SAFT"
  details: string;
  ipAddress: string;
  tenantId: string;
}

export interface DashboardStats {
  totalInvoiced: number;
  revenueCollected: number;
  taxesCollected: number;
  withholdingCollected: number;
  pendingAmount: number;
  draftCount: number;
  issuedCount: number;
  paidCount: number;
  syncSuccessRate: number;
  monthlyRevenue: { month: string; value: number; tax: number; count: number }[];
  categorySales: { name: string; value: number }[];
  recentActivity: AuditLog[];
}

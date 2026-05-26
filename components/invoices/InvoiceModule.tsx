'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { getApiFieldErrors } from '../../services/api';
import { Client, Product, Invoice, InvoiceItem, InvoiceType, InvoiceStatus } from '../../types/invoice';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Trash2, 
  ChevronRight, 
  Printer, 
  CheckCircle, 
  Clock, 
  FileCheck, 
  AlertTriangle, 
  X, 
  ArrowLeft,
  Settings,
  QrCode,
  Download,
  AlertCircle
} from 'lucide-react';

// Define helper outside component to satisfy strict reactivity lint rules
function generateFaturaDates(invoiceType: string) {
  const current = new Date();
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, '0');
  const day = String(current.getDate()).padStart(2, '0');
  
  const todayStr = `${year}-${month}-${day}`;
  
  // Due date (+30 days)
  const due = new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dueYear = due.getFullYear();
  const dueMonth = String(due.getMonth() + 1).padStart(2, '0');
  const dueDay = String(due.getDate()).padStart(2, '0');
  const dueStr = `${dueYear}-${dueMonth}-${dueDay}`;
  
  return {
    todayStr,
    dueDateStr: invoiceType === 'FR' || invoiceType === 'VD' ? todayStr : dueStr
  };
}

export default function InvoiceModule() {
  const { currentTenant, theme, user, addNotification } = useAuthStore();
  const { clients, products, invoices, addInvoice, issueInvoice } = useDataStore();

  const [viewState, setViewState] = React.useState<'list' | 'create' | 'view'>('list');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);

  // List States
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'date' | 'total'>('date');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 6;

  // Invoice Create States
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [invoiceType, setInvoiceType] = React.useState<InvoiceType>('FT');
  const [invoiceStatus, setInvoiceStatus] = React.useState<'Draft' | 'Issued' | 'AGT_Synced'>('Draft');
  const [withholdingEnabled, setWithholdingEnabled] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isIssuing, setIsIssuing] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [invoiceItems, setInvoiceItems] = React.useState<Array<{
    productId: string;
    quantity: number;
    discountPercent: number;
    price: number;
  }>>([{ productId: '', quantity: 1, discountPercent: 0, price: 0 }]);

  // Reset states
  const resetForm = () => {
    setSelectedClientId('');
    setInvoiceType('FT');
    setInvoiceStatus('Draft');
    setWithholdingEnabled(false);
    setNotes('');
    setInvoiceItems([{ productId: '', quantity: 1, discountPercent: 0, price: 0 }]);
  };

  if (!currentTenant) return null;

  // ---------------------------------------------------------------------------
  // 1. DATA COMPUTATION FOR INVOICE FORM
  // ---------------------------------------------------------------------------
  const tenantClients = clients.filter(c => c.tenantId === currentTenant.id);
  const tenantProducts = products.filter(p => p.tenantId === currentTenant.id);
  const tenantInvoices = invoices.filter(i => i.tenantId === currentTenant.id);

  // Filter & sort invoices
  const filteredInvoices = tenantInvoices.filter(inv => {
    const matchesSearch = inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.clientNif.includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || inv.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
    } else {
      return b.grandTotal - a.grandTotal;
    }
  });

  // Paginated invoices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  // Calculate live creation numbers
  const calculatedItems: InvoiceItem[] = invoiceItems.map((itm, index) => {
    const prod = tenantProducts.find(p => p.id === itm.productId);
    const price = itm.price || prod?.price || 0;
    const qty = itm.quantity || 1;
    const disc = itm.discountPercent || 0;
    const taxRate = prod?.taxRate || 0;

    const baseAmount = price * qty;
    const discAmount = baseAmount * (disc / 100);
    const netAmount = baseAmount - discAmount;
    const taxAmount = netAmount * (taxRate / 100);
    const grossTotal = netAmount + taxAmount;

    return {
      id: `itm-new-${index}`,
      productId: itm.productId,
      productName: prod?.name || 'Seleccione Produto...',
      quantity: qty,
      price: price,
      taxRate: taxRate,
      discount: disc,
      totalTax: taxAmount,
      subtotal: netAmount,
      total: grossTotal
    };
  });

  const liveSubtotal = calculatedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const liveDiscountTotal = calculatedItems.reduce((acc, i) => acc + (i.price * i.quantity * (i.discount / 100)), 0);
  const netBeforeTax = liveSubtotal - liveDiscountTotal;
  const liveTaxTotal = calculatedItems.reduce((acc, i) => acc + i.totalTax, 0);
  const liveWithholding = withholdingEnabled ? netBeforeTax * 0.065 : 0;
  const liveGrandTotal = netBeforeTax + liveTaxTotal - liveWithholding;

  // ---------------------------------------------------------------------------
  // 2. FORM ACTIONS & MUTATIONS
  // ---------------------------------------------------------------------------
  const handleAddLineItem = () => {
    setInvoiceItems([...invoiceItems, { productId: '', quantity: 1, discountPercent: 0, price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, idx) => idx !== index));
  };

  const handleLineItemChange = (index: number, key: 'productId' | 'quantity' | 'discountPercent' | 'price', value: any) => {
    const updated = [...invoiceItems];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    
    // Auto-populate price if base product changes
    if (key === 'productId') {
      const prod = tenantProducts.find(p => p.id === value);
      if (prod) {
        updated[index].price = prod.price;
      }
    }
    setInvoiceItems(updated);
  };

  const handeSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!selectedClientId) {
       setFormErrors({ clientId: 'Seleccione um cliente para facturar.' });
       return;
    }
    const client = tenantClients.find(c => c.id === selectedClientId);
    if (!client) return;

    // Validate lines
    const validLines = calculatedItems.filter(item => item.productId !== '');
    if (validLines.length === 0) {
      setFormErrors({ items: 'Adicione pelo menos um produto com codigo valido.' });
      return;
    }

    const { todayStr, dueDateStr } = generateFaturaDates(invoiceType);

    setIsSavingDraft(true);
    try {
      const result = await addInvoice({
        type: invoiceType,
        status: 'Draft',
        issueDate: todayStr,
        dueDate: dueDateStr,
        clientId: client.id,
        clientName: client.name,
        clientNif: client.nif,
        clientAddress: `${client.address}, ${client.city}`,
        items: validLines,
        subtotal: liveSubtotal,
        discountTotal: liveDiscountTotal,
        taxTotal: liveTaxTotal,
        withholdingTaxRate: withholdingEnabled ? 6.5 : 0,
        withholdingTaxAmount: liveWithholding,
        grandTotal: liveGrandTotal,
        notes: notes || (withholdingEnabled ? 'Documento sujeito a Retenção na Fonte de 6.5% de IRT.' : undefined),
        tenantId: currentTenant.id,
        createdBy: user?.name || 'Equipa NDFATURA'
      });

      addNotification({
        title: 'Rascunho de factura criado',
        desc: 'O rascunho foi calculado e registado pela API.',
        type: 'info'
      });

      resetForm();
      setSelectedInvoice(result);
      setViewState('view');
    } catch (error) {
      const apiErrors = getApiFieldErrors(error);
      if (Object.keys(apiErrors).length > 0) {
        const firstError = Object.values(apiErrors)[0];
        setFormErrors({ ...apiErrors, global: firstError });
      } else {
        setFormErrors({ global: error instanceof Error ? error.message : 'Falha ao criar rascunho.' });
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Status badges mapping
  const renderStatusBadge = (status: InvoiceStatus) => {
    const configs = {
      Draft: { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: 'Rascunho' },
      Issued: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Emitido' },
      Paid: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Liquidado' },
      Cancelled: { bg: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Anulado' },
      AGT_Synced: { bg: 'bg-indigo-500/10 text-blue-400 border-indigo-500/20', label: 'Certificado AGT' },
      AGT_Error: { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Erro Sinc' },
    };
    const c = configs[status] || configs.Draft;
    return (
      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${c.bg}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SEED LIST VIEW MODE */}
      {viewState === 'list' && (
        <div className="space-y-5">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-500" />
                Facturação Emitida
              </h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                Gestão, consulta e transmissão em tempo real para o portal fiscal da AGT Angola.
              </p>
            </div>
            
            <button
              id="btn-new-invoice-wizard"
              onClick={() => {
                resetForm();
                setViewState('create');
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Processar Factura</span>
            </button>
          </div>

          {/* Quick Stats Summary panels for invoices specifically */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/35 border-slate-900' : 'bg-slate-50 border-slate-200'} flex items-center gap-3`}>
              <div className="h-9 w-9 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">TOTAL DOCUMENTOS</span>
                <span className="text-sm font-bold font-mono">{tenantInvoices.length} Registados</span>
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/35 border-slate-900' : 'bg-slate-50 border-slate-200'} flex items-center gap-3`}>
              <div className="h-9 w-9 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">SINCRONIZADO AGT</span>
                <span className="text-sm font-bold font-mono text-blue-400">{tenantInvoices.filter(i => i.status === 'AGT_Synced').length} Assinados</span>
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900/35 border-slate-900' : 'bg-slate-50 border-slate-200'} flex items-center gap-3`}>
              <div className="h-9 w-9 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">RESCUNHOS PENDENTES</span>
                <span className="text-sm font-bold font-mono text-slate-400">{tenantInvoices.filter(i => i.status === 'Draft').length} Rascunhos</span>
              </div>
            </div>
          </div>

          {/* Filters and Searching bar */}
          <div className={`p-4 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          } flex flex-col md:flex-row gap-3 items-center justify-between`}>
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="search-invoices-input"
                type="text"
                placeholder="Pesquisar por N.º, Cliente ou NIF..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-600'
                } focus:outline-none transition-colors`}
              />
            </div>

            {/* Selector group */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Tipo:</span>
                <select
                  id="filter-type-select"
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className={`text-[11px] font-semibold border rounded-lg p-1.5 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">Todos</option>
                  <option value="FT">Fatura (FT)</option>
                  <option value="FR">Fatura-Recibo (FR)</option>
                  <option value="VD">Venda a Dinheiro (VD)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Estado:</span>
                <select
                  id="filter-status-select"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className={`text-[11px] font-semibold border rounded-lg p-1.5 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="ALL">Todos os estados</option>
                  <option value="Draft">Rascunhos</option>
                  <option value="Issued">Não Sincronizados</option>
                  <option value="Paid">Liquidados</option>
                  <option value="AGT_Synced">Simulado Sinc. AGT</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  id="sort-invoices-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`text-[11px] font-semibold border rounded-lg p-1.5 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="date">Ordenar por Data</option>
                  <option value="total">Ordenar por Valor</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table list grid */}
          <div className={`border rounded-xl spill-table overflow-hidden ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-400">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-slate-900 bg-slate-900/30 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'} font-semibold`}>
                    <th className="p-3.5">Número de Factura</th>
                    <th className="p-3.5">Data de Emissão</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">NIF Adquirente</th>
                    <th className="p-3.5 text-right">Valor Total (Kwanza)</th>
                    <th className="p-3.5 text-center">Estado Fiscal</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <FileText className="h-10 w-10 mb-2.5 opacity-40 text-blue-500" />
                          <p className="font-semibold text-sm">Nenhum documento encontrado</p>
                          <p className="text-[11px] mt-0.5 max-w-xs px-4">Tente atenuar ou retirar os filtros de pesquisa para visualizar facturas.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentInvoices.map((inv) => (
                      <tr 
                        key={inv.id} 
                        className={`border-b ${theme === 'dark' ? 'border-slate-900' : 'border-slate-100'} hover:bg-slate-500/5 last:border-0`}
                      >
                        <td className="p-3.5 font-bold font-mono text-slate-800 dark:text-slate-100">{inv.invoiceNo}</td>
                        <td className="p-3.5 text-slate-500">{inv.issueDate}</td>
                        <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300 truncate max-w-xxs">{inv.clientName}</td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-500">{inv.clientNif}</td>
                        <td className="p-3.5 text-right font-bold text-slate-800 dark:text-slate-100 font-mono">
                          {inv.grandTotal.toLocaleString('pt-PT')} AOA
                        </td>
                        <td className="p-3.5 text-center">{renderStatusBadge(inv.status)}</td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              id={`btn-view-invoice-${inv.id}`}
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setViewState('view');
                              }}
                              className={`p-1 px-2.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                                theme === 'dark' 
                                  ? 'bg-slate-900 hover:bg-slate-800 text-blue-400' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-blue-700'
                              }`}
                            >
                              <span>Visualizar</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'} flex items-center justify-between`}>
                <span className="text-[11px] text-slate-500">
                  A mostrar página <strong className="font-bold">{currentPage}</strong> de {totalPages} ({filteredInvoices.length} facturas)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-invoice-page-prev"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-1 px-2 text-[10px] font-bold tracking-tight rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    id="btn-invoice-page-next"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1 px-2 text-[10px] font-bold tracking-tight rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INVOICE CREATION FLOW */}
      {viewState === 'create' && (
        <form onSubmit={handeSubmitInvoice} className="space-y-6">
          {/* Header Action layout */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-900/10 dark:border-slate-800/40">
            <div className="flex items-center gap-3">
              <button
                id="btn-cancel-create-invoice"
                type="button"
                onClick={() => setViewState('list')}
                className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-lg font-bold">Criar Rascunho de Factura</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">O backend calcula totais, impostos e valida cliente/produtos antes da emissão fiscal.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-save-invoice-draft"
                type="submit"
                disabled={isSavingDraft}
                className={`px-4 py-2 border rounded-lg text-xs font-semibold ${
                  theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200' : 'bg-slate-100 hover:bg-slate-205 border-slate-200 text-slate-700'
                }`}
              >
                {isSavingDraft ? 'A gravar...' : 'Gravar Rascunho'}
              </button>
              <button
                id="btn-issue-sync-invoice"
                type="button"
                disabled
                className="px-4 py-2 bg-slate-500/40 text-white/70 text-xs font-semibold rounded-lg shadow-sm cursor-not-allowed"
                title="A emissão fiscal será implementada depois do fluxo de rascunho."
              >
                Emitir e Sincronizar AGT
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form core columns */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Client & type selectors */}
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} space-y-4`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Documento e Adquirente</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Client */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">Cliente (Adquirente do Serviço) *</label>
                    <select
                      id="select-invoice-client"
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className={`w-full text-xs border rounded-lg p-2 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="">-- Seleccione Cliente --</option>
                      {tenantClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (NIF: {c.nif})</option>
                      ))}
                    </select>
                    {formErrors.clientId && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.clientId}</p>}
                  </div>

                  {/* Document Type */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 block">Tipo de Documento Fiscal *</label>
                    <select
                      id="select-invoice-type"
                      value={invoiceType}
                      onChange={(e) => setInvoiceType(e.target.value as any)}
                      className={`w-full text-xs border rounded-lg p-2 ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="FT">Fatura (FT - Pagamento Diferido)</option>
                      <option value="FR">Fatura-Recibo (FR - Pronto Pagamento)</option>
                      <option value="VD">Venda a Dinheiro (VD - Dinheiro Caixa)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Line Items builder */}
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} space-y-4`}>
                <div className="flex justify-between items-center border-b border-slate-900/10 dark:border-slate-800/40 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Linhas de Bens ou Serviços</h3>
                  <button
                    id="btn-invoice-add-item-row"
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Adicionar Linha</span>
                  </button>
                </div>

                <div className="space-y-3.5">
                  {invoiceItems.map((itm, idx) => {
                    const selectedProdObj = tenantProducts.find(p => p.id === itm.productId);
                    return (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 items-end border-b border-slate-900/5 dark:border-slate-900/40 pb-3 last:border-0 last:pb-0">
                        {/* Selected Product */}
                        <div className="flex-1 space-y-1 w-full">
                          <label className="text-[10px] text-slate-500 font-medium">Produto / Serviço</label>
                          <select
                            id={`line-product-${idx}`}
                            value={itm.productId}
                            required
                            onChange={(e) => handleLineItemChange(idx, 'productId', e.target.value)}
                            className={`w-full text-xs border rounded-lg p-2 ${
                              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <option value="">-- Seleccione Artigo --</option>
                            {tenantProducts.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                            ))}
                          </select>
                        </div>

                        {/* Custom Price */}
                        <div className="w-full md:w-32 space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium">Preço (AOA)</label>
                          <input
                            id={`line-price-${idx}`}
                            type="number"
                            min="0"
                            placeholder="Preço"
                            value={itm.price || ''}
                            onChange={(e) => handleLineItemChange(idx, 'price', Number(e.target.value))}
                            className={`w-full text-xs border rounded-lg p-2 font-mono ${
                              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        {/* Custom Qty */}
                        <div className="w-full md:w-20 space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium font-sans">Quant.</label>
                          <input
                            id={`line-qty-${idx}`}
                            type="number"
                            min="1"
                            value={itm.quantity}
                            onChange={(e) => handleLineItemChange(idx, 'quantity', Number(e.target.value))}
                            className={`w-full text-xs border rounded-lg p-2 font-mono ${
                              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        {/* Discount */}
                        <div className="w-full md:w-20 space-y-1">
                          <label className="text-[10px] text-slate-500 font-medium">Desc (%)</label>
                          <input
                            id={`line-disc-${idx}`}
                            type="number"
                            min="0"
                            max="100"
                            value={itm.discountPercent}
                            onChange={(e) => handleLineItemChange(idx, 'discountPercent', Number(e.target.value))}
                            className={`w-full text-xs border rounded-lg p-2 font-mono ${
                              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          />
                        </div>

                        {/* IVA / Tax Indicator */}
                        {selectedProdObj && (
                          <div className="w-full md:w-24 text-center mt-1 text-[11px] md:mb-2 text-slate-400">
                            <span className="font-mono bg-blue-500/10 px-2 py-1.5 text-blue-500 rounded font-bold block scale-90">
                              IVA: {selectedProdObj.taxRate}% 
                            </span>
                            {selectedProdObj.taxRate === 0 && (
                              <span className="text-[8px] font-mono text-amber-500 block mt-0.5">Exempt. {selectedProdObj.exemptionCode}</span>
                            )}
                          </div>
                        )}

                        {/* Delete trigger */}
                        {invoiceItems.length > 1 && (
                          <button
                            id={`btn-remove-line-${idx}`}
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-2 mb-0.5 rounded-lg text-red-500 hover:bg-red-500/15"
                            title="Remover Linha"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {formErrors.items && <p className="text-[10px] text-red-500 font-mono mt-0.5">{formErrors.items}</p>}
              </div>

              {/* Notes block */}
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} space-y-3`}>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Observações do Documento</label>
                <textarea
                  id="invoice-notes-textarea"
                  rows={2}
                  placeholder="Instruções de pagamento alternitivas, NIBs bancários, ou notas de isenção..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full text-xs border rounded-lg p-3 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  } focus:outline-none`}
                />
              </div>

            </div>

            {/* Billing Right Calculator breakdown */}
            <div className="space-y-5 col-span-1">
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} space-y-4`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sumário da Liquidação (AOA)</h3>
                
                {/* 6.5% Withholding (Retenção) toggle */}
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                } flex items-center justify-between`}>
                  <div className="shrink-1.5 pr-2">
                    <span className="text-[10.5px] font-semibold block leading-tight">Sujeito a Retenção na Fonte</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Dedução de 6.5% de IRT em Serviços</span>
                  </div>
                  <input
                    id="checkbox-retencao-fonte"
                    type="checkbox"
                    checked={withholdingEnabled}
                    onChange={(e) => setWithholdingEnabled(e.target.checked)}
                    className="h-4 w-4 accent-blue-500 shrink-0"
                  />
                </div>

                <div className="space-y-2.5 text-xs text-slate-400 pt-2 border-t border-slate-900/10 dark:border-slate-900/45">
                  <div className="flex justify-between">
                    <span>Subtotal Ilíquido:</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{liveSubtotal.toLocaleString('pt-PT')} AOA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desconto Financeiro:</span>
                    <span className="font-mono text-red-500">-{liveDiscountTotal.toLocaleString('pt-PT')} AOA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Incidência Liquida:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{netBeforeTax.toLocaleString('pt-PT')} AOA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA Colectado:</span>
                    <span className="font-mono text-slate-705 dark:text-slate-250">{liveTaxTotal.toLocaleString('pt-PT')} AOA</span>
                  </div>

                  {withholdingEnabled && (
                    <div className="flex justify-between text-yellow-500 font-semibold bg-yellow-500/5 px-2 py-1 rounded">
                      <span>Retenção (6.5%):</span>
                      <span className="font-mono">-{liveWithholding.toLocaleString('pt-PT')} AOA</span>
                    </div>
                  )}

                  <div className={`flex justify-between items-baseline pt-4 border-t font-sans font-bold text-sm ${
                    theme === 'dark' ? 'border-slate-900 text-white' : 'border-slate-200 text-slate-950'
                  }`}>
                    <span>VALOR PAYÁVEL:</span>
                    <span className="text-base font-bold font-mono text-blue-500">{liveGrandTotal.toLocaleString('pt-PT')} AOA</span>
                  </div>
                </div>
              </div>

              {formErrors.global && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400">
                  {formErrors.global}
                </div>
              )}

              {/* Compliance note card */}
              <div className={`p-4 rounded-xl border border-blue-500/15 ${
                theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-50/50'
              } flex gap-2.5 items-start text-xs`}>
                <AlertCircle className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-500">AGT Certificação Ativa</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    A submissão e sincronização direta gera de forma automatizada o elemento digital <strong>Hash de Assinatura Fiscal</strong> correspondente, conforme os decretos em vigor na República de Angola.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* 3. PROFESSIONAL INVOICE PREVIEW VIEW */}
      {viewState === 'view' && selectedInvoice && (
        <div className="space-y-6">
          {/* View Mode controls bar */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-900/10 dark:border-slate-800/40 print:hidden">
            <div className="flex items-center gap-3">
              <button
                id="btn-back-to-invoices"
                onClick={() => setViewState('list')}
                className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-sm font-bold font-sans">Visualizador e Gestor de Fatura</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">Controlos operacionais de sincronia e impressão fiscal.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedInvoice.status === 'Draft' && (
                <button
                  id="btn-issue-invoice"
                  disabled={isIssuing}
                  onClick={async () => {
                    setIsIssuing(true);
                    try {
                      const issued = await issueInvoice(selectedInvoice.id);
                      setSelectedInvoice(issued);
                      addNotification({
                        title: 'Factura emitida',
                        desc: `Documento ${issued.invoiceNo} emitido com assinatura fiscal.`,
                        type: 'success'
                      });
                    } catch (error) {
                      addNotification({
                        title: 'Emissão bloqueada',
                        desc: error instanceof Error ? error.message : 'Não foi possível emitir a factura.',
                        type: 'warning'
                      });
                    } finally {
                      setIsIssuing(false);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-sm"
                >
                  {isIssuing ? 'A emitir...' : 'Emitir Fiscalmente'}
                </button>
              )}

              {selectedInvoice.status === 'Issued' && (
                <button
                  id="btn-sync-now-agt-disabled"
                  disabled
                  className="px-3.5 py-1.5 bg-slate-500/40 text-white/70 text-[11px] font-bold rounded-lg shadow-sm cursor-not-allowed"
                  title="A sincronização AGT será implementada com Celery na próxima fase."
                >
                  AGT Sync Pendente
                </button>
              )}

              {selectedInvoice.status !== 'Paid' && selectedInvoice.status !== 'Cancelled' && selectedInvoice.status !== 'Draft' && (
                <button
                  id="btn-mark-as-paid"
                  disabled
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-205 text-emerald-700 hover:bg-slate-200'
                  }`}
                  title="A liquidação será implementada no módulo de pagamentos."
                >
                  Liquidar (FR / VD)
                </button>
              )}

              <button
                id="btn-export-pdf"
                onClick={() => window.print()}
                className="p-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all"
                title="Exportar como PDF de alta fidelidade"
              >
                <Download className="h-4 w-4" />
                <span>Exportar PDF</span>
              </button>

              <button
                id="btn-print-invoice"
                onClick={() => window.print()}
                className={`p-1.5 px-3 rounded-lg border text-[11px] font-semibold flex items-center gap-1 ${
                  theme === 'dark' ? 'border-slate-800 text-slate-300 hover:bg-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:block">
            
            {/* Printable Visual Invoice Document */}
            <div id="printable-invoice-canvas" className={`lg:col-span-3 p-8 rounded-xl shadow-lg border relative print:w-full print:p-0 print:border-none print:shadow-none print:text-black print:bg-white ${
              theme === 'dark' ? 'bg-white text-slate-900 border-slate-300 shadow-slate-950/20' : 'bg-white text-slate-900 border-slate-200'
            }`}>
              
              {/* Watermark of syncing */}
              {selectedInvoice.status === 'AGT_Synced' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 opacity-[0.06] select-none pointer-events-none text-center">
                  <span className="text-8xl font-black font-sans tracking-widest text-emerald-700 uppercase block">SINCRONIZADO</span>
                  <span className="text-4xl font-sans tracking-wide text-emerald-700 uppercase font-bold block mt-3">AGT ORIGINAL</span>
                </div>
              )}

              {/* Document Header details */}
              <div className="flex justify-between items-start gap-6 border-b pb-6">
                <div>
                  <span className="text-[22px] font-black tracking-tight text-blue-600 font-sans block">
                    {currentTenant.name}
                  </span>
                  <div className="text-xxs font-mono text-slate-500 space-y-0.5 mt-2 max-w-sm">
                    <p>NIF: {currentTenant.nif}</p>
                    <p>{currentTenant.address}</p>
                    <p>{currentTenant.city}, {currentTenant.country}</p>
                    <p className="font-bold text-slate-700">{currentTenant.fiscalRegime}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-mono font-black text-slate-900 block tracking-tight">
                    {selectedInvoice.type === 'FT' ? 'FATURA' : selectedInvoice.type === 'FR' ? 'FATURA-RECIBO' : 'VENDA A DINHEIRO'}
                  </span>
                  <span className="text-sm font-mono font-bold block text-slate-700 mt-1">
                    Documento N.º: {selectedInvoice.invoiceNo}
                  </span>
                  
                  <div className="text-right mt-3 text-xxs font-mono text-slate-500 space-y-1">
                    <p>DATA DE EMISSÃO: <strong className="font-bold text-slate-800">{selectedInvoice.issueDate}</strong></p>
                    <p>DATA DE VENCIMENTO: <strong className="font-bold text-slate-800">{selectedInvoice.dueDate}</strong></p>
                    <p>CRIADO POR: <span className="uppercase">{selectedInvoice.createdBy}</span></p>
                  </div>
                </div>
              </div>

              {/* Client & Address Info panel */}
              <div className="grid grid-cols-2 gap-4 py-6 border-b text-xxs font-mono">
                <div>
                  <span className="text-slate-400 font-bold block mb-1.5">DADOS DO CLIENTE / ADQUIRENTE</span>
                  <span className="text-xs font-bold font-sans text-slate-900">{selectedInvoice.clientName}</span>
                  <p className="mt-1 text-slate-500">NIF: <span className="font-bold text-slate-800">{selectedInvoice.clientNif}</span></p>
                  <p className="text-slate-500 mt-0.5">Endereço: {selectedInvoice.clientAddress}</p>
                </div>
                
                <div className="text-right shrink-0">
                  <span className="text-slate-400 font-bold block mb-1">DADOS DE ENQUADRAMENTO FISCAL</span>
                  <p className="text-slate-500">Programa Validado n.º 241/AGT/2026</p>
                  <p className="text-slate-500 mt-0.5">Moeda: Kwanza Angolano (AOA / Kz)</p>
                  <p className="text-slate-500 mt-0.5">Regime de Isenção/Transmissão Geral</p>
                </div>
              </div>

              {/* Items column */}
              <div className="py-6">
                <table className="w-full text-left text-xxs font-mono">
                  <thead>
                    <tr className="border-b-2 text-slate-500 font-bold bg-slate-100/30">
                      <th className="p-2 w-12 text-center">CÓD.</th>
                      <th className="p-2">DESCRIÇÃO DA MERCADORIA OU INSUMO</th>
                      <th className="p-2 w-14 text-center">QTD</th>
                      <th className="p-2 w-20 text-right">FUNDO (AOA)</th>
                      <th className="p-2 w-14 text-center">DESC.</th>
                      <th className="p-2 w-12 text-center">TAXA.</th>
                      <th className="p-2 w-24 text-right">TOTAL (AOA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index} className="border-b last:border-b-2 font-sans font-medium text-[11px]">
                        <td className="p-2.5 font-mono text-center text-slate-500">{index + 1}</td>
                        <td className="p-2.5 font-bold text-slate-800">
                          {item.productName}
                        </td>
                        <td className="p-2.5 font-mono text-center text-slate-500">{item.quantity}</td>
                        <td className="p-2.5 font-mono text-right text-slate-500">{item.price.toLocaleString('pt-PT')}</td>
                        <td className="p-2.5 font-mono text-center text-slate-500">{item.discount}%</td>
                        <td className="p-2.5 font-mono text-center text-slate-500">{item.taxRate}%</td>
                        <td className="p-2.5 font-mono text-right font-bold text-slate-900">
                          {item.total.toLocaleString('pt-PT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Math breakdown row */}
              <div className="grid grid-cols-2 gap-4 text-xxs font-mono pb-6">
                {/* Left side: Notes and Signature Hash Area */}
                <div className="space-y-4">
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">NOTAS INSTITUCIONAIS</span>
                    <p className="text-slate-500 leading-relaxed max-w-xs text-[10px]">
                      {selectedInvoice.notes || 'Incondicional. Sem juros incidentes se pago dentro da data regulamentar com referência de NIB ordinária.'}
                    </p>
                  </div>

                  {selectedInvoice.invoiceHash && (
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[9px]">
                      <span className="font-sans font-bold text-slate-800 block mb-0.5 uppercase tracking-wide">
                        Assinatura Certificada AGT (Hash)
                      </span>
                      <p className="truncate block font-semibold">{selectedInvoice.invoiceHash}</p>
                      <span className="text-[7.5px] text-slate-400 block mt-1 uppercase font-sans">
                        Chave do algoritmo RSA sha256 validada pelo certificado fiscal nº 241
                      </span>
                    </div>
                  )}
                </div>

                {/* Right side: Calculative aggregates */}
                <div className="space-y-1.5 text-right w-80 ml-auto border-l pl-4 font-sans text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Ilíquido:</span>
                    <span className="font-mono font-medium">{selectedInvoice.subtotal.toLocaleString('pt-PT')} AOA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Descontos:</span>
                    <span className="font-mono text-red-500">-{selectedInvoice.discountTotal.toLocaleString('pt-PT')} AOA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total IVA Colectado:</span>
                    <span className="font-mono font-semibold">{selectedInvoice.taxTotal.toLocaleString('pt-PT')} AOA</span>
                  </div>

                  {selectedInvoice.withholdingTaxAmount > 0 && (
                    <div className="flex justify-between text-yellow-600 font-semibold bg-yellow-500/5 px-1 py-0.5 rounded">
                      <span>Retenção na Fonte (6.5%):</span>
                      <span className="font-mono">-{selectedInvoice.withholdingTaxAmount.toLocaleString('pt-PT')} AOA</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t pt-2 mt-2 font-bold text-sm text-slate-900">
                    <span>TOTAL PAYÁVEL (Ilíquido):</span>
                    <span className="font-mono text-sm font-black text-blue-600">
                      {selectedInvoice.grandTotal.toLocaleString('pt-PT')} AOA
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer certification details and QR Code layout compliance */}
              <div className="border-t pt-5 mt-4 flex justify-between items-center text-[9px] font-sans text-slate-400 leading-tight">
                <div className="max-w-md">
                  <p className="font-bold text-slate-650">DECLARAÇÃO DE CONFORMIDADE FISCAL</p>
                  <p className="mt-1">
                    Os bens ou serviços indicados foram efectivamente disponibilizados nos prazos estabelecidos neste documento. Processado por computador / NDFATURA software certificado n.º 241/AGT/2026.
                  </p>
                  <p className="mt-1 font-mono text-[8px]">
                    SISTEMA CERTIFICADO EM ANGOLA - VALIDAÇÃO COMPLIANT COM REGRAS FISCAIS DO MINISTÉRIO DAS FINANÇAS.
                  </p>
                </div>

                {/* Simulated QR Code compliance sector */}
                {selectedInvoice.qrcodeString ? (
                  <div className="flex flex-col items-center gap-1 shrink-0 border p-2 rounded bg-slate-50 shadow-inner">
                    <div className="h-16 w-16 bg-slate-900 flex items-center justify-center text-white rounded">
                      <QrCode className="h-12 w-12 text-blue-400" />
                    </div>
                    <span className="text-[7px] font-mono text-slate-500 tracking-wide mt-0.5">VALIDAR AGT QR</span>
                  </div>
                ) : (
                  <div className="p-2 border border-slate-200 border-dashed rounded text-[8px] text-slate-400 text-center w-24">
                     Pendente de Sincronia
                  </div>
                )}
              </div>

            </div>

            {/* Quick Operational Timeline card */}
            <div className={`col-span-1 p-5 rounded-xl border print:hidden ${
              theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-300' : 'bg-white border-slate-200 text-slate-750'
            } space-y-4`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Auditoria Fiscal e Historial</h3>
              
              <div className="space-y-4 text-xs font-sans">
                {/* Step 1 */}
                <div className="flex gap-2.5 items-start">
                  <div className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-[9px] font-mono shrink-0 mt-0.5">
                     1
                  </div>
                  <div>
                    <p className="font-bold">Documento Processado</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Criado e assinado no banco de dados local por Manuel Bento.</p>
                    <span className="text-[9px] text-slate-400 font-mono block mt-1">{selectedInvoice.issueDate}</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-2.5 items-start">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-mono shrink-0 mt-0.5 ${
                    selectedInvoice.status === 'AGT_Synced' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    2
                  </div>
                  <div>
                    <p className="font-bold">Sincronização no Portal AGT</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedInvoice.status === 'AGT_Synced' 
                        ? 'Comunicação oficial do XML SOAP para servidores municipais validado.' 
                        : 'Transmissão pendente de assinatura digital oficial.'}
                    </p>
                    {selectedInvoice.agtSyncDate && (
                      <span className="text-[9px] text-slate-400 font-mono block mt-1">{selectedInvoice.agtSyncDate}</span>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-2.5 items-start">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-mono shrink-0 mt-0.5 ${
                    selectedInvoice.status === 'Paid' 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    3
                  </div>
                  <div>
                    <p className="font-bold">Facturação Liquidada</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedInvoice.status === 'Paid' 
                        ? 'Pagamento em conciliação bancária confirmado e recebido em tesouraria.' 
                        : 'Aguardando verificação ou guias de depósito por parte do adquirente.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* XML Schema Inspector simulator */}
              <div className={`pt-4 border-t ${theme === 'dark' ? 'border-slate-900' : 'border-slate-100'} space-y-2`}>
                <span className="text-[10px] font-mono text-slate-500 block uppercase">Ficheiro SAFT Integrado</span>
                <div className="p-2 bg-slate-900 text-emerald-400 text-[8.5px] font-mono rounded h-24 overflow-y-auto w-full border border-slate-800">
                  <span>&lt;InvoiceNo&gt;{selectedInvoice.invoiceNo}&lt;/InvoiceNo&gt;</span><br />
                  <span>&lt;ATCUD&gt;{selectedInvoice.invoiceHash ? 'A-W3X-' + selectedInvoice.id : 'Pendente'}&lt;/ATCUD&gt;</span><br />
                  <span>&lt;TaxPayable&gt;{selectedInvoice.taxTotal}&lt;/TaxPayable&gt;</span><br />
                  <span>&lt;GrossTotal&gt;{selectedInvoice.grandTotal}&lt;/GrossTotal&gt;</span><br />
                  <span>&lt;CustomerTaxID&gt;{selectedInvoice.clientNif}&lt;/CustomerTaxID&gt;</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

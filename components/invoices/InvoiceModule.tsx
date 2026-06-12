'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { getApiFieldErrors } from '../../services/api';
import { canIssueInvoice, canCancelInvoice } from '../../lib/rbac';
import { 
  Invoice, 
  InvoiceItem, 
  InvoiceType, 
  InvoiceStatus,
  Estabelecimento,
  ExchangeRate
} from '../../types/invoice';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  FileCheck, 
  CheckCircle, 
  Clock, 
  X, 
  Trash2, 
  Printer, 
  Share2, 
  AlertCircle, 
  FileSearch,
  ChevronRight,
  Calculator,
  RefreshCcw,
  Building,
  DollarSign,
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Tag
} from 'lucide-react';

function generateFaturaDates(type: InvoiceType) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split('T')[0];
  return { todayStr, dueDateStr };
}

export default function InvoiceModule() {
  const { currentTenant, theme, user, addNotification } = useAuthStore();
  const { 
    clients, products, invoices, estabelecimentos, exchangeRates,
    addInvoice, issueInvoice, cancelInvoice, syncInvoiceWithAGT 
  } = useDataStore();

  const [viewState, setViewState] = React.useState<'list' | 'create' | 'view'>('list');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);

  // List States
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [branchFilter, setBranchFilter] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'date' | 'total'>('date');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  // Invoice Create States
  const [selectedBranchId, setSelectedBranchId] = React.useState('');
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [invoiceType, setInvoiceType] = React.useState<InvoiceType>('FT');
  const [currency, setCurrency] = React.useState('AOA');
  const [exchangeRate, setExchangeRate] = React.useState(1);
  const [withholdingEnabled, setWithholdingEnabled] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [originDocumentId, setOriginDocumentId] = React.useState('');
  const [rectificationReason, setRectificationReason] = React.useState('');
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isIssuing, setIsIssuing] = React.useState(false);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [invoiceItems, setInvoiceItems] = React.useState<Array<{
    productId: string;
    quantity: number;
    discountPercent: number;
    price: number;
  }>>([{ productId: '', quantity: 1, discountPercent: 0, price: 0 }]);

  // Auto-set branch
  React.useEffect(() => {
    if (estabelecimentos.length > 0 && !selectedBranchId) {
        const sede = estabelecimentos.find(e => e.code === 'SEDE') || estabelecimentos[0];
        setSelectedBranchId(sede.id);
    }
  }, [estabelecimentos, selectedBranchId]);

  // Update rate
  React.useEffect(() => {
    if (currency === 'AOA') {
        setExchangeRate(1);
    } else {
        const latestRate = exchangeRates
            .filter(r => r.currencyCode === currency)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        if (latestRate) setExchangeRate(latestRate.rate);
    }
  }, [currency, exchangeRates]);

  const resetForm = () => {
    const sede = estabelecimentos.find(e => e.code === 'SEDE') || estabelecimentos[0];
    setSelectedBranchId(sede?.id || '');
    setSelectedClientId('');
    setInvoiceType('FT');
    setCurrency('AOA');
    setExchangeRate(1);
    setWithholdingEnabled(false);
    setNotes('');
    setOriginDocumentId('');
    setRectificationReason('');
    setInvoiceItems([{ productId: '', quantity: 1, discountPercent: 0, price: 0 }]);
    setFormErrors({});
  };

  if (!currentTenant) return null;

  // ---------------------------------------------------------------------------
  // DATA COMPUTATION
  // ---------------------------------------------------------------------------
  const tenantClients = clients.filter(c => c.tenantId === currentTenant.id);
  const tenantProducts = products.filter(p => p.tenantId === currentTenant.id);
  const tenantInvoices = invoices.filter(i => i.tenantId === currentTenant.id);

  const filteredInvoices = tenantInvoices.filter(inv => {
    const matchesSearch = (inv.invoiceNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                          (inv.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (inv.clientNif || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || inv.type === typeFilter;
    const matchesBranch = branchFilter === 'ALL' || inv.estabelecimentoId === branchFilter;
    return matchesSearch && matchesStatus && matchesType && matchesBranch;
  }).sort((a, b) => {
    if (sortBy === 'date') return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
    return b.grandTotal - a.grandTotal;
  });

  const currentInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const calculatedItems = invoiceItems.map((itm, index) => {
    const prod = tenantProducts.find(p => p.id === itm.productId);
    const price = itm.price || prod?.price || 0;
    const qty = itm.quantity || 0;
    const disc = itm.discountPercent || 0;
    const taxRate = prod?.taxRate || 0;

    const baseAmount = price * qty;
    const discAmount = baseAmount * (disc / 100);
    const netAmount = baseAmount - discAmount;
    const taxAmount = netAmount * (taxRate / 100);

    return {
      productId: itm.productId,
      productName: prod?.name || '',
      quantity: qty,
      price: price,
      taxRate: taxRate,
      discount: disc,
      totalTax: taxAmount,
      subtotal: baseAmount,
      total: netAmount + taxAmount
    };
  });

  const liveSubtotal = calculatedItems.reduce((acc, cur) => acc + cur.subtotal, 0);
  const liveDiscountTotal = calculatedItems.reduce((acc, cur) => acc + (cur.price * cur.quantity * (cur.discount / 100)), 0);
  const liveTaxTotal = calculatedItems.reduce((acc, cur) => acc + cur.totalTax, 0);
  const liveWithholding = withholdingEnabled ? (liveSubtotal - liveDiscountTotal) * 0.065 : 0;
  const liveGrandTotal = (liveSubtotal - liveDiscountTotal) + liveTaxTotal - liveWithholding;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleAddLine = () => setInvoiceItems([...invoiceItems, { productId: '', quantity: 1, discountPercent: 0, price: 0 }]);
  const handleRemoveLine = (idx: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));
  };
  const handleItemChange = (idx: number, field: string, value: any) => {
    const updated = [...invoiceItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setInvoiceItems(updated);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!selectedClientId) {
        setFormErrors({ client: 'Seleccione um cliente obrigatório.' });
        return;
    }
    const client = tenantClients.find(c => c.id === selectedClientId);
    if (!client) return;

    const validLines = calculatedItems.filter(item => item.productId !== '');
    if (validLines.length === 0) {
        setFormErrors({ items: 'A factura deve conter pelo menos um item.' });
        return;
    }

    const { todayStr, dueDateStr } = generateFaturaDates(invoiceType);

    setIsSavingDraft(true);
    try {
      const payload: any = {
        type: invoiceType,
        estabelecimentoId: selectedBranchId,
        currency: currency,
        exchangeRate: exchangeRate,
        issueDate: todayStr,
        dueDate: dueDateStr,
        clientId: client.id,
        items: validLines.map(l => ({
            productId: l.productId,
            quantity: l.quantity,
            price: l.price,
            discount: l.discount
        })),
        withholdingTaxRate: withholdingEnabled ? 6.5 : 0,
        notes,
        originDocumentId: originDocumentId || undefined,
        rectificationReason: rectificationReason || undefined
      };

      const result = await addInvoice(payload);
      addNotification({ title: 'Rascunho Gravado', desc: 'Rascunho preparado para emissão fiscal.', type: 'info' });
      resetForm();
      setSelectedInvoice(result);
      setViewState('view');
    } catch (error) {
      const apiErrors = getApiFieldErrors(error);
      setFormErrors(apiErrors.global ? apiErrors : { global: error instanceof Error ? error.message : 'Falha na comunicação' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleIssueInvoice = async (id: string) => {
    if (!confirm('Deseja emitir este documento? Esta acção é irreversível e gerará um hash fiscal AGT.')) return;
    setIsIssuing(true);
    try {
      const result = await issueInvoice(id);
      setSelectedInvoice(result);
      addNotification({ title: 'Factura Emitida', desc: 'Documento assinado digitalmente (RS256).', type: 'success' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro na emissão');
    } finally {
      setIsIssuing(false);
    }
  };

  const renderStatusBadge = (status: InvoiceStatus) => {
    const configs: Record<string, { bg: string, label: string }> = {
      Draft: { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20', label: 'Rascunho' },
      Issued: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Emitido' },
      Paid: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Liquidado' },
      Partial: { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Pag. Parcial' },
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
      
      {/* 1. LIST VIEW */}
      {viewState === 'list' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight text-slate-800 dark:text-white">
                    <FileText className="h-7 w-7 text-blue-500" /> 
                    Documentos de Facturação
                </h1>
                <p className="text-xs text-slate-500">Gestão e transmissão de facturas para a AGT.</p>
            </div>
            <button 
                onClick={() => { resetForm(); setViewState('create'); }} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Plus className="h-5 w-5" /> Nova Factura
            </button>
          </div>

          {/* Search Bar */}
          <div className={`p-4 rounded-2xl border flex flex-wrap gap-4 items-center ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
            <div className="relative flex-1 min-w-[280px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                    placeholder="Pesquisar por número, cliente ou NIF..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'}`} 
                />
            </div>
            
            <div className="flex gap-2">
                <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className={`p-2 border rounded-xl text-xs font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                    <option value="ALL">Todas as Filiais</option>
                    {estabelecimentos.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`p-2 border rounded-xl text-xs font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                    <option value="ALL">Todos os Tipos</option>
                    <option value="FT">FT</option>
                    <option value="FR">FR</option>
                    <option value="NC">NC</option>
                </select>
            </div>
          </div>

          {/* Table */}
          <div className={`border rounded-2xl overflow-hidden shadow-sm ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}>
            <table className="w-full text-left text-xs">
                <thead className={theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50/80'}>
                    <tr className="uppercase text-[10px] font-black text-slate-500 tracking-widest">
                        <th className="p-4">Número</th>
                        <th className="p-4">Data</th>
                        <th className="p-4 text-right">Valor Total</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/10 dark:divide-slate-800/50">
                    {currentInvoices.length === 0 ? (
                        <tr><td colSpan={5} className="p-16 text-center text-slate-400 italic">Sem documentos.</td></tr>
                    ) : currentInvoices.map(inv => (
                        <tr key={inv.id} onClick={() => { setSelectedInvoice(inv); setViewState('view'); }} className="hover:bg-blue-500/5 cursor-pointer">
                            <td className="p-4 font-mono font-bold text-blue-500">{inv.invoiceNo}</td>
                            <td className="p-4 text-slate-500">{inv.issueDate}</td>
                            <td className="p-4 font-mono font-black text-right">{inv.grandTotal.toLocaleString('pt-PT')} {inv.currency}</td>
                            <td className="p-4 text-center">{renderStatusBadge(inv.status)}</td>
                            <td className="p-4 text-right"><ChevronRight className="h-4 w-4 text-slate-400" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CREATE VIEW */}
      {viewState === 'create' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setViewState('list')} className="p-2 bg-slate-500/10 rounded-xl"><ArrowLeft className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold">Nova Emissão</h2>
          </div>

          <form onSubmit={handleSaveInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`lg:col-span-2 p-8 rounded-3xl border space-y-8 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
                <div className="grid grid-cols-2 gap-4">
                    <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="p-3 border rounded-2xl text-xs font-bold">
                        {estabelecimentos.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                    </select>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="p-3 border rounded-2xl text-xs font-bold">
                        <option value="AOA">Kwanza (AOA)</option>
                        <option value="USD">Dólar (USD)</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)} className="md:col-span-4 p-3 border rounded-2xl text-xs font-bold">
                        <option value="FT">Factura (FT)</option>
                        <option value="FR">Factura-Recibo (FR)</option>
                        <option value="NC">Nota de Crédito (NC)</option>
                    </select>
                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="md:col-span-8 p-3 border rounded-2xl text-xs font-bold">
                        <option value="">Seleccione Cliente...</option>
                        {tenantClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between border-b pb-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase">Itens</h3>
                        <button type="button" onClick={handleAddLine} className="text-blue-500 font-bold text-xs">+ Adicionar</button>
                    </div>
                    {invoiceItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                            <select value={item.productId} onChange={e => handleItemChange(idx, 'productId', e.target.value)} className="col-span-6 p-2.5 border rounded-xl text-xs font-bold">
                                <option value="">Escolher Produto...</option>
                                {tenantProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <input type="number" placeholder="Qtd" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} className="col-span-2 p-2.5 border rounded-xl text-xs font-mono" />
                            <input type="number" placeholder="Preço" value={item.price || 0} onChange={e => handleItemChange(idx, 'price', Number(e.target.value))} className="col-span-3 p-2.5 border rounded-xl text-xs font-mono" />
                            <button type="button" onClick={() => handleRemoveLine(idx)} className="col-span-1 text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t flex justify-end">
                    <button type="submit" disabled={isSavingDraft} className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                        {isSavingDraft ? 'A processar...' : 'Gravar Rascunho'}
                    </button>
                </div>
            </div>

            <div className={`p-8 rounded-3xl border h-fit space-y-6 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
                <h3 className="font-black text-xs text-slate-400 border-b pb-4">Resumo</h3>
                <div className="space-y-4 font-mono">
                    <div className="flex justify-between text-xl font-black text-blue-500">
                        <span>TOTAL</span>
                        <span>{liveGrandTotal.toLocaleString('pt-PT')} {currency}</span>
                    </div>
                </div>
                {formErrors.global && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-bold">{formErrors.global}</div>}
            </div>
          </form>
        </div>
      )}

      {viewState === 'view' && selectedInvoice && (
        <div className="max-w-4xl mx-auto p-12 rounded-3xl border bg-white text-slate-800 space-y-10 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-10">
                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-blue-600 uppercase">{currentTenant.name}</h1>
                    <div className="text-xs space-y-1 text-slate-500 font-bold">
                        <p>NIF: {currentTenant.nif} | {currentTenant.address}</p>
                        <p className="text-blue-500">UNIDADE: {selectedInvoice.estabelecimentoCode || 'SEDE'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-5xl font-black text-slate-100">{selectedInvoice.type}</h2>
                    <p className="font-mono font-black text-2xl text-blue-600">{selectedInvoice.invoiceNo || 'PROFORMA'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">DATA: {selectedInvoice.issueDate}</p>
                    <div className="pt-4">{renderStatusBadge(selectedInvoice.status)}</div>
                </div>
            </div>
            
            <div className="py-10 border-b">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Entidade Adquirente</p>
                <h4 className="text-xl font-black">{selectedInvoice.clientName}</h4>
                <p className="text-sm font-bold text-slate-500">NIF: {selectedInvoice.clientNif}</p>
            </div>

            <div className="flex justify-between items-end pt-10">
                <div className="space-y-4">
                    {selectedInvoice.status !== 'Draft' && (
                        <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 space-y-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hash (AGT)</span>
                            <p className="text-[10px] font-mono text-blue-400 break-all max-w-sm">{selectedInvoice.invoiceHash}</p>
                        </div>
                    )}
                    <p className="text-[9px] text-slate-400 font-bold italic">Software Certificado n.º {currentTenant.agtCertificateNo || '---'}/AGT/2026</p>
                </div>
                <div className="text-right space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-xs">Valor Total a Pagar</span>
                    <h2 className="text-4xl font-black text-blue-600">{selectedInvoice.grandTotal.toLocaleString('pt-PT')} <span className="text-sm text-slate-400 font-bold">{selectedInvoice.currency}</span></h2>
                </div>
            </div>

            <div className="pt-10 flex gap-3 border-t">
                {selectedInvoice.status === 'Draft' && (
                    <button onClick={() => handleIssueInvoice(selectedInvoice.id)} disabled={isIssuing} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                       {isIssuing ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <FileCheck className="h-5 w-5" />}
                       Emitir Fiscalmente (Sign)
                    </button>
                )}
                <button onClick={() => setViewState('list')} className="px-10 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase text-xs tracking-widest">Voltar</button>
            </div>
        </div>
      )}

    </div>
  );
}

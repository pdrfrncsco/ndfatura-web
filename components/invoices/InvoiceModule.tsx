'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { getApiFieldErrors, InvoiceService } from '../../services/api';
import { Invoice, InvoiceStatus, InvoiceType } from '../../types/invoice';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import { FeedbackOverlay } from '../common/FeedbackOverlay';

function generateFaturaDates(type: InvoiceType) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + (type === 'FR' ? 0 : 30));
  const dueDateStr = dueDate.toISOString().split('T')[0];
  return { todayStr, dueDateStr };
}

const toAmount = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const money = (value: unknown, currency = 'AOA') =>
  `${toAmount(value).toLocaleString('pt-AO', { maximumFractionDigits: 0 })} ${currency === 'AOA' ? 'Kz' : currency}`;

const dateLabel = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initials = (name?: string) =>
  (name || 'ND')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const cardClass = (theme: string) =>
  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200';

const softClass = (theme: string) =>
  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200';

export default function InvoiceModule() {
  const { currentTenant, theme, addNotification } = useAuthStore();
  const {
    clients,
    products,
    invoices,
    estabelecimentos,
    exchangeRates,
    addInvoice,
    issueInvoice,
    validateInvoiceWithAGT,
  } = useDataStore();

  const [viewState, setViewState] = React.useState<'list' | 'create' | 'view'>('list');
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [branchFilter, setBranchFilter] = React.useState<string>('ALL');
  const [sortBy, setSortBy] = React.useState<'date' | 'total'>('date');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

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
  const [invoiceItems, setInvoiceItems] = React.useState<
    Array<{ productId: string; quantity: number; discountPercent: number; price: number }>
  >([{ productId: '', quantity: 1, discountPercent: 0, price: 0 }]);

  React.useEffect(() => {
    if (estabelecimentos.length > 0 && !selectedBranchId) {
      const sede = estabelecimentos.find((e) => e.code === 'SEDE') || estabelecimentos[0];
      setSelectedBranchId(sede.id);
    }
  }, [estabelecimentos, selectedBranchId]);

  React.useEffect(() => {
    if (currency === 'AOA') {
      setExchangeRate(1);
      return;
    }
    const latestRate = exchangeRates
      .filter((r) => r.currencyCode === currency)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (latestRate) setExchangeRate(latestRate.rate);
  }, [currency, exchangeRates]);

  if (!currentTenant) return null;

  const tenantClients = clients.filter((c) => c.tenantId === currentTenant.id);
  const tenantProducts = products.filter((p) => p.tenantId === currentTenant.id);
  const tenantInvoices = invoices.filter((i) => i.tenantId === currentTenant.id);

  const filteredInvoices = tenantInvoices
    .filter((inv) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (inv.invoiceNo?.toLowerCase() || '').includes(term) ||
        (inv.clientName?.toLowerCase() || '').includes(term) ||
        (inv.clientNif || '').includes(searchTerm);
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || inv.type === typeFilter;
      const matchesBranch = branchFilter === 'ALL' || inv.estabelecimentoId === branchFilter;
      return matchesSearch && matchesStatus && matchesType && matchesBranch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      return toAmount(b.grandTotal) - toAmount(a.grandTotal);
    });

  const currentInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));

  const totalInvoiced = tenantInvoices.reduce((sum, inv) => sum + toAmount(inv.grandTotal), 0);
  const pendingAmount = tenantInvoices.reduce((sum, inv) => sum + Math.max(toAmount(inv.grandTotal) - toAmount(inv.paidAmount), 0), 0);
  const taxTotal = tenantInvoices.reduce((sum, inv) => sum + toAmount(inv.taxTotal), 0);
  const agtSynced = tenantInvoices.filter((inv) => inv.status === 'AGT_Synced' || Boolean(inv.agtSyncDate)).length;
  const agtRate = tenantInvoices.length ? Math.round((agtSynced / tenantInvoices.length) * 100) : 0;

  const calculatedItems = invoiceItems.map((itm) => {
    const prod = tenantProducts.find((p) => p.id === itm.productId);
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
      price,
      taxRate,
      discount: disc,
      totalTax: taxAmount,
      subtotal: baseAmount,
      total: netAmount + taxAmount,
    };
  });

  const liveSubtotal = calculatedItems.reduce((acc, cur) => acc + cur.subtotal, 0);
  const liveDiscountTotal = calculatedItems.reduce((acc, cur) => acc + cur.price * cur.quantity * (cur.discount / 100), 0);
  const liveTaxTotal = calculatedItems.reduce((acc, cur) => acc + cur.totalTax, 0);
  const liveWithholding = withholdingEnabled ? (liveSubtotal - liveDiscountTotal) * 0.065 : 0;
  const liveGrandTotal = liveSubtotal - liveDiscountTotal + liveTaxTotal - liveWithholding;

  const selectedClient = tenantClients.find((c) => c.id === selectedClientId);
  const selectedBranch = estabelecimentos.find((b) => b.id === selectedBranchId);

  const resetForm = () => {
    const sede = estabelecimentos.find((e) => e.code === 'SEDE') || estabelecimentos[0];
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

  const handleAddLine = () => setInvoiceItems([...invoiceItems, { productId: '', quantity: 1, discountPercent: 0, price: 0 }]);
  const handleRemoveLine = (idx: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));
  };
  const handleItemChange = (idx: number, field: string, value: string | number) => {
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
    const client = tenantClients.find((c) => c.id === selectedClientId);
    if (!client) return;

    const validLines = calculatedItems.filter((item) => item.productId !== '');
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
        currency,
        exchangeRate,
        issueDate: todayStr,
        dueDate: dueDateStr,
        clientId: client.id,
        items: validLines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          price: line.price,
          discount: line.discount,
        })),
        withholdingTaxRate: withholdingEnabled ? 6.5 : 0,
        notes,
        originDocumentId: originDocumentId || undefined,
        rectificationReason: rectificationReason || undefined,
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
    setFeedback({ status: 'loading', message: 'Assinando documento e gerando Hash Fiscal...' });
    try {
      const result = await issueInvoice(id);
      setSelectedInvoice(result);
      setFeedback({ status: 'success', message: 'Documento assinado e emitido com sucesso.' });
    } catch (err) {
      setFeedback({ status: 'error', message: err instanceof Error ? err.message : 'Erro na emissão fiscal.' });
    } finally {
      setIsIssuing(false);
    }
  };

  const handleValidateAGT = async (id: string) => {
    setIsSyncing(true);
    setFeedback({ status: 'loading', message: 'Comunicando com os servidores da AGT...' });
    try {
      await validateInvoiceWithAGT(id);
      const updated = invoices.find((i) => i.id === id);
      if (updated) setSelectedInvoice(updated);
      setFeedback({ status: 'success', message: 'Sincronização com AGT validada.' });
    } catch (err) {
      setFeedback({ status: 'error', message: err instanceof Error ? err.message : 'Falha na comunicação com a AGT.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendEmail = async (id: string) => {
    setFeedback({ status: 'loading', message: 'Enviando e-mail com anexo PDF...' });
    try {
      await InvoiceService.sendEmail(id);
      setFeedback({ status: 'success', message: 'Factura enviada para o e-mail do cliente.' });
    } catch {
      setFeedback({ status: 'error', message: 'Não foi possível enviar o e-mail. Verifique os dados do cliente.' });
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      const fileName = `${invoice.invoiceNo?.replace(/\//g, '_') || 'factura'}.pdf`;
      await InvoiceService.downloadPdf(invoice.id, fileName);
    } catch {
      addNotification({ title: 'Erro no Download', desc: 'Não foi possível gerar o PDF.', type: 'warning' });
    }
  };

  const renderStatusBadge = (status: InvoiceStatus) => {
    const configs: Record<string, { cls: string; label: string }> = {
      Draft: { cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20', label: 'Rascunho' },
      Issued: { cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Emitido' },
      Paid: { cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', label: 'Liquidado' },
      Partial: { cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Parcial' },
      Cancelled: { cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20', label: 'Anulado' },
      AGT_Synced: { cls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', label: 'Sync AGT' },
      AGT_Error: { cls: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Erro AGT' },
    };
    const config = configs[status] || configs.Draft;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.cls}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className={`flex gap-1 overflow-x-auto border-b px-1 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'list', label: 'Facturas', icon: FileText },
          { id: 'create', label: 'Nova factura', icon: Plus },
          { id: 'view', label: 'Detalhe', icon: FileCheck2, disabled: !selectedInvoice },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => {
                if (tab.id === 'create') resetForm();
                setViewState(tab.id as 'list' | 'create' | 'view');
              }}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                viewState === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:bg-slate-500/5 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {viewState === 'list' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Total facturado" value={money(totalInvoiced)} hint={`${tenantInvoices.length} documentos no período`} tone="blue" theme={theme} />
            <KpiCard title="Por cobrar" value={money(pendingAmount)} hint="Inclui facturas parciais e vencidas" tone="amber" theme={theme} />
            <KpiCard title="Sincronizado AGT" value={`${agtRate}%`} hint={`${agtSynced} de ${tenantInvoices.length} documentos`} tone="emerald" theme={theme} />
            <KpiCard title="IVA do mês" value={money(taxTotal)} hint="Imposto liquidado nos documentos" tone="slate" theme={theme} />
          </div>

          <div className={`flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center ${cardClass(theme)}`}>
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Pesquisar por nº, cliente ou NIF..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 ${softClass(theme)}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <FilterSelect value={branchFilter} onChange={setBranchFilter} theme={theme}>
                <option value="ALL">Todas filiais</option>
                {estabelecimentos.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect value={statusFilter} onChange={setStatusFilter} theme={theme}>
                <option value="ALL">Estado</option>
                <option value="Draft">Rascunho</option>
                <option value="Issued">Emitido</option>
                <option value="Paid">Liquidado</option>
                <option value="Partial">Parcial</option>
                <option value="AGT_Synced">Sync AGT</option>
              </FilterSelect>
              <FilterSelect value={typeFilter} onChange={setTypeFilter} theme={theme}>
                <option value="ALL">Tipo</option>
                <option value="FT">FT</option>
                <option value="FR">FR</option>
                <option value="NC">NC</option>
                <option value="VD">VD</option>
              </FilterSelect>
              <FilterSelect value={sortBy} onChange={(value) => setSortBy(value as 'date' | 'total')} theme={theme}>
                <option value="date">Mais recentes</option>
                <option value="total">Maior valor</option>
              </FilterSelect>
            </div>
            <button
              onClick={() => {
                resetForm();
                setViewState('create');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Nova factura
            </button>
          </div>

          <div className={`overflow-hidden rounded-lg border shadow-sm ${cardClass(theme)}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className={theme === 'dark' ? 'bg-slate-900/70' : 'bg-slate-50'}>
                  <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Emissão</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3">Liquidado</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">AGT</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {currentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-500">
                        Sem documentos para os filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    currentInvoices.map((inv) => {
                      const grandTotal = toAmount(inv.grandTotal);
                      const paidAmount = toAmount(inv.paidAmount);
                      const paidPercent = grandTotal > 0 ? Math.min(100, Math.round((paidAmount / grandTotal) * 100)) : 0;
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setViewState('view');
                          }}
                          className="cursor-pointer hover:bg-blue-500/5"
                        >
                          <td className="px-4 py-3">
                            <div className="font-mono text-sm font-semibold text-blue-600">{inv.invoiceNo || 'Rascunho'}</div>
                            <div className="text-[11px] text-slate-500">{inv.type}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-600">
                                {initials(inv.clientName)}
                              </div>
                              <div>
                                <div className="font-medium">{inv.clientName}</div>
                                <div className="text-[11px] text-slate-500">NIF: {inv.clientNif || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{dateLabel(inv.issueDate)}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{dateLabel(inv.dueDate)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold">{money(inv.grandTotal, inv.currency)}</td>
                          <td className="px-4 py-3">
                            <div className="text-[11px] font-medium text-emerald-600">{money(inv.paidAmount, inv.currency)}</div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPercent}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-3">{renderStatusBadge(inv.status)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-600">
                              {inv.agtSyncDate || inv.status === 'AGT_Synced' ? <Check className="h-3 w-3" /> : <ClockIcon />}
                              {inv.agtSyncDate || inv.status === 'AGT_Synced' ? 'Sync' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className={`flex items-center justify-between border-t px-4 py-3 text-xs ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="text-slate-500">
                A mostrar {currentInvoices.length} de {filteredInvoices.length} documentos
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border px-3 py-1.5 disabled:opacity-40 dark:border-slate-800"
                >
                  Anterior
                </button>
                <span className="font-mono">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border px-3 py-1.5 disabled:opacity-40 dark:border-slate-800"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewState === 'create' && (
        <form onSubmit={handleSaveInvoice} className="animate-in slide-in-from-right-3 duration-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setViewState('list')} className="rounded-md border p-2 dark:border-slate-800">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Nova emissão fiscal</h1>
                <p className="text-xs text-slate-500">Documento assinado, numerado e preparado para comunicação AGT.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSavingDraft}
              className="hidden items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:inline-flex"
            >
              <Send className="h-4 w-4" />
              {isSavingDraft ? 'A gravar...' : 'Gravar rascunho'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-lg border lg:grid-cols-[1fr_320px] dark:border-slate-800">
            <div className={`space-y-6 p-5 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
              <section className="space-y-3">
                <SectionTitle icon={FileText} label="Tipo de documento" />
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    ['FT', 'Factura'],
                    ['FR', 'Fact. recibo'],
                    ['NC', 'N. crédito'],
                    ['VD', 'Venda dinheiro'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInvoiceType(value as InvoiceType)}
                      className={`rounded-md border px-3 py-2 text-center text-xs transition ${
                        invoiceType === value
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <span className="block text-base font-semibold">{value}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Building2} label="Emitente e cliente" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Filial emissora">
                    <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className={`field-input ${softClass(theme)}`}>
                      {estabelecimentos.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.code} - {branch.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Moeda">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`field-input ${softClass(theme)}`}>
                      <option value="AOA">AOA - Kwanza</option>
                      <option value="USD">USD - Dólar</option>
                    </select>
                  </Field>
                </div>
                <Field label="Cliente">
                  <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className={`field-input ${softClass(theme)}`}>
                    <option value="">Seleccione um cliente...</option>
                    {tenantClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.nif}
                      </option>
                    ))}
                  </select>
                </Field>
                {formErrors.client && <p className="text-xs font-medium text-rose-600">{formErrors.client}</p>}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Data de emissão">
                    <input readOnly value={generateFaturaDates(invoiceType).todayStr} className={`field-input ${softClass(theme)}`} />
                  </Field>
                  <Field label="Data de vencimento">
                    <input readOnly value={generateFaturaDates(invoiceType).dueDateStr} className={`field-input ${softClass(theme)}`} />
                  </Field>
                  <Field label="Retenção na fonte">
                    <select
                      value={withholdingEnabled ? '6.5' : '0'}
                      onChange={(e) => setWithholdingEnabled(e.target.value !== '0')}
                      className={`field-input ${softClass(theme)}`}
                    >
                      <option value="0">Nenhuma</option>
                      <option value="6.5">6,5% - Serviços</option>
                    </select>
                  </Field>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={FileCheck2} label="Itens da factura" />
                  <button type="button" onClick={handleAddLine} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar item
                  </button>
                </div>
                <div className="hidden grid-cols-[1fr_76px_120px_90px_36px] gap-2 border-b pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid dark:border-slate-800">
                  <span>Produto / serviço</span>
                  <span>Qtd</span>
                  <span>Preço unit.</span>
                  <span>Desc.</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {invoiceItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_76px_120px_90px_36px]">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className={`field-input ${softClass(theme)}`}
                      >
                        <option value="">Escolher produto...</option>
                        {tenantProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.taxRate}% IVA)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className={`field-input text-center ${softClass(theme)}`}
                      />
                      <input
                        type="number"
                        min={0}
                        value={item.price || ''}
                        placeholder="Preço"
                        onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                        className={`field-input font-mono ${softClass(theme)}`}
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) => handleItemChange(idx, 'discountPercent', Number(e.target.value))}
                        className={`field-input font-mono ${softClass(theme)}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="flex h-10 items-center justify-center rounded-md border text-slate-500 hover:border-rose-300 hover:text-rose-600 dark:border-slate-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {formErrors.items && <p className="text-xs font-medium text-rose-600">{formErrors.items}</p>}
              </section>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Documento de origem">
                  <input
                    value={originDocumentId}
                    onChange={(e) => setOriginDocumentId(e.target.value)}
                    placeholder="Obrigatório para rectificativas"
                    className={`field-input ${softClass(theme)}`}
                  />
                </Field>
                <Field label="Motivo de rectificação">
                  <input
                    value={rectificationReason}
                    onChange={(e) => setRectificationReason(e.target.value)}
                    placeholder="Ex: devolução parcial"
                    className={`field-input ${softClass(theme)}`}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Observações">
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Impresso na factura..."
                      className={`field-input resize-y ${softClass(theme)}`}
                    />
                  </Field>
                </div>
              </section>

              <button
                type="submit"
                disabled={isSavingDraft}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:hidden"
              >
                <Send className="h-4 w-4" />
                {isSavingDraft ? 'A gravar...' : 'Gravar rascunho'}
              </button>
            </div>

            <aside className={`space-y-5 border-t p-5 lg:border-l lg:border-t-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
              <SectionTitle icon={CheckCircle2} label="Resumo" />
              <div className={`rounded-lg border p-4 ${cardClass(theme)}`}>
                <SummaryRow label={`Subtotal (${calculatedItems.length} itens)`} value={money(liveSubtotal, currency)} />
                <SummaryRow label="Desconto" value={money(liveDiscountTotal, currency)} />
                <SummaryRow label="IVA" value={money(liveTaxTotal, currency)} />
                <SummaryRow label="Retenção" value={`- ${money(liveWithholding, currency)}`} danger />
                <div className="mt-3 border-t pt-3 dark:border-slate-800">
                  <SummaryRow label="Total a pagar" value={money(liveGrandTotal, currency)} strong />
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
                <Wifi className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="text-sm font-semibold">AGT online</div>
                  <div className="text-xs opacity-80">Série {selectedBranch?.code || 'SEDE'}/{invoiceType}/2026 activa</div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <SectionTitle icon={ShieldCheck} label="Antes de emitir" />
                <ChecklistItem ok={Boolean(selectedClient)} label="Cliente seleccionado" />
                <ChecklistItem ok={Boolean(selectedBranch)} label="Série fiscal activa" />
                <ChecklistItem ok={calculatedItems.some((item) => item.productId)} label="Itens preenchidos" />
                <ChecklistItem ok={false} label="Factura não revisada" warn />
              </div>
              {formErrors.global && <div className="rounded-md bg-rose-500/10 p-3 text-xs font-medium text-rose-600">{formErrors.global}</div>}
            </aside>
          </div>
        </form>
      )}

      {viewState === 'view' && selectedInvoice && (
        <div className="grid grid-cols-1 overflow-hidden rounded-lg border lg:grid-cols-[1fr_320px] dark:border-slate-800">
          <main className={`p-5 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <button onClick={() => setViewState('list')} className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar à lista
                </button>
                <span className="inline-flex rounded bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600">
                  {selectedInvoice.type} - Documento fiscal
                </span>
                <h1 className="mt-2 font-mono text-2xl font-semibold text-blue-600">{selectedInvoice.invoiceNo || 'PROFORMA'}</h1>
              </div>
              {renderStatusBadge(selectedInvoice.status)}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Meta label="Cliente" value={selectedInvoice.clientName} />
              <Meta label="NIF cliente" value={selectedInvoice.clientNif} mono />
              <Meta label="Data emissão" value={dateLabel(selectedInvoice.issueDate)} />
              <Meta label="Data vencimento" value={dateLabel(selectedInvoice.dueDate)} />
              <Meta label="Filial" value={selectedInvoice.estabelecimentoCode || 'SEDE'} />
              <Meta label="Moeda" value={selectedInvoice.currency} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b text-left text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-2">Descrição</th>
                    <th className="py-2">Qtd</th>
                    <th className="py-2">P. unit.</th>
                    <th className="py-2">IVA</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3">{item.productName}</td>
                      <td className="py-3 font-mono">{item.quantity}</td>
                      <td className="py-3 font-mono">{money(item.price, selectedInvoice.currency)}</td>
                      <td className="py-3">{item.taxRate}%</td>
                      <td className="py-3 text-right font-mono">{money(item.total, selectedInvoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 border-t pt-4 dark:border-slate-800">
              <SummaryRow label="Subtotal" value={money(selectedInvoice.subtotal, selectedInvoice.currency)} />
              <SummaryRow label="IVA" value={money(selectedInvoice.taxTotal, selectedInvoice.currency)} />
              <SummaryRow label={`Retenção (${selectedInvoice.withholdingTaxRate || 0}%)`} value={`- ${money(selectedInvoice.withholdingTaxAmount || 0, selectedInvoice.currency)}`} danger />
              <div className="mt-2 border-t pt-2 dark:border-slate-800">
                <SummaryRow label="Total" value={money(selectedInvoice.grandTotal, selectedInvoice.currency)} strong />
              </div>
            </div>

            {selectedInvoice.invoiceHash && (
              <div className={`mt-5 rounded-lg border p-3 ${softClass(theme)}`}>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                  Hash fiscal AGT
                </div>
                <p className="break-all font-mono text-xs text-slate-500">{selectedInvoice.invoiceHash}</p>
              </div>
            )}
          </main>

          <aside className={`space-y-5 border-t p-5 lg:border-l lg:border-t-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
            <SectionTitle icon={ShieldCheck} label="Estado AGT" />
            <div className="space-y-3 border-l border-slate-200 pl-4 text-xs dark:border-slate-800">
              <TimelineItem done label="Rascunho criado" date={dateLabel(selectedInvoice.issueDate)} />
              <TimelineItem done={selectedInvoice.status !== 'Draft'} label="Assinado JWS RS256" date={selectedInvoice.status !== 'Draft' ? dateLabel(selectedInvoice.issueDate) : '-'} />
              <TimelineItem done={Boolean(selectedInvoice.agtSyncDate)} active={selectedInvoice.status === 'Issued'} label="Enviado para AGT" date={selectedInvoice.agtSyncDate ? dateLabel(selectedInvoice.agtSyncDate) : '-'} />
              <TimelineItem done={selectedInvoice.status === 'Paid'} active={selectedInvoice.status === 'Paid'} label="Pagamento recebido" date={selectedInvoice.status === 'Paid' ? 'Registado' : '-'} />
            </div>

            <SectionTitle icon={FileCheck2} label="Acções" />
            <div className="space-y-2">
              {selectedInvoice.status === 'Draft' && (
                <ActionButton onClick={() => handleIssueInvoice(selectedInvoice.id)} icon={FileCheck2} label={isIssuing ? 'A emitir...' : 'Emitir fiscalmente'} tone="success" />
              )}
              {(selectedInvoice.status === 'Issued' || selectedInvoice.status === 'AGT_Error') && (
                <ActionButton onClick={() => handleValidateAGT(selectedInvoice.id)} icon={RefreshCcw} label={isSyncing ? 'A validar...' : 'Re-sincronizar AGT'} />
              )}
              <ActionButton onClick={() => handleDownloadPdf(selectedInvoice)} icon={Download} label="Descarregar PDF" />
              <ActionButton onClick={() => handleSendEmail(selectedInvoice.id)} icon={Mail} label="Reenviar ao cliente" />
              <ActionButton onClick={() => addNotification({ title: 'Duplicação', desc: 'Use a criação de factura para emitir novo documento.', type: 'info' })} icon={Copy} label="Duplicar factura" />
              <ActionButton onClick={() => addNotification({ title: 'Anulação', desc: 'Emita uma Nota de Crédito para anular o documento.', type: 'warning' })} icon={X} label="Anular (Nota de Crédito)" tone="danger" />
            </div>

            <SectionTitle icon={QrIcon} label="QR Code fiscal" />
            <div className={`rounded-lg border p-4 text-center ${cardClass(theme)}`}>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded border border-dashed text-xs text-slate-500 dark:border-slate-700">QR AGT</div>
              <div className="mt-2 text-xs text-slate-500">Código para validação AGT</div>
            </div>
          </aside>
        </div>
      )}

      <style jsx global>{`
        .field-input {
          width: 100%;
          border-radius: 0.375rem;
          border-width: 1px;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .field-input:focus {
          border-color: rgb(37 99 235);
          box-shadow: 0 0 0 2px rgb(37 99 235 / 0.12);
        }
      `}</style>
      <FeedbackOverlay status={feedback.status} message={feedback.message} onClose={() => setFeedback({ status: 'idle', message: '' })} />
    </div>
  );
}

function KpiCard({ title, value, hint, tone, theme }: { title: string; value: string; hint: string; tone: 'blue' | 'amber' | 'emerald' | 'slate'; theme: string }) {
  const toneClass = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    slate: 'text-slate-600 dark:text-slate-300',
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${cardClass(theme)}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function FilterSelect({ value, onChange, theme, children }: { value: string; onChange: (value: string) => void; theme: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`h-full appearance-none rounded-full border py-2 pl-3 pr-8 text-xs font-medium outline-none ${softClass(theme)}`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 ${strong ? 'text-base font-semibold' : 'text-sm text-slate-500'}`}>
      <span>{label}</span>
      <span className={`font-mono ${danger ? 'text-rose-600' : strong ? 'text-slate-900 dark:text-white' : ''}`}>{value}</span>
    </div>
  );
}

function ChecklistItem({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  const cls = ok ? 'text-emerald-600' : warn ? 'text-amber-600' : 'text-slate-500';
  const Icon = ok ? Check : warn ? AlertTriangle : Clock;
  return (
    <div className={`flex items-center gap-2 ${cls}`}>
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function TimelineItem({ label, date, done, active }: { label: string; date: string; done?: boolean; active?: boolean }) {
  return (
    <div className="relative pb-2">
      <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-500' : active ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
      <div className="text-[10px] text-slate-500">{date}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone }: { icon: React.ElementType; label: string; onClick: () => void; tone?: 'success' | 'danger' }) {
  const cls =
    tone === 'success'
      ? 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10'
      : tone === 'danger'
        ? 'border-rose-500/30 text-rose-600 hover:bg-rose-500/10'
        : 'border-slate-200 hover:bg-slate-500/5 dark:border-slate-800';
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${cls}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ClockIcon() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
}

function QrIcon(props: React.SVGProps<SVGSVGElement>) {
  return <FileText {...props} />;
}

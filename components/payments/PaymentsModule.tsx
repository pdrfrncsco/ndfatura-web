'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Plus,
  Receipt as ReceiptIcon,
  Search,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { ReceiptService } from '../../services/api';
import { Invoice, PaymentMethod, Receipt } from '../../types/invoice';

const toAmount = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const money = (value: unknown) => toAmount(value).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 });

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

const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: React.ElementType }> = [
  { value: 'TR', label: 'Transferência', icon: Landmark },
  { value: 'NU', label: 'Numerário', icon: Wallet },
  { value: 'CC', label: 'TPA / Cartão', icon: CreditCard },
  { value: 'TB', label: 'Multicaixa', icon: Smartphone },
];

export function PaymentsModule() {
  const { currentTenant, theme, addNotification } = useAuthStore();
  const { clients, fetchClients, invoices, fetchInvoices } = useDataStore();

  const [receipts, setReceipts] = React.useState<Receipt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewState, setViewState] = React.useState<'list' | 'create' | 'view'>('list');
  const [selectedClientId, setSelectedClientId] = React.useState<string>('');
  const [pendingInvoices, setPendingInvoices] = React.useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = React.useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('TR');
  const [reference, setReference] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedReceipt, setSelectedReceipt] = React.useState<Receipt | null>(null);

  const loadReceipts = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await ReceiptService.getAll();
      setReceipts(data);
    } catch {
      addNotification({
        title: 'Erro de Dados',
        desc: 'Não foi possível carregar a lista de recibos.',
        type: 'warning',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  React.useEffect(() => {
    loadReceipts();
    fetchClients();
    fetchInvoices();
  }, [loadReceipts, fetchClients, fetchInvoices]);

  if (!currentTenant) return null;

  const filteredReceipts = receipts.filter(
    (receipt) =>
      (receipt.receiptNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (receipt.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()),
  );

  const totalReceived = receipts.reduce((sum, receipt) => sum + (receipt.status === 'Issued' ? toAmount(receipt.totalAmount) : 0), 0);
  const openInvoices = invoices.filter(
    (inv) => (inv.status === 'Issued' || inv.status === 'Partial' || inv.status === 'AGT_Synced') && toAmount(inv.paidAmount) < toAmount(inv.grandTotal),
  );
  const openAmount = openInvoices.reduce((sum, inv) => sum + Math.max(toAmount(inv.grandTotal) - toAmount(inv.paidAmount), 0), 0);
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedInvoiceCount = Object.keys(selectedInvoices).length;
  const totalPayment = Object.values(selectedInvoices).reduce((sum, val) => sum + val, 0);
  const selectedInvoiceTotal = pendingInvoices
    .filter((inv) => selectedInvoices[inv.id])
    .reduce((sum, inv) => sum + toAmount(inv.grandTotal), 0);
  const alreadyPaidTotal = pendingInvoices
    .filter((inv) => selectedInvoices[inv.id])
    .reduce((sum, inv) => sum + toAmount(inv.paidAmount), 0);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const clientInvoices = invoices.filter(
      (inv) =>
        inv.clientId === clientId &&
        (inv.status === 'Issued' || inv.status === 'Partial' || inv.status === 'AGT_Synced') &&
        toAmount(inv.paidAmount) < toAmount(inv.grandTotal),
    );
    setPendingInvoices(clientInvoices);
    setSelectedInvoices({});
  };

  const toggleInvoiceSelection = (invoice: Invoice) => {
    const remaining = Math.max(toAmount(invoice.grandTotal) - toAmount(invoice.paidAmount), 0);
    setSelectedInvoices((prev) => {
      const next = { ...prev };
      if (next[invoice.id]) {
        delete next[invoice.id];
      } else {
        next[invoice.id] = remaining;
      }
      return next;
    });
  };

  const handleAmountChange = (invoiceId: string, amount: number) => {
    setSelectedInvoices((prev) => ({
      ...prev,
      [invoiceId]: amount,
    }));
  };

  const resetCreate = () => {
    setSelectedClientId('');
    setPendingInvoices([]);
    setSelectedInvoices({});
    setPaymentMethod('TR');
    setReference('');
  };

  const handleDownloadPdf = async (receipt: Receipt) => {
    try {
      const fileName = `${receipt.receiptNo?.replace(/\//g, '_') || 'recibo'}.pdf`;
      await ReceiptService.downloadPdf(receipt.id, fileName);
    } catch {
      addNotification({ title: 'Erro no Download', desc: 'Não foi possível gerar o PDF.', type: 'warning' });
    }
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || selectedInvoiceCount === 0) {
      addNotification({
        title: 'Validação',
        desc: 'Seleccione um cliente e pelo menos uma factura.',
        type: 'warning',
      });
      return;
    }

    try {
      setSubmitting(true);
      const items = Object.entries(selectedInvoices).map(([invoiceId, amount]) => ({
        invoiceId,
        amountPaid: amount,
      }));

      await ReceiptService.create({
        clientId: selectedClientId,
        paymentMethod,
        issueDate: new Date().toISOString().split('T')[0],
        notes: reference ? `Referência: ${reference}` : '',
        items,
      });

      addNotification({
        title: 'Recibo Emitido',
        desc: 'A liquidação foi processada e o recibo fiscal assinado com sucesso.',
        type: 'success',
      });

      resetCreate();
      setViewState('list');
      loadReceipts();
      fetchInvoices();
    } catch {
      addNotification({
        title: 'Falha na Emissão',
        desc: 'Ocorreu um erro ao processar o recibo fiscal.',
        type: 'warning',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const config =
      status === 'Issued'
        ? { label: 'Emitido', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
        : status === 'Cancelled'
          ? { label: 'Cancelado', cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
          : { label: 'Rascunho', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
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
          { id: 'list', label: 'Recebimentos', icon: ReceiptIcon },
          { id: 'create', label: 'Novo recebimento', icon: Plus },
          { id: 'view', label: 'Detalhe', icon: FileText, disabled: !selectedReceipt },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => {
                if (tab.id === 'create') resetCreate();
                setViewState(tab.id as 'list' | 'create' | 'view');
              }}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                viewState === tab.id
                  ? 'border-indigo-600 text-indigo-600'
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <KpiCard theme={theme} title="Total recebido" value={money(totalReceived)} hint={`${receipts.length} recibos registados`} tone="emerald" />
            <KpiCard theme={theme} title="Por liquidar" value={money(openAmount)} hint={`${openInvoices.length} facturas em aberto`} tone="amber" />
            <KpiCard theme={theme} title="Recibos emitidos" value={String(receipts.filter((receipt) => receipt.status === 'Issued').length)} hint="Documentos assinados fiscalmente" tone="indigo" />
          </div>

          <div className={`flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center ${cardClass(theme)}`}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Pesquisar por recibo ou cliente..."
                className={`w-full rounded-md border py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 ${softClass(theme)}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                resetCreate();
                setViewState('create');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Novo recebimento
            </button>
          </div>

          <div className={`overflow-hidden rounded-lg border shadow-sm ${cardClass(theme)}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className={theme === 'dark' ? 'bg-slate-900/70' : 'bg-slate-50'}>
                  <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Nº Recibo</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        A carregar recibos...
                      </td>
                    </tr>
                  ) : filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                        Nenhum recibo encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((receipt) => (
                      <tr
                        key={receipt.id}
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setViewState('view');
                        }}
                        className="cursor-pointer hover:bg-indigo-500/5"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{receipt.receiptNo || 'Rascunho'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-600">
                              {initials(receipt.clientName)}
                            </div>
                            <div>
                              <div className="font-medium">{receipt.clientName}</div>
                              <div className="text-[11px] text-slate-500">NIF: {receipt.clientNif || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{dateLabel(receipt.issueDate)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{methodLabel(receipt.paymentMethod)}</td>
                        <td className="px-4 py-3">{renderStatusBadge(receipt.status)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{money(receipt.totalAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewState === 'create' && (
        <form onSubmit={handleCreateReceipt} className="animate-in slide-in-from-right-3 duration-200">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setViewState('list')} className="rounded-md border p-2 dark:border-slate-800">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Novo recebimento</h1>
                <p className="text-xs text-slate-500">Seleccione cliente, liquide facturas e emita o recibo fiscal.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || totalPayment <= 0}
              className="hidden items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:inline-flex"
            >
              <Check className="h-4 w-4" />
              {submitting ? 'A processar...' : 'Confirmar e emitir recibo'}
            </button>
          </div>

          <div className="grid grid-cols-1 overflow-hidden rounded-lg border lg:grid-cols-[1fr_320px] dark:border-slate-800">
            <main className={`space-y-5 p-5 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
              <section className="space-y-3">
                <SectionTitle icon={Building2} label="1 - Seleccionar cliente" />
                <div className={`rounded-lg border p-3 ${softClass(theme)}`}>
                  <select value={selectedClientId} onChange={(e) => handleClientChange(e.target.value)} className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${cardClass(theme)}`} required>
                    <option value="">Seleccione um cliente...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.nif}
                      </option>
                    ))}
                  </select>
                  {selectedClient && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-sm font-semibold text-amber-600">
                        {initials(selectedClient.name)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{selectedClient.name}</div>
                        <div className="text-xs text-slate-500">
                          NIF: {selectedClient.nif} · Saldo em dívida: {money(pendingInvoices.reduce((sum, inv) => sum + Math.max(toAmount(inv.grandTotal) - toAmount(inv.paidAmount), 0), 0))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={FileText} label="2 - Facturas em aberto" />
                <div className={`overflow-hidden rounded-lg border ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className={`grid grid-cols-[36px_1fr_120px_120px_140px] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-slate-50'}`}>
                    <span />
                    <span>Documento</span>
                    <span className="text-right">Valor total</span>
                    <span className="text-right">Em dívida</span>
                    <span className="text-right">Pagar</span>
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {!selectedClientId ? (
                      <div className="px-3 py-8 text-center text-sm text-slate-500">Seleccione um cliente para ver facturas pendentes.</div>
                    ) : pendingInvoices.length === 0 ? (
                      <div className="px-3 py-8 text-center text-sm text-slate-500">Nenhuma factura pendente encontrada.</div>
                    ) : (
                      pendingInvoices.map((invoice) => {
                        const remaining = Math.max(toAmount(invoice.grandTotal) - toAmount(invoice.paidAmount), 0);
                        const selected = selectedInvoices[invoice.id] !== undefined;
                        return (
                          <div key={invoice.id} className={`grid grid-cols-[36px_1fr_120px_120px_140px] items-center gap-3 px-3 py-3 text-sm ${selected ? 'bg-indigo-500/5' : ''}`}>
                            <button
                              type="button"
                              onClick={() => toggleInvoiceSelection(invoice)}
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {selected && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <div>
                              <div className="font-mono font-semibold">{invoice.invoiceNo}</div>
                              <div className="text-[11px] text-slate-500">Emitida {dateLabel(invoice.issueDate)}</div>
                            </div>
                            <div className="text-right font-mono">{money(invoice.grandTotal)}</div>
                            <div className="text-right font-mono text-amber-600">{money(remaining)}</div>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              max={remaining}
                              disabled={!selected}
                              value={selectedInvoices[invoice.id] || ''}
                              onChange={(e) => handleAmountChange(invoice.id, Number(e.target.value))}
                              className={`rounded-md border px-2 py-1.5 text-right font-mono text-sm outline-none disabled:opacity-40 ${softClass(theme)}`}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={Wallet} label="3 - Método de pagamento" />
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`rounded-md border p-3 text-center text-xs transition ${
                          paymentMethod === method.value
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                        }`}
                      >
                        <Icon className="mx-auto mb-1 h-5 w-5" />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            </main>

            <aside className={`space-y-5 border-t p-5 lg:border-l lg:border-t-0 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
              <SectionTitle icon={CheckCircle2} label="Resumo do recebimento" />
              <div className="py-2 text-center">
                <div className="text-3xl font-semibold">{money(totalPayment)}</div>
                <div className="mt-1 text-xs text-slate-500">Angolan Kwanza · AOA</div>
              </div>
              <div className={`rounded-lg border p-4 ${cardClass(theme)}`}>
                <SummaryRow label="Facturas seleccionadas" value={String(selectedInvoiceCount)} />
                <SummaryRow label="Total facturado" value={money(selectedInvoiceTotal)} />
                <SummaryRow label="Já pago" value={money(alreadyPaidTotal)} />
                <div className="mt-3 border-t pt-3 dark:border-slate-800">
                  <SummaryRow label="A receber agora" value={money(totalPayment)} strong />
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Nº de referência / comprovativo</span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: TRANSF-2026-08811"
                  className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-indigo-500 ${cardClass(theme)}`}
                />
              </label>
              <button
                type="submit"
                disabled={submitting || totalPayment <= 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {submitting ? 'A processar...' : 'Confirmar e emitir recibo'}
              </button>
              <div className="text-center text-xs text-slate-500">O recibo será assinado digitalmente e enviado à AGT automaticamente.</div>
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <div className="text-xs">Série RC/2026 activa · próximo recibo preparado para emissão.</div>
              </div>
            </aside>
          </div>
        </form>
      )}

      {viewState === 'view' && selectedReceipt && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setViewState('list')} className="rounded-md border p-2 dark:border-slate-800">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold">Detalhes do recibo</h1>
                <p className="font-mono text-xs text-slate-500">{selectedReceipt.receiptNo}</p>
              </div>
            </div>
            <button
              onClick={() => handleDownloadPdf(selectedReceipt)}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold dark:border-slate-800"
            >
              <Download className="h-4 w-4" />
              Descarregar PDF
            </button>
          </div>

          <div className={`mx-auto max-w-4xl rounded-lg border p-6 shadow-sm ${cardClass(theme)}`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-600 text-xl font-semibold text-white">RC</div>
                <div>
                  <h2 className="text-xl font-semibold">{currentTenant.name}</h2>
                  <p className="font-mono text-xs text-slate-500">NIF: {currentTenant.nif}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">RECIBO</div>
                <div className="font-mono text-sm text-slate-500">{selectedReceipt.receiptNo}</div>
                <div className="mt-2">{renderStatusBadge(selectedReceipt.status)}</div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 border-y py-6 md:grid-cols-2 dark:border-slate-800">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cliente</div>
                <div className="font-semibold">{selectedReceipt.clientName}</div>
                <div className="mt-1 text-xs text-slate-500">Data de emissão: {dateLabel(selectedReceipt.issueDate)}</div>
                <div className="text-xs text-slate-500">Método: {methodLabel(selectedReceipt.paymentMethod)}</div>
              </div>
              <div className="md:text-right">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Resumo financeiro</div>
                <div className="text-3xl font-semibold">{money(selectedReceipt.totalAmount)}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Documentos liquidados</div>
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-2">Factura</th>
                    <th className="py-2 text-right">Valor pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selectedReceipt.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 font-mono font-semibold">{item.invoiceNo}</td>
                      <td className="py-3 text-right font-mono font-semibold text-indigo-600">{money(item.amountPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReceipt.receiptHash && (
              <div className="mt-8 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-end md:justify-between dark:border-slate-800">
                <div className="max-w-xl space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assinatura digital fiscal</div>
                  <p className={`break-all rounded border p-3 font-mono text-xs text-slate-500 ${softClass(theme)}`}>{selectedReceipt.receiptHash}</p>
                  <p className="text-xs text-slate-500">Validado pelo software {currentTenant.agtCertificateNo || '---'}</p>
                </div>
                <div className="rounded border border-dashed p-4 text-center text-xs text-slate-500 dark:border-slate-700">
                  <div className="flex h-20 w-20 items-center justify-center">QR AGT</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function methodLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    NU: 'Numerário',
    TB: 'Multicaixa',
    CC: 'TPA / Cartão',
    OU: 'Outro',
    TR: 'Transferência',
  };
  return labels[method] || method;
}

function KpiCard({ title, value, hint, tone, theme }: { title: string; value: string; hint: string; tone: 'emerald' | 'amber' | 'indigo'; theme: string }) {
  const toneClass = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    indigo: 'text-indigo-600',
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${cardClass(theme)}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
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

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 ${strong ? 'text-base font-semibold' : 'text-sm text-slate-500'}`}>
      <span>{label}</span>
      <span className={`font-mono ${strong ? 'text-slate-900 dark:text-white' : ''}`}>{value}</span>
    </div>
  );
}

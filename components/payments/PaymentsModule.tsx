'use client';

import * as React from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  CheckCircle, 
  Clock, 
  X,
  MoreVertical,
  Download,
  Filter,
  ArrowLeft,
  Wallet,
  Receipt as ReceiptIcon,
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { ReceiptService } from '../../services/api';
import { Receipt, Invoice, Client, PaymentMethod } from '../../types/invoice';

export function PaymentsModule() {
  const { currentTenant, theme, addNotification } = useAuthStore();
  const { clients, fetchClients, invoices, fetchInvoices } = useDataStore();

  const [receipts, setReceipts] = React.useState<Receipt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewState, setViewState] = React.useState<'list' | 'create' | 'view'>('list');
  
  // Create state
  const [selectedClientId, setSelectedClientId] = React.useState<string>('');
  const [pendingInvoices, setPendingInvoices] = React.useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = React.useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('TR');
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedReceipt, setSelectedReceipt] = React.useState<Receipt | null>(null);

  const loadReceipts = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await ReceiptService.getAll();
      setReceipts(data);
    } catch (error) {
      addNotification({
        title: 'Erro de Dados',
        desc: 'Não foi possível carregar a lista de recibos.',
        type: 'warning'
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

  const filteredReceipts = receipts.filter(r => 
    (r.receiptNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (r.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const clientInvoices = invoices.filter(inv => 
      inv.clientId === clientId && 
      (inv.status === 'Issued' || inv.status === 'Partial' || inv.status === 'AGT_Synced') &&
      inv.paidAmount < inv.grandTotal
    );
    setPendingInvoices(clientInvoices);
    setSelectedInvoices({});
  };

  const toggleInvoiceSelection = (invoice: Invoice) => {
    const remaining = invoice.grandTotal - invoice.paidAmount;
    setSelectedInvoices(prev => {
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
    setSelectedInvoices(prev => ({
      ...prev,
      [invoiceId]: amount
    }));
  };

  const totalPayment = Object.values(selectedInvoices).reduce((sum, val) => sum + val, 0);

  const handleDownloadPdf = async (receipt: Receipt) => {
    try {
      const fileName = `${receipt.receiptNo?.replace(/\//g, '_') || 'recibo'}.pdf`;
      await ReceiptService.downloadPdf(receipt.id, fileName);
    } catch (err) {
      addNotification({ title: 'Erro no Download', desc: 'Não foi possível gerar o PDF.', type: 'error' });
    }
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || Object.keys(selectedInvoices).length === 0) {
      addNotification({
        title: 'Validação',
        desc: 'Seleccione um cliente e pelo menos uma factura.',
        type: 'warning'
      });
      return;
    }

    try {
      setSubmitting(true);
      const items = Object.entries(selectedInvoices).map(([invoiceId, amount]) => ({
        invoiceId,
        amountPaid: amount
      }));

      const receipt = await ReceiptService.create({
        clientId: selectedClientId,
        paymentMethod: paymentMethod,
        issueDate: new Date().toISOString().split('T')[0],
        notes: '',
        items
      });
      
      addNotification({
        title: 'Recibo Emitido',
        desc: 'A liquidação foi processada e o recibo fiscal assinado com sucesso.',
        type: 'success'
      });
      
      setViewState('list');
      setSelectedClientId('');
      loadReceipts();
      fetchInvoices(); // Refresh invoice status
    } catch (error) {
      addNotification({
        title: 'Falha na Emissão',
        desc: 'Ocorreu um erro ao processar o recibo fiscal.',
        type: 'warning'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Issued':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            EMITIDO
          </span>
        );
      case 'AGT_Synced':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            SINCRONIZADO AGT
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            RASCUNHO
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            CANCELADO
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  if (!currentTenant) return null;

  return (
    <div className="space-y-6">
      {viewState === 'list' && (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Recebimentos</h1>
              <p className="text-slate-500 text-sm">Gira liquidações e emita recibos para os seus clientes</p>
            </div>
            <button 
              onClick={() => setViewState('create')} 
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Novo Recebimento
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex items-center space-x-4`}>
              <div className="bg-emerald-100 dark:bg-emerald-950/30 p-3 rounded-lg text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Recebido</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {receipts.reduce((sum, r) => sum + (r.status === 'Issued' ? r.totalAmount : 0), 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-900 bg-slate-900/40' : 'border-slate-200 bg-slate-50/50'} flex items-center justify-between`}>
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  placeholder="Pesquisar recibos..." 
                  className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'} focus:outline-none transition-all`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border ${theme === 'dark' ? 'border-slate-800 hover:bg-slate-900' : 'border-slate-200 hover:bg-slate-100'} transition-all`}>
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b ${theme === 'dark' ? 'border-slate-900' : 'border-slate-200'}`}>
                  <tr>
                    <th className="p-4">Nº Recibo</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Método</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500 text-sm">A carregar recibos...</td></tr>
                  ) : filteredReceipts.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500 text-sm">Nenhum recibo encontrado</td></tr>
                  ) : filteredReceipts.map((receipt) => (
                    <tr key={receipt.id} className={`${theme === 'dark' ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50/50'} transition-colors group`}>
                      <td className="p-4 font-mono text-xs font-bold text-slate-900 dark:text-slate-200">{receipt.receiptNo || 'Rascunho'}</td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{new Date(receipt.issueDate).toLocaleDateString()}</td>
                      <td className="p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">{receipt.clientName}</td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-400">{receipt.paymentMethod}</td>
                      <td className="p-4 text-center">{renderStatusBadge(receipt.status)}</td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-white">
                        {receipt.totalAmount.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedReceipt(receipt);
                            setViewState('view');
                          }}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewState === 'create' && (
        <form onSubmit={handleCreateReceipt} className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-900/10 dark:border-slate-800/40">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewState('list')}
                className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-lg font-bold">Novo Recebimento</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">Seleccione o cliente e as facturas para liquidação.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting || totalPayment <= 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
              >
                {submitting ? 'A processar...' : 'Confirmar e Emitir Recibo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} space-y-4`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Cliente</h3>
                <select 
                  className={`w-full p-2.5 rounded-lg border text-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:border-indigo-500`}
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  required
                >
                  <option value="">Seleccione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.nif})</option>)}
                </select>

                {selectedClientId && (
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Facturas em Aberto
                      </h3>
                    </div>
                    
                    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                      <table className="w-full text-left text-xs">
                        <thead className={`${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'} font-bold text-slate-500`}>
                          <tr>
                            <th className="p-3 w-10"></th>
                            <th className="p-3">Factura</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-right">Em Dívida</th>
                            <th className="p-3 text-right w-32">Valor a Pagar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                          {pendingInvoices.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-500 italic">Nenhuma factura pendente encontrada.</td></tr>
                          ) : pendingInvoices.map(inv => (
                            <tr key={inv.id} className={selectedInvoices[inv.id] ? (theme === 'dark' ? 'bg-indigo-950/20' : 'bg-indigo-50/30') : ''}>
                              <td className="p-3 text-center">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={!!selectedInvoices[inv.id]} 
                                  onChange={() => toggleInvoiceSelection(inv)}
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-bold">{inv.invoiceNo}</div>
                                <div className="text-[10px] text-slate-500">{new Date(inv.issueDate).toLocaleDateString()}</div>
                              </td>
                              <td className="p-3 text-right">{inv.grandTotal.toLocaleString('pt-AO')}</td>
                              <td className="p-3 text-right text-rose-600 font-bold">
                                {(inv.grandTotal - inv.paidAmount).toLocaleString('pt-AO')}
                              </td>
                              <td className="p-3">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  disabled={!selectedInvoices[inv.id]}
                                  value={selectedInvoices[inv.id] || ''}
                                  onChange={(e) => handleAmountChange(inv.id, Number(e.target.value))}
                                  className={`w-full p-1.5 text-right text-sm rounded-md border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} focus:outline-none focus:border-indigo-500 disabled:opacity-30`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'} space-y-4`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pagamento</h3>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Método</label>
                  <select 
                    className={`w-full p-2.5 rounded-lg border text-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200'} focus:outline-none focus:border-indigo-500`}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="CH">Numerário (Cash)</option>
                    <option value="TR">Transferência Bancária</option>
                    <option value="TP">TPA</option>
                    <option value="DP">Depósito</option>
                    <option value="OU">Outro</option>
                  </select>
                </div>

                <div className={`p-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-slate-800 bg-slate-900/20' : 'border-slate-100 bg-slate-50/50'} flex flex-col items-center justify-center text-center space-y-2`}>
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total a Liquidar</span>
                   <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                     {totalPayment.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                   </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {viewState === 'view' && selectedReceipt && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center pb-4 border-b border-slate-900/10 dark:border-slate-800/40">
             <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewState('list')}
                  className={`p-1.5 rounded-lg border ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold">Detalhes do Recibo</h1>
                  <p className="text-[11px] text-slate-500 mt-0.5">{selectedReceipt.receiptNo}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDownloadPdf(selectedReceipt)}
                  className={`px-4 py-2 border rounded-lg text-xs font-bold flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                >
                  <Download className="w-4 h-4" />
                  Descarregar PDF
                </button>
             </div>
          </div>

          <div className={`max-w-4xl mx-auto p-8 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800 shadow-2xl shadow-indigo-500/5' : 'bg-white border-slate-200 shadow-xl'}`}>
             <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl">
                    RE
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight">{currentTenant.name}</h2>
                    <p className="text-xs text-slate-500 font-mono">NIF: {currentTenant.nif}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-black block tracking-tighter">RECIBO</span>
                  <span className="text-sm font-mono font-bold text-slate-500">{selectedReceipt.receiptNo}</span>
                  <div className="mt-2">{renderStatusBadge(selectedReceipt.status)}</div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100 dark:border-slate-900 mb-8">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cliente</h4>
                  <p className="font-bold text-sm">{selectedReceipt.clientName}</p>
                  <p className="text-xs text-slate-500 mt-1">Data de Emissão: {new Date(selectedReceipt.issueDate).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Método de Pagamento: {selectedReceipt.paymentMethod}</p>
                </div>
                <div className="text-right">
                   <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resumo Financeiro</h4>
                   <p className="text-3xl font-black text-slate-900 dark:text-white">
                      {selectedReceipt.totalAmount.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                   </p>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Documentos Liquidados</h4>
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 border-b border-slate-100 dark:border-slate-900">
                    <tr>
                      <th className="py-2">Factura</th>
                      <th className="py-2 text-right">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-900/50">
                    {selectedReceipt.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3 font-bold">{item.invoiceNo}</td>
                        <td className="py-3 text-right font-mono font-bold text-indigo-600">
                          {item.amountPaid.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             {selectedReceipt.receiptHash && (
               <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-900 flex justify-between items-end">
                  <div className="space-y-2 max-w-md">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Assinatura Digital Fiscal</span>
                    <p className="text-[9px] font-mono text-slate-500 break-all bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                      {selectedReceipt.receiptHash}
                    </p>
                    <p className="text-[8px] text-slate-400 italic">Validado pelo software {currentTenant.agtCertificateNo}</p>
                  </div>
                  {selectedReceipt.qrcodeString && (
                    <div className="bg-white p-2 rounded border border-slate-200">
                       <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 text-center font-bold">
                         QR CODE<br/>FISCAL
                       </div>
                    </div>
                  )}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

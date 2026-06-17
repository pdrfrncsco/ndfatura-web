'use client';

import * as React from 'react';
import { 
  ShoppingBag, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Trash2,
  Eye,
  Plus,
  ArrowRight,
  Search,
  Building2,
  History,
  ArrowLeft,
  Calendar,
  DollarSign,
  Package,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { PurchasesService } from '../../services/api';
import { FeedbackOverlay } from '../common/FeedbackOverlay';

interface SupplierInvoice {
  id: string;
  supplierName: string;
  supplierNif: string;
  invoiceNo: string;
  issueDate: string;
  grandTotal: number;
  subtotal: number;
  taxTotal: number;
  currency: string;
  status: string;
  file: string;
  createdAt: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    total: number;
  }>;
}

export default function PurchasesModule() {
  const { theme, currentTenant, addNotification } = useAuthStore();
  const [invoices, setInvoices] = React.useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [viewState, setViewState] = React.useState<'list' | 'analyze' | 'view'>('list');
  const [selectedInvoice, setSelectedInvoice] = React.useState<SupplierInvoice | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [feedback, setFeedback] = React.useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const loadInvoices = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await PurchasesService.getAll();
      setInvoices(data);
    } catch {
      addNotification({ title: 'Erro', desc: 'Falha ao carregar compras.', type: 'warning' });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  React.useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      setFeedback({ status: 'loading', message: 'O Gemini está a analisar o documento...' });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await PurchasesService.analyzeAI(formData);
      
      setInvoices([result, ...invoices]);
      setFeedback({ status: 'success', message: 'Dados extraídos com sucesso pela IA!' });
      setSelectedInvoice(result);
      setViewState('view');
    } catch (err) {
      setFeedback({ status: 'error', message: 'Não foi possível extrair dados automaticamente.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmInvoice = async (id: string) => {
    try {
      setIsConfirming(true);
      setFeedback({ status: 'loading', message: 'Confirmando factura de fornecedor...' });
      const result = await PurchasesService.confirm(id);
      
      setInvoices(invoices.map(inv => inv.id === id ? result : inv));
      setSelectedInvoice(result);
      setFeedback({ status: 'success', message: 'Factura confirmada e registada no sistema.' });
    } catch {
      setFeedback({ status: 'error', message: 'Falha ao confirmar factura.' });
    } finally {
      setIsConfirming(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    (inv.supplierName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (inv.invoiceNo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const isDark = theme === 'dark';
  const cardClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const softClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compras & IA</h1>
          <p className="text-xs text-slate-500 mt-1">Registo automático de facturas de fornecedores com IA Gemini.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setViewState('analyze')}
             className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
           >
             <Sparkles className="h-4 w-4" />
             Importar com IA
           </button>
        </div>
      </header>

      {viewState === 'list' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <StatCard title="Total em Compras" value={money(invoices.reduce((s, i) => s + Number(i.grandTotal), 0))} icon={ShoppingBag} color="blue" isDark={isDark} />
             <StatCard title="IVA Dedutível" value={money(invoices.reduce((s, i) => s + Number(i.taxTotal), 0))} icon={ShieldCheck} color="emerald" isDark={isDark} />
             <StatCard title="Pendente Revisão" value={String(invoices.filter(i => i.status === 'PENDING').length)} icon={AlertTriangle} color="amber" isDark={isDark} />
          </div>

          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex items-center gap-3`}>
            <Search className="h-4 w-4 text-slate-400" />
            <input 
              placeholder="Pesquisar por fornecedor ou documento..."
              className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-slate-100"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={`overflow-hidden rounded-xl border ${cardClass}`}>
            <table className="w-full text-left text-sm">
              <thead className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Fornecedor / NIF</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Importado em</th>
                  <th className="px-6 py-4 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Carregando compras...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma compra registada.</td></tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setViewState('view');
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold">{inv.supplierName || 'Desconhecido'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIF: {inv.supplierNif || '---'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs">{inv.invoiceNo || '---'}</div>
                        <div className="text-[10px] text-slate-400">{inv.issueDate || '---'}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold">
                        {money(inv.grandTotal, inv.currency)}
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                           inv.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                         }`}>
                           {inv.status === 'PENDING' ? 'Revisão' : 'Confirmado'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(inv.createdAt).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded-lg transition-colors">
                               <Eye className="h-4 w-4" />
                            </button>
                            <button className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-lg transition-colors">
                               <Trash2 className="h-4 w-4" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewState === 'analyze' && (
        <div className="max-w-3xl mx-auto py-12 animate-in zoom-in-95 duration-300">
          <div className={`p-10 rounded-3xl border-2 border-dashed ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'} text-center`}>
            <div className="h-20 w-20 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold">Importação Inteligente</h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Carregue o PDF ou foto da factura do seu fornecedor. O Gemini irá ler os itens, impostos e valores automaticamente para si.
            </p>
            
            <div className="mt-10">
              <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-blue-600/20 transition-all">
                <FileText className="h-5 w-5" />
                <span>Seleccionar Ficheiro</span>
                <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} disabled={isAnalyzing} />
              </label>
              <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Suporta PDF, JPG e PNG</p>
            </div>

            {isAnalyzing && (
              <div className="mt-12 space-y-4 animate-in fade-in duration-500">
                 <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                 <div className="text-sm font-bold text-blue-600 animate-pulse">A extrair dados com Inteligência Artificial...</div>
                 <p className="text-xs text-slate-500">Isto pode demorar alguns segundos dependendo da complexidade do documento.</p>
              </div>
            )}

            <button 
              onClick={() => setViewState('list')}
              className="mt-8 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar e voltar à lista
            </button>
          </div>
        </div>
      )}

      {viewState === 'view' && selectedInvoice && (
        <div className="space-y-6 animate-in slide-in-from-right-3 duration-200">
           <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setViewState('list')} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold">Revisão de Factura IA</h1>
                  <p className="text-xs text-slate-500">Verifique os dados extraídos pelo Gemini antes de confirmar.</p>
                </div>
              </div>
              <div className="flex gap-2">
                 {selectedInvoice.status === 'PENDING' && (
                    <button 
                      onClick={() => handleConfirmInvoice(selectedInvoice.id)}
                      disabled={isConfirming}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar e Registar
                    </button>
                 )}
              </div>
           </header>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Data Form */}
              <div className="space-y-6">
                 <section className={`p-6 rounded-2xl border ${cardClass} space-y-6`}>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                       <Building2 className="h-4 w-4 text-blue-500" /> Identificação do Fornecedor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <DataField label="Nome do Fornecedor" value={selectedInvoice.supplierName} />
                       <DataField label="NIF do Fornecedor" value={selectedInvoice.supplierNif} mono />
                       <DataField label="Nº Documento" value={selectedInvoice.invoiceNo} mono />
                       <DataField label="Data de Emissão" value={selectedInvoice.issueDate} />
                    </div>
                 </section>

                 <section className={`p-6 rounded-2xl border ${cardClass} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                       <Package className="h-4 w-4 text-blue-500" /> Itens Extraídos
                    </h3>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left text-sm">
                          <thead>
                             <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="py-2">Descrição</th>
                                <th className="py-2 text-center">Qtd</th>
                                <th className="py-2 text-right">Unitário</th>
                                <th className="py-2 text-right">Total</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {selectedInvoice.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                   <td className="py-3 font-medium">{item.description}</td>
                                   <td className="py-3 text-center">{item.quantity}</td>
                                   <td className="py-3 text-right font-mono">{money(item.unit_price, selectedInvoice.currency)}</td>
                                   <td className="py-3 text-right font-bold font-mono">{money(item.total, selectedInvoice.currency)}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </section>

                 <section className={`p-6 rounded-2xl border ${cardClass} space-y-4`}>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                       <DollarSign className="h-4 w-4 text-blue-500" /> Resumo Financeiro
                    </h3>
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="font-mono">{money(selectedInvoice.subtotal, selectedInvoice.currency)}</span>
                       </div>
                       <div className="flex justify-between text-sm">
                          <span className="text-slate-500">IVA Total</span>
                          <span className="font-mono text-blue-500">{money(selectedInvoice.taxTotal, selectedInvoice.currency)}</span>
                       </div>
                       <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-bold">Total Geral</span>
                          <span className="text-xl font-black text-blue-600 font-mono">{money(selectedInvoice.grandTotal, selectedInvoice.currency)}</span>
                       </div>
                    </div>
                 </section>
              </div>

              {/* Right: File Preview / Status */}
              <div className="space-y-6">
                 <section className={`p-6 rounded-2xl border ${cardClass} h-full min-h-[400px] flex flex-col`}>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                       <FileText className="h-4 w-4 text-blue-500" /> Documento Original
                    </h3>
                    <div className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                       {selectedInvoice.file ? (
                          <div className="text-center p-8">
                             <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                             <p className="text-xs text-slate-500 mb-4">Pré-visualização de ficheiro (PDF/Imagem)</p>
                             <a 
                                href={selectedInvoice.file} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
                             >
                                <Eye className="h-4 w-4" />
                                Abrir Documento Original
                             </a>
                          </div>
                       ) : (
                          <p className="text-slate-500 text-xs italic">Ficheiro não disponível.</p>
                       )}
                    </div>

                    <div className={`mt-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 text-xs leading-relaxed`}>
                       <div className="flex gap-3">
                          <Sparkles className="h-5 w-5 shrink-0" />
                          <p>O Gemini AI processou este documento com sucesso. Verifique se os nomes e valores coincidem com o ficheiro original à direita.</p>
                       </div>
                    </div>
                 </section>
              </div>
           </div>
        </div>
      )}

      <FeedbackOverlay status={feedback.status} message={feedback.message} onClose={() => setFeedback({ status: 'idle', message: '' })} />
    </div>
  );
}

function DataField({ label, value, mono }: { label: string, value: any, mono?: boolean }) {
  return (
    <div className="space-y-1.5">
       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
       <div className={`p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-sm font-semibold ${mono ? 'font-mono' : ''}`}>
          {value || '---'}
       </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, isDark }: { title: string, value: string, icon: any, color: 'blue' | 'emerald' | 'amber', isDark: boolean }) {
  const colors = {
    blue: isDark ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50',
    emerald: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-50',
    amber: isDark ? 'text-amber-400 bg-amber-500/10' : 'text-amber-600 bg-amber-50',
  };
  
  return (
    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
       <div className="flex justify-between items-start">
          <div className={`p-2 rounded-xl ${colors[color]}`}>
             <Icon className="h-5 w-5" />
          </div>
       </div>
       <div className="mt-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black mt-1">{value}</p>
       </div>
    </div>
  );
}

const money = (v: number, c = 'AOA') => {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);
};

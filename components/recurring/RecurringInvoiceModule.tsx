'use client';

import * as React from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Building2,
  Package,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Client, Product } from '../../types/invoice';

export default function RecurringInvoiceModule() {
  const { theme, currentTenant, addNotification } = useAuthStore();
  const { 
    recurringInvoices, 
    fetchRecurringInvoices, 
    clients, 
    products, 
    addRecurringInvoice, 
    deleteRecurringInvoice 
  } = useDataStore();

  const [viewState, setViewState] = React.useState<'list' | 'create'>('list');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    description: '',
    clientId: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    autoIssue: false,
    items: [{ productId: '', quantity: 1, price: 0, discount: 0 }]
  });

  React.useEffect(() => {
    fetchRecurringInvoices();
  }, [fetchRecurringInvoices]);

  const handleAddLine = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, price: 0, discount: 0 }]
    });
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[idx] as any)[field] = value;
    
    // Auto-fill price if product changes
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[idx].price = product.price;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveLine = (idx: number) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || formData.items.some(i => !i.productId)) {
      addNotification({ title: 'Erro de Validação', desc: 'Preencha o cliente e todos os produtos.', type: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);
      await addRecurringInvoice({
        description: formData.description,
        client: formData.clientId,
        frequency: formData.frequency,
        start_date: formData.startDate,
        auto_issue: formData.autoIssue,
        items: formData.items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
          discount: i.discount
        }))
      });
      addNotification({ title: 'Agendamento Criado', desc: 'A factura recorrente foi configurada com sucesso.', type: 'success' });
      setViewState('list');
      setFormData({
        description: '',
        clientId: '',
        frequency: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        autoIssue: false,
        items: [{ productId: '', quantity: 1, price: 0, discount: 0 }]
      });
    } catch (e) {
      addNotification({ title: 'Falha na Gravação', desc: 'Não foi possível criar o agendamento.', type: 'warning' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = recurringInvoices.filter(r => 
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isDark = theme === 'dark';

  if (viewState === 'create') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-3 duration-200">
        <header className="flex items-center gap-4">
          <button onClick={() => setViewState('list')} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Novo Agendamento Recorrente</h1>
            <p className="text-xs text-slate-500">Configure faturas automáticas (subscrições, rendas, avenças).</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <main className={`p-6 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-8`}>
            {/* Step 1: Basic Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> 1. Dados do Contrato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Descrição do Agendamento</label>
                  <input 
                    placeholder="Ex: Avença Mensal de Manutenção"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Cliente Destinatário</label>
                  <select 
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={formData.clientId}
                    onChange={e => setFormData({...formData, clientId: e.target.value})}
                    required
                  >
                    <option value="">Seleccione um cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Step 2: Frequency */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> 2. Frequência e Ciclo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Frequência</label>
                  <select 
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={formData.frequency}
                    onChange={e => setFormData({...formData, frequency: e.target.value})}
                  >
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Início do Ciclo</label>
                  <input 
                    type="date"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="flex items-center pt-6 gap-2">
                  <input 
                    type="checkbox" 
                    id="autoIssue" 
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.autoIssue}
                    onChange={e => setFormData({...formData, autoIssue: e.target.checked})}
                  />
                  <label htmlFor="autoIssue" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">Emitir fiscalmente (Auto)</label>
                </div>
              </div>
            </section>

            {/* Step 3: Items */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Package className="h-4 w-4" /> 3. Itens da Fatura
                </h3>
                <button type="button" onClick={handleAddLine} className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:text-blue-600">
                  <Plus className="h-3 w-3" /> Adicionar Produto
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_32px] gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Produto / Serviço</label>
                      <select 
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1.5 text-sm outline-none"
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                      >
                        <option value="">Seleccione...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Qtd</label>
                      <input 
                        type="number" 
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1.5 text-sm outline-none text-center"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Preço (AOA)</label>
                      <input 
                        type="number" 
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1.5 text-sm outline-none font-mono"
                        value={item.price}
                        onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveLine(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-4`}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Resumo do Ciclo</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Próxima Execução</span>
                  <span className="font-bold">{new Date(formData.startDate).toLocaleDateString('pt-AO')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Previsto</span>
                  <span className="font-bold font-mono">
                    {formData.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()} Kz
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-lg border text-[11px] leading-relaxed ${isDark ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                <div className="flex gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <p>As faturas serão geradas automaticamente pelo sistema Celery às 00:00 do dia agendado.</p>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                {isSubmitting ? 'A Gravar...' : 'Confirmar Agendamento'}
              </button>
            </div>
          </aside>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturas Recorrentes</h1>
          <p className="text-xs text-slate-500 mt-1">Gestão de avenças e contratos com emissão automática.</p>
        </div>
        <button 
          onClick={() => setViewState('create')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </button>
      </header>

      <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex items-center gap-3`}>
        <Search className="h-4 w-4 text-slate-400" />
        <input 
          placeholder="Pesquisar por descrição ou cliente..."
          className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-slate-100"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={`overflow-hidden rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <table className="w-full text-left text-sm">
          <thead className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-6 py-4">Descrição / Contrato</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Frequência</th>
              <th className="px-6 py-4">Próxima Execução</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Nenhum agendamento recorrente configurado.</td>
              </tr>
            ) : (
              filteredInvoices.map((config, idx) => (
                <tr key={config.id || `rec-${config.description}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{config.description}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <FileText className="h-3 w-3" /> Template: {config.invoice_type}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{config.clientName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      config.frequency === 'MONTHLY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {config.frequency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-mono text-xs">{new Date(config.next_run).toLocaleDateString('pt-AO')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${config.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-xs font-semibold">{config.is_active ? 'Activo' : 'Pausado'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded-lg transition-colors">
                        {config.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Tem a certeza que deseja remover este agendamento?')) {
                            deleteRecurringInvoice(config.id);
                            addNotification({ title: 'Removido', desc: 'O agendamento foi eliminado.', type: 'info' });
                          }
                        }}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-lg transition-colors"
                      >
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
  );
}

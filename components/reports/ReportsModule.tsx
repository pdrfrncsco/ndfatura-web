'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { SaftService, ReportService } from '../../services/api';
import { 
  TrendingUp, 
  FileCode, 
  Download, 
  CheckCircle, 
  Database, 
  Calculator,
  History,
  Calendar,
  User,
  ArrowRightLeft
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Cell,
  Legend
} from 'recharts';

export default function ReportsModule() {
  const { theme, currentTenant, addNotification } = useAuthStore();
  const { invoices, clients, getDashboardStats } = useDataStore();

  const [activeTab, setActiveTab] = React.useState<'saft' | 'iva' | 'statement'>('saft');
  
  // SAF-T State
  const [saftYear, setSaftYear] = React.useState(2026);
  const [saftMonth, setSaftMonth] = React.useState(5);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportedDetails, setExportedDetails] = React.useState<any>(null);

  // IVA Map State
  const [ivaYear, setIvaYear] = React.useState(2026);
  const [ivaMonth, setIvaMonth] = React.useState(5);
  const [ivaMapData, setIvaMapData] = React.useState<any>(null);
  const [isLoadingIva, setIsLoadingIva] = React.useState(false);

  // Statement State
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [statementData, setStatementData] = React.useState<any>(null);
  const [isLoadingStatement, setIsLoadingStatement] = React.useState(false);

  if (!currentTenant) return null;

  const stats = getDashboardStats(currentTenant.id);

  const handleExportSaft = async () => {
    setIsExporting(true);
    setExportedDetails(null);
    try {
      const res = await SaftService.exportSaftXml(currentTenant.id, saftYear, saftMonth);
      setExportedDetails(res);
      addNotification({
        title: 'Verificado pela AGT',
        desc: `O ficheiro SAF-T (AO) para ${saftMonth}/${saftYear} foi validado sem falhas de integridade.`,
        type: 'success'
      });
    } catch {
       alert('Alerta: Ocorreu um erro ao exportar o arquivo SAFT.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFetchIvaMap = async () => {
    setIsLoadingIva(true);
    try {
      const data = await ReportService.getIvaMap(ivaYear, ivaMonth);
      setIvaMapData(data);
    } catch {
      alert('Erro ao carregar mapa de IVA');
    } finally {
      setIsLoadingIva(false);
    }
  };

  const handleFetchStatement = async () => {
    if (!selectedClientId) return;
    setIsLoadingStatement(true);
    try {
      const data = await ReportService.getAccountStatement(selectedClientId);
      setStatementData(data);
    } catch {
      alert('Erro ao carregar extrato de conta');
    } finally {
      setIsLoadingStatement(false);
    }
  };

  const chartThemeColors = {
    gridColor: theme === 'dark' ? '#1e293b' : '#f1f5f9',
    axisColor: theme === 'dark' ? '#94a3b8' : '#64748b'
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            Relatórios e Mapas Fiscais
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Inteligência de negócio e conformidade declarativa conforme especificações da República de Angola.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('saft')}
          className={`px-4 py-2 font-bold uppercase tracking-wider transition-colors ${activeTab === 'saft' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          SAF-T (AO)
        </button>
        <button
          onClick={() => setActiveTab('iva')}
          className={`px-4 py-2 font-bold uppercase tracking-wider transition-colors ${activeTab === 'iva' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Mapa de IVA
        </button>
        <button
          onClick={() => setActiveTab('statement')}
          className={`px-4 py-2 font-bold uppercase tracking-wider transition-colors ${activeTab === 'statement' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Conta Corrente
        </button>
      </div>

      {activeTab === 'saft' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`p-5 rounded-xl border space-y-5 lg:col-span-1 ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-900/10 dark:border-slate-850/45">
              <FileCode className="h-4.5 w-4.5 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Exportar Ficheiro SAF-T</h3>
            </div>
            <div className="space-y-3.5">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Gere o ficheiro Standard Audit File for Tax Purposes para submissão à AGT.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold">Ano</label>
                  <select value={saftYear} onChange={e => setSaftYear(Number(e.target.value))} className={`w-full text-xs p-2 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold">Mês</label>
                  <select value={saftMonth} onChange={e => setSaftMonth(Number(e.target.value))} className={`w-full text-xs p-2 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                    {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleExportSaft} disabled={isExporting} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {isExporting ? <Database className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exportar SAF-T
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Arrecadação de IVA por Período</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartThemeColors.gridColor} />
                    <XAxis dataKey="month" tick={{ fill: chartThemeColors.axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartThemeColors.axisColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="tax" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'iva' && (
        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-8">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Período Fiscal</label>
              <div className="flex gap-2">
                <select value={ivaYear} onChange={e => setIvaYear(Number(e.target.value))} className={`flex-1 text-xs p-2 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
                <select value={ivaMonth} onChange={e => setIvaMonth(Number(e.target.value))} className={`flex-1 text-xs p-2 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                  {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleFetchIvaMap} disabled={isLoadingIva} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2">
              {isLoadingIva ? <Database className="animate-spin h-4 w-4" /> : <Calculator className="h-4 w-4" />}
              Gerar Mapa de IVA
            </button>
          </div>

          {ivaMapData && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Vendas Totais</span>
                  <p className="text-xl font-mono font-bold mt-1">{ivaMapData.totalSales.toLocaleString('pt-PT')} AOA</p>
                </div>
                <div className="p-5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <span className="text-[10px] text-blue-500 uppercase font-bold tracking-tight">IVA Liquidado</span>
                  <p className="text-xl font-mono font-bold mt-1 text-blue-500">{ivaMapData.totalTax.toLocaleString('pt-PT')} AOA</p>
                </div>
                <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-tight">Total Isento</span>
                  <p className="text-xl font-mono font-bold mt-1 text-emerald-500">{ivaMapData.exemptAmount.toLocaleString('pt-PT')} AOA</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Taxa de IVA</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Base Tributável</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Imposto Liquidado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ivaMapData.taxRates.map((rate: any) => (
                      <tr key={rate.rate} className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-4 font-mono font-bold text-blue-500">{rate.rate}%</td>
                        <td className="px-4 py-4 font-mono">{rate.baseAmount.toLocaleString('pt-PT')} AOA</td>
                        <td className="px-4 py-4 font-mono text-right font-bold">{rate.taxAmount.toLocaleString('pt-PT')} AOA</td>
                      </tr>
                    ))}
                    {ivaMapData.exemptAmount > 0 && (
                      <tr className="border-t border-slate-200 dark:border-slate-800 bg-emerald-500/5">
                        <td className="px-4 py-4 font-mono font-bold text-emerald-600">0% (Isento)</td>
                        <td className="px-4 py-4 font-mono">{ivaMapData.exemptAmount.toLocaleString('pt-PT')} AOA</td>
                        <td className="px-4 py-4 font-mono text-right font-bold">0,00 AOA</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'statement' && (
        <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-8">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Selecionar Cliente</label>
              <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className={`w-full text-xs p-2 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                <option value="">Escolha um cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.nif})</option>)}
              </select>
            </div>
            <button onClick={handleFetchStatement} disabled={isLoadingStatement || !selectedClientId} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2">
              {isLoadingStatement ? <Database className="animate-spin h-4 w-4" /> : <History className="h-4 w-4" />}
              Ver Extrato
            </button>
          </div>

          {statementData && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center p-5 bg-slate-900 dark:bg-blue-500/10 border border-slate-800 dark:border-blue-500/20 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg text-white">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Saldo da Conta Corrente</span>
                    <h4 className="text-white dark:text-blue-400 font-mono text-lg font-bold">Resumo Financeiro</h4>
                  </div>
                </div>
                <span className={`text-2xl font-mono font-bold ${statementData.currentBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {statementData.currentBalance.toLocaleString('pt-PT')} AOA
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Data</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Documento</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Débito</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Crédito</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px]">
                    {statementData.transactions.map((tx: any, idx: number) => (
                      <tr key={idx} className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="px-4 py-4 font-mono text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="px-4 py-4 font-mono font-bold text-slate-700 dark:text-slate-200">{tx.documentNo}</td>
                        <td className="px-4 py-4 text-slate-500 italic">{tx.description}</td>
                        <td className="px-4 py-4 font-mono text-right text-red-500/80">{tx.debit > 0 ? tx.debit.toLocaleString('pt-PT') : '-'}</td>
                        <td className="px-4 py-4 font-mono text-right text-emerald-500/80">{tx.credit > 0 ? tx.credit.toLocaleString('pt-PT') : '-'}</td>
                        <td className="px-4 py-4 font-mono text-right font-bold text-slate-800 dark:text-slate-100">{tx.balance.toLocaleString('pt-PT')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

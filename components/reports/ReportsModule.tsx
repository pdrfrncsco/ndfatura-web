'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { SaftService } from '../../services/api';
import { 
  TrendingUp, 
  FileCode, 
  Download, 
  CheckCircle, 
  Sparkles, 
  Database, 
  BadgePercent,
  ChevronDown,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Cell
} from 'recharts';

export default function ReportsModule() {
  const { theme, currentTenant, addNotification } = useAuthStore();
  const { invoices, getDashboardStats } = useDataStore();

  const [saftYear, setSaftYear] = React.useState(2026);
  const [saftMonth, setSaftMonth] = React.useState(5);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportedDetails, setExportedDetails] = React.useState<any>(null);

  if (!currentTenant) return null;

  const stats = getDashboardStats(currentTenant.id);

  // Top clients calculator based on real invoices in store
  const clientsAggregation: Record<string, { total: number; count: number; nif: string }> = {};
  invoices
    .filter(i => i.tenantId === currentTenant.id && i.status !== 'Draft')
    .forEach(i => {
      if (!clientsAggregation[i.clientName]) {
        clientsAggregation[i.clientName] = { total: 0, count: 0, nif: i.clientNif };
      }
      clientsAggregation[i.clientName].total += i.grandTotal;
      clientsAggregation[i.clientName].count += 1;
    });

  const sortedTopClients = Object.keys(clientsAggregation)
    .map(name => ({
      name,
      total: clientsAggregation[name].total,
      count: clientsAggregation[name].count,
      nif: clientsAggregation[name].nif
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

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
            Relatórios e Auditoria Fiscal
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Descarregamento do ficheiro SAFT e estatísticas de vendas mensais conforme especificações da República de Angola.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: SAF-T exporter interface */}
        <div className={`p-5 rounded-xl border space-y-5 lg:col-span-1 ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 border-b pb-3 border-slate-900/10 dark:border-slate-850/45">
            <FileCode className="h-4.5 w-4.5 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Exportar Ficheiro SAF-T (AO)</h3>
          </div>

          <div className="space-y-3.5">
            <p className="text-slate-500 text-[11px] leading-relaxed">
              O ficheiro Standard Audit File for Tax Purposes - Angola (SAF-T AO) é gerado mensalmente e enviado ao portal fiscal para declaração de rendimentos e imposto de consumo.
            </p>

            {/* Select limits */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold font-sans">Ano Civil</label>
                <select
                  id="select-saft-year"
                  value={saftYear}
                  onChange={(e) => setSaftYear(Number(e.target.value))}
                  className={`w-full text-xs p-2 border rounded-lg font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-205 text-slate-800'
                  }`}
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold font-sans">Período Mensal</label>
                <select
                  id="select-saft-month"
                  value={saftMonth}
                  onChange={(e) => setSaftMonth(Number(e.target.value))}
                  className={`w-full text-xs p-2 border rounded-lg font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-205 text-slate-800'
                  }`}
                >
                  <option value={1}>01 - Janeiro</option>
                  <option value={2}>02 - Fevereiro</option>
                  <option value={3}>03 - Março</option>
                  <option value={4}>04 - Abril</option>
                  <option value={5}>05 - Maio</option>
                  <option value={6}>06 - Junho</option>
                </select>
              </div>
            </div>

            {/* Generator Action */}
            <button
              id="btn-process-saft-xml"
              onClick={handleExportSaft}
              disabled={isExporting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-transform select-none font-sans disabled:opacity-45"
            >
              {isExporting ? (
                <>
                  <Database className="h-4 w-4 animate-spin text-white" />
                  <span>A processar XML...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Validar e Exportar SAF-T</span>
                </>
              )}
            </button>

            {/* Export outcomes schema inspect */}
            {exportedDetails && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex gap-2 items-center text-emerald-500 font-semibold text-[10.5px]">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Schema Integrado (Código XML 1.01_01)</span>
                </div>
                <div className="text-[9px] font-mono whitespace-nowrap overflow-x-auto text-slate-500">
                  <p>FICHEIRO: {exportedDetails.filename}</p>
                </div>
                <textarea
                  id="saft-schema-viewer"
                  readOnly
                  rows={4}
                  value={exportedDetails.xml}
                  className="w-full text-[8.5px] font-mono p-2 bg-slate-950 text-emerald-400 select-all border border-slate-800 rounded focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right analytics charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top customer leaderboard panel */}
          <div className={`p-5 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 font-sans">Tabela de Clientes Líderes em Facturação (Kz)</h3>
            
            <div className="space-y-2">
              {sortedTopClients.length === 0 ? (
                <p className="text-center py-6 text-slate-500">Nenhum faturamento registado para consolidar na tabela.</p>
              ) : (
                sortedTopClients.map((c, idx) => (
                  <div key={c.name} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900/20 border border-slate-900/5 dark:border-slate-900/30">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap block truncate max-w-sm">{c.name}</span>
                        <span className="text-[9.5px] text-slate-400 font-mono mt-0.5">NIF: {c.nif} | {c.count} Faturas</span>
                      </div>
                    </div>

                    <strong className="font-mono text-xs text-slate-800 dark:text-slate-100 font-bold">
                      {c.total.toLocaleString('pt-PT')} AOA
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bar Chart of Taxes grouped */}
          <div className={`p-5 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5 font-sans">Arrecadação de IVA Colectado por Período</h3>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} />
                  <XAxis dataKey="month" tick={{ fill: chartThemeColors.axisColor, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartThemeColors.axisColor, fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#090d16' : '#ffffff',
                      borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                      color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value) => [`${Number(value).toLocaleString('pt-PT')} AOA`, "IVA Colectado"]}
                  />
                  <Bar dataKey="tax" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {stats.monthlyRevenue.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 4 ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

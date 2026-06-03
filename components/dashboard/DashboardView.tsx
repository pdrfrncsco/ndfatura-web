'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  AlertCircle, 
  CheckCircle, 
  ShieldAlert, 
  ArrowRight,
  Database,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function DashboardView() {
  const { currentTenant, theme, setCurrentScreen } = useAuthStore();
  const { getDashboardStats } = useDataStore();

  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate real database fetching delay for smooth loader experience
    const timer = setTimeout(() => setIsLoading(false), 450);
    return () => clearTimeout(timer);
  }, [currentTenant]);

  if (isLoading || !currentTenant) {
    return (
      <div className="space-y-6 w-full animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-300 dark:bg-slate-800 rounded-md" />
            <div className="h-3 w-72 bg-slate-200 dark:bg-slate-900 rounded-md" />
          </div>
          <div className="h-9 w-32 bg-slate-300 dark:bg-slate-800 rounded-md" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-900 rounded-xl border border-slate-900/10 dark:border-slate-800/40" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-900 rounded-xl border border-slate-900/10 dark:border-slate-800/40" />
          <div className="h-80 bg-slate-200 dark:bg-slate-900 rounded-xl border border-slate-900/10 dark:border-slate-800/40" />
        </div>
      </div>
    );
  }

  const stats = getDashboardStats(currentTenant.id);

  // Format currencies beautifully in Kwanza (AOA)
  const formatKwanza = (v: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(v);
  };

  const chartThemeColors = {
    gradientStart: theme === 'dark' ? '#1d4ed8' : '#3b82f6',
    gradientEnd: theme === 'dark' ? '#0f172a' : '#eff6ff',
    gridColor: theme === 'dark' ? '#1e293b' : '#f1f5f9',
    axisColor: theme === 'dark' ? '#94a3b8' : '#64748b',
    projected: '#3b82f6',
    realized: '#10b981'
  };

  const pieColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* 1. Header Hero section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight">
            Dashboard Executivo
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Visão geral da facturação e KPIs corporativos para <strong className="font-semibold">{currentTenant.name}</strong>.
          </p>
        </div>
        
        <button
          id="btn-quick-new-invoice"
          onClick={() => setCurrentScreen('invoices')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:transform hover:scale-101 transition-all text-white text-xs font-semibold rounded-lg shadow-sm font-sans"
        >
          <FileText className="h-4 w-4" />
          <span>Emitir Nova Factura</span>
        </button>
      </div>

      {/* 2. KPIs List grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Facturação Bruta */}
        <div id="kpi-gross-billing" className={`p-6 rounded-xl border transition-all ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-xs font-medium">Facturado Emitido (Ilíquido)</span>
            <div className="p-1 px-1.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded">
              AOA
            </div>
          </div>
          <div className="mt-4 font-sans font-bold text-lg sm:text-xl truncate">
            {formatKwanza(stats.totalInvoiced)}
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1.5 text-blue-500 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>Facturações Activas</span>
          </div>
        </div>

        {/* KPI 2: Valor Recebido */}
        <div id="kpi-revenue-collected" className={`p-6 rounded-xl border transition-all ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-xs font-medium">Tesouraria Recebida</span>
            <div className="p-1 px-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded">
              FR / VD
            </div>
          </div>
          <div className="mt-4 font-sans font-bold text-lg sm:text-xl truncate text-emerald-500">
            {formatKwanza(stats.revenueCollected)}
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1 text-emerald-500 font-medium">
            <CheckCircle className="h-3 w-3" />
            <span>Liquidado {stats.paidCount} Transacções</span>
          </div>
        </div>

        {/* KPI 3: Isenções de IVA / Retenções */}
        <div id="kpi-withholding" className={`p-6 rounded-xl border transition-all ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-xs font-medium">Retenções de Imposto (6,5%)</span>
            <div className="p-1 px-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded">
              Fis.
            </div>
          </div>
          <div className="mt-4 font-sans font-bold text-lg sm:text-xl truncate">
            {formatKwanza(stats.withholdingCollected)}
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1 text-slate-500">
            <span>IVA Retido na fonte por clientes</span>
          </div>
        </div>

        {/* KPI 4: Taxas de Sincronização AGT */}
        <div id="kpi-sync-rate" className={`p-6 rounded-xl border transition-all ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-xs font-medium">Rácio de Sincronização AGT</span>
            <div className="p-1 px-1.5 bg-indigo-500/10 text-indigo-500 text-[10px] font-bold rounded">
              AGT
            </div>
          </div>
          <div className="mt-3.5 flex items-baseline gap-2">
            <span className="font-sans font-bold text-2xl tracking-tight text-blue-400">
              {stats.syncSuccessRate}%
            </span>
            <span className="text-[10px] font-mono text-slate-500">Sincronizado</span>
          </div>
          <div className="mt-2 text-[10px] flex items-center gap-1 text-emerald-500 font-semibold leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Webservice online (Código 200)</span>
          </div>
        </div>
      </div>

      {/* 3. BI Visual Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left curve graph: Revenue trend */}
        <div className={`col-span-1 lg:col-span-2 p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold font-sans">Evolução de Facturação do Semestre</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Metas comparadas (líquidas de IVA) em AOA</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-blue-500">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Valor Total
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartThemeColors.gradientStart} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={chartThemeColors.gradientStart} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartThemeColors.gridColor} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartThemeColors.axisColor, fontSize: 10, fontFamily: 'monospace' }} 
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartThemeColors.axisColor, fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#090d16' : '#ffffff',
                    borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'sans-serif'
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString('pt-PT')} AOA`, "Facturação"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={theme === 'dark' ? '#3b82f6' : '#2563eb'} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right side donut chart: Categories sales */}
        <div className={`p-6 rounded-xl border ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        } flex flex-col justify-between`}>
          <div>
            <h3 className="text-sm font-bold font-sans">Vendas por Linhas de Negócio</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Participação no portfólio corporativo</p>
          </div>

          <div className="h-44 flex items-center justify-center py-4">
            <ResponsiveContainer width="100%" height="105%">
              <PieChart>
                <Pie
                  data={stats.categorySales}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.categorySales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#090d16' : '#ffffff',
                    borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value) => [`${Number(value).toLocaleString('pt-PT')} AOA`, "Receita"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Catalog keys */}
          <div className="space-y-1.5 text-xs text-slate-400">
            {stats.categorySales.map((cat, idx) => (
              <div key={cat.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                </div>
                <span className="font-mono text-[10px] text-right text-slate-500">{formatKwanza(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3.5 Projections vs Realized Chart */}
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-bold font-sans">Projecção de Recebimentos vs Realizado</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Fluxo de caixa previsto (Due Dates) vs Pagamentos confirmados</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase">
            <span className="flex items-center gap-1.5 text-blue-500">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Previsto
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Realizado
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.projectionsRealized} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartThemeColors.gridColor} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: chartThemeColors.axisColor, fontSize: 10, fontFamily: 'monospace' }} 
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: chartThemeColors.axisColor, fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#090d16' : '#ffffff',
                  borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value) => [`${Number(value).toLocaleString('pt-PT')} AOA`]}
              />
              <Legend verticalAlign="top" height={36} align="right" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              <Bar name="Previsto" dataKey="projected" fill={chartThemeColors.projected} radius={[4, 4, 0, 0]} barSize={32} />
              <Bar name="Realizado" dataKey="realized" fill={chartThemeColors.realized} radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Bottom grid: Recent compliance audit logs */}
      <div className={`p-6 rounded-xl border ${
        theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold font-sans">Logs Recentes de Auditoria Tributária</h3>
          </div>
          <button
            id="btn-all-audit-logs"
            onClick={() => setCurrentScreen('audit_logs')}
            className="text-[11px] text-blue-500 hover:text-blue-600 flex items-center gap-1 font-semibold"
          >
            <span>Ver Registo Completo</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-slate-900 text-slate-500' : 'border-slate-100 text-slate-600'} pb-2 font-semibold`}>
                <th className="py-2.5 font-sans">Carimbo de Data/Hora</th>
                <th className="py-2.5 font-sans">Operador</th>
                <th className="py-2.5 font-sans">Operação</th>
                <th className="py-2.5 font-sans">Descrição do Evento</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-500">Nenhum log gravado neste período.</td>
                </tr>
              ) : (
                stats.recentActivity.slice(0, 4).map((log) => (
                  <tr key={log.id} className={`border-b ${theme === 'dark' ? 'border-slate-900/40' : 'border-slate-100/50'} last:border-0 hover:bg-slate-300/5`}>
                    <td className="py-3 font-mono text-[10.5px] whitespace-nowrap text-slate-500">{log.timestamp}</td>
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">{log.userName}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        log.action === 'SYNC_AGT' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                          : log.action.includes('CREATE') 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/15'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 font-sans truncate max-w-sm text-slate-700 dark:text-slate-400">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

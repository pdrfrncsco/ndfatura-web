'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { History, Search, Filter, ShieldCheck } from 'lucide-react';

export default function AuditLogsView() {
  const { theme, currentTenant } = useAuthStore();
  const { auditLogs } = useDataStore();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 8;

  if (!currentTenant) return null;

  const tenantLogs = auditLogs.filter(log => log.tenantId === currentTenant.id);
  const uniqueActions = Array.from(new Set(tenantLogs.map(log => log.action)));

  const filteredLogs = tenantLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.ipAddress.includes(searchTerm);
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-blue-500" />
            Registo de Logs de Auditoria
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Acompanhamento histórico irrefutável de transações do ERP e controle fiscal em tempo real de operadores.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className={`p-4 rounded-xl border ${
        theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
      } flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="search-audits-input"
            type="text"
            placeholder="Pesquisar por Operador, Descrição, IP..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' 
                : 'bg-slate-50 border-slate-202 text-slate-800'
            } focus:outline-none transition-colors`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto self-end">
          <span className="text-[10px] text-slate-500 font-semibold uppercase whitespace-nowrap">Acção:</span>
          <select
            id="filter-action-select"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className={`text-[11px] font-semibold border rounded-lg p-1.5 w-48 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-202 text-slate-800'
            }`}
          >
            <option value="ALL">Todas as acções</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table grid */}
      <div className={`border rounded-xl spill-table overflow-hidden ${
        theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400">
            <thead>
              <tr className={`border-b ${theme === 'dark' ? 'border-slate-900 bg-slate-900/30' : 'border-slate-202 bg-slate-50'} font-semibold text-slate-500`}>
                <th className="p-3.5 w-44">Timestamp</th>
                <th className="p-3.5">Nome / Operador</th>
                <th className="p-3.5">Acção</th>
                <th className="p-3.5">Descrição Histórica do Evento</th>
                <th className="p-3.5 font-mono text-center">Endereço IP</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">Nenhum log gravado neste período coordenando essa busca.</td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id} className={`border-b last:border-0 hover:bg-slate-300/5 ${theme === 'dark' ? 'border-slate-900' : 'border-slate-100'}`}>
                    <td className="p-3.5 font-mono text-[10.5px] whitespace-nowrap text-slate-500">{log.timestamp}</td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{log.userName}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        log.action === 'SYNC_AGT' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                          : log.action.includes('ADD') || log.action.includes('UPLOAD') || log.action.includes('CREATE')
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/15'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 leading-relaxed text-slate-700 dark:text-slate-400">{log.details}</td>
                    <td className="p-3.5 font-mono text-[10.5px] text-center text-slate-500 whitespace-nowrap">{log.ipAddress}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-900/10 dark:border-slate-900 flex items-center justify-between text-xs">
            <span className="text-slate-505">A mostrar página <strong className="font-bold">{currentPage}</strong> de {totalPages} ({filteredLogs.length} logs)</span>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-audits-prev-page"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="p-1 px-2 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                id="btn-audits-next-page"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-1 px-2 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-900 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

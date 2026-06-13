'use client';

import * as React from 'react';
import { Award, Loader2, RefreshCcw, Search, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react';
import { UserService } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { TenantMember, UserRole } from '../../types/invoice';

const roleLabels: Record<string, { label: string; badge: string; desc: string }> = {
  Admin: {
    label: 'Administrador ERP',
    badge: 'bg-red-500/10 text-red-500 border-red-500/15',
    desc: 'Privilégios completos de sistema, upload de certificados AGT e gestão SaaS.',
  },
  Financial_Director: {
    label: 'Director Financeiro',
    badge: 'bg-indigo-500/10 text-blue-400 border-indigo-500/15',
    desc: 'Liquidação de propostas, emissão de guias de retenção e exportação de SAF-T.',
  },
  Billing_Clerk: {
    label: 'Técnico de Facturação',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/15',
    desc: 'Processamento de facturas e cadastro operacional de clientes e produtos.',
  },
  Auditor: {
    label: 'Auditor Fiscal AGT',
    badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/15',
    desc: 'Acesso de leitura para auditoria, rastreabilidade e ficheiros SAF-T XML.',
  },
};

const roleOptions: UserRole[] = ['Admin', 'Financial_Director', 'Billing_Clerk', 'Auditor'];

function initials(name: string) {
  const value = name || 'ND';
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function roleConfig(role: string) {
  return roleLabels[role] || { label: role, badge: 'bg-slate-500/10 text-slate-400 border-slate-500/15', desc: '' };
}

export default function UsersModule() {
  const { theme, currentTenant, addNotification } = useAuthStore();
  const [tenantUsers, setTenantUsers] = React.useState<TenantMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const loadUsers = React.useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    setError(null);

    try {
      const members = await UserService.getTenantMembers();
      setTenantUsers(members);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os utilizadores.';
      setError(message);
      addNotification({ title: 'Erro de Utilizadores', desc: message, type: 'warning' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addNotification]);

  React.useEffect(() => {
    if (currentTenant) {
      loadUsers();
    }
  }, [currentTenant, loadUsers]);

  if (!currentTenant) return null;

  const filteredUsers = tenantUsers.filter((member) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      roleConfig(member.role).label.toLowerCase().includes(term)
    );
  });

  const activeCount = tenantUsers.filter((member) => member.isActive).length;
  const suspendedCount = tenantUsers.length - activeCount;

  const updateMember = async (member: TenantMember, data: { isActive?: boolean; role?: UserRole }) => {
    setUpdatingId(member.id);
    try {
      const updated = await UserService.updateTenantMember(member.id, data);
      setTenantUsers((users) => users.map((user) => (user.id === updated.id ? updated : user)));
      addNotification({
        title: 'Utilizador actualizado',
        desc: `${updated.name} foi actualizado com sucesso.`,
        type: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível actualizar o utilizador.';
      addNotification({ title: 'Falha na Actualização', desc: message, type: 'warning' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = (member: TenantMember) => {
    if (member.isSelf && member.isActive) {
      addNotification({
        title: 'Operação bloqueada',
        desc: 'Não é possível suspender o próprio utilizador activo.',
        type: 'warning',
      });
      return;
    }
    updateMember(member, { isActive: !member.isActive });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <ShieldCheck className="h-6 w-6 text-blue-500" />
            Operadores e Permissões
          </h1>
          <p className={`mt-0.5 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Credenciais de acesso da empresa <strong className="font-semibold">{currentTenant.name}</strong>.
          </p>
        </div>
        <button
          onClick={() => loadUsers('refresh')}
          disabled={isRefreshing || isLoading}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
            theme === 'dark' ? 'border-slate-800 bg-slate-950 hover:bg-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard theme={theme} label="Utilizadores" value={String(tenantUsers.length)} tone="blue" />
        <SummaryCard theme={theme} label="Activos" value={String(activeCount)} tone="emerald" />
        <SummaryCard theme={theme} label="Suspensos" value={String(suspendedCount)} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`overflow-hidden rounded-xl border lg:col-span-2 ${theme === 'dark' ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
          <div className="flex flex-col gap-3 border-b p-4 dark:border-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Utilizadores do tenant</span>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar utilizador..."
                className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 ${
                  theme === 'dark' ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-slate-50'
                }`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50/40 font-semibold text-slate-500 dark:border-slate-900 dark:bg-slate-900/20">
                  <th className="p-3.5">Nome / Operador</th>
                  <th className="p-3.5">Perfil</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 text-center">Controlo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-500">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      A carregar utilizadores...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-amber-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-500">
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((member) => {
                    const cfg = roleConfig(member.role);
                    const isUpdating = updatingId === member.id;
                    return (
                      <tr key={member.id} className="border-b last:border-0 hover:bg-slate-300/5 dark:border-slate-900">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                              {initials(member.name)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {member.name || member.email}
                                {member.isSelf && <span className="ml-2 text-[10px] font-semibold text-blue-500">Você</span>}
                              </p>
                              <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-2">
                            <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            <select
                              value={member.role}
                              disabled={isUpdating}
                              onChange={(event) => updateMember(member, { role: event.target.value as UserRole })}
                              className={`block w-full max-w-[220px] rounded-md border px-2 py-1.5 text-[11px] outline-none disabled:opacity-50 ${
                                theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {roleConfig(role).label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="ml-1.5 text-[11px] text-slate-500">
                            {member.isActive ? 'Ativo' : 'Suspenso'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            id={`btn-toggle-operator-${member.id}`}
                            onClick={() => handleToggleStatus(member)}
                            disabled={isUpdating || (member.isSelf && member.isActive)}
                            className={`rounded px-2 py-1 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                              member.isActive
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                            }`}
                          >
                            {isUpdating ? 'A gravar...' : member.isActive ? 'Suspender' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`space-y-4 rounded-xl border p-5 ${theme === 'dark' ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dicionário de Perfis</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {Object.entries(roleLabels).map(([key, role]) => (
                <div key={key} className="space-y-1.5 rounded-lg border border-slate-900/5 bg-slate-50 p-3 dark:border-slate-900/40 dark:bg-slate-900/30">
                  <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold ${role.badge}`}>
                    {role.label}
                  </span>
                  <p className="text-[11px] leading-snug text-slate-500">{role.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`flex items-start gap-2.5 rounded-xl border border-yellow-500/15 p-4 text-xs ${theme === 'dark' ? 'bg-yellow-500/5' : 'bg-yellow-50/50'}`}>
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
            <div>
              <h4 className="font-bold text-yellow-500">Aviso Tributário AGT</h4>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
                Cada operador que assina facturas ou exporta SAF-T fica registado de forma irrevogável nos registos de auditoria.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ theme, label, value, tone }: { theme: 'light' | 'dark'; label: string; value: string; tone: 'blue' | 'emerald' | 'red' }) {
  const toneClass = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    red: 'text-red-500',
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-900 bg-slate-950' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <UserCheck className={`h-4 w-4 ${toneClass}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

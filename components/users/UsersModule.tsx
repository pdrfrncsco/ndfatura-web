'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { ShieldCheck, UserCheck, Plus, ShieldAlert, Award, AlertCircle } from 'lucide-react';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended';
}

export default function UsersModule() {
  const { theme, currentTenant } = useAuthStore();
  const [tenantUsers, setTenantUsers] = React.useState<MockUser[]>([
    { id: 'u1', name: 'Eng. Manuel Bento', email: 'ndeasdigital@gmail.com', role: 'Admin', status: 'Active' },
    { id: 'u2', name: 'Dr. Afonso Henriques', email: 'a.henriques@ndfatura.ao', role: 'Financial_Director', status: 'Active' },
    { id: 'u3', name: 'Dra. Elsa Patrício', email: 'elsa.p@ndfatura.ao', role: 'Billing_Clerk', status: 'Active' },
    { id: 'u4', name: 'Insp. Carlos Neves (AGT)', email: 'carlos.neves@minfin.gov.ao', role: 'Auditor', status: 'Active' }
  ]);

  if (!currentTenant) return null;

  const handleToggleStatus = (id: string) => {
    setTenantUsers(tenantUsers.map(u => {
      if (u.id === id) {
        if (u.id === 'u1') {
          alert('Alerta: Não é possível suspender o próprio utilizador administrador ativo.');
          return u;
        }
        return {
          ...u,
          status: u.status === 'Active' ? 'Suspended' : 'Active'
        };
      }
      return u;
    }));
  };

  const roleLabels: Record<string, { label: string; badge: string; desc: string }> = {
    Admin: { 
      label: 'Administrador ERP', 
      badge: 'bg-red-500/10 text-red-500 border-red-500/15',
      desc: 'Privilégios completos de sistema, upload de certificados AGT e gestão SaaS.' 
    },
    Financial_Director: { 
      label: 'Director Financeiro', 
      badge: 'bg-indigo-500/10 text-blue-400 border-indigo-500/15',
      desc: 'Liquidamento de propostas (FR), emissão de guias de retenção e exportação de SAF-T.' 
    },
    Billing_Clerk: { 
      label: 'Técnico de Facturação', 
      badge: 'bg-blue-500/10 text-blue-500 border-blue-500/15',
      desc: 'Processamento básico de faturas (Draft/Issued) e cadastro de clientes e produtos.' 
    },
    Auditor: { 
      label: 'Auditor Fiscal AGT', 
      badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/15',
      desc: 'Acesso exclusivo de leitura para auditorias, descarregamento de ficheiros SAF-T XML.' 
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-500" />
            Operadores e Permissões
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Regule as credenciais de acesso para a gestão colaborativa da empresa <strong className="font-semibold">{currentTenant.name}</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Table representation */}
        <div className={`lg:col-span-2 border rounded-xl overflow-hidden ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
        }`}>
          <div className="p-4 border-b flex justify-between items-center bg-slate-100/30 dark:bg-slate-900/10">
            <span className="font-bold text-xs uppercase text-slate-400">Utilizadores Conectados</span>
            <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-bold">
              Ativo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-500 font-semibold bg-slate-50/20">
                  <th className="p-3.5">Nome / Operador</th>
                  <th className="p-3.5">Contacto / Cargo</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 text-center">Controlo</th>
                </tr>
              </thead>
              <tbody>
                {tenantUsers.map((u) => {
                  const roleCfg = roleLabels[u.role] || { label: u.role, badge: 'bg-slate-500/10 text-slate-400', desc: '' };
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-300/5">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-blue-500 text-white font-sans font-semibold flex items-center justify-center">
                            {u.name.substring(5, 7).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{u.name}</p>
                            <p className="text-[10.5px] text-slate-400 mt-0.5 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold border ${roleCfg.badge}`}>
                          {roleCfg.label}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`h-2 w-2 rounded-full inline-block ${
                          u.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        <span className="text-[11px] text-slate-500 ml-1.5 font-sans">
                          {u.status === 'Active' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          id={`btn-toggle-operator-${u.id}`}
                          onClick={() => handleToggleStatus(u.id)}
                          className={`p-1 px-2 text-[10px] font-bold rounded transition-colors ${
                            u.status === 'Active' 
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {u.status === 'Active' ? 'Suspender' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roles details bar */}
        <div className="space-y-4">
          <div className={`p-5 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'
          } space-y-4`}>
            <div className="flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dicionário de Perfis</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {Object.keys(roleLabels).map((key) => {
                const r = roleLabels[key];
                return (
                  <div key={key} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 space-y-1.5 border border-slate-900/5 dark:border-slate-900/40">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border inline-block ${r.badge}`}>
                      {r.label}
                    </span>
                    <p className="text-[11px] text-slate-500 leading-snug">{r.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`p-4 rounded-xl border border-yellow-500/15 ${
            theme === 'dark' ? 'bg-yellow-500/5' : 'bg-yellow-50/50'
          } flex gap-2.5 items-start text-xs`}>
            <ShieldAlert className="h-4.5 w-4.5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-yellow-500">Aviso Tributário AGT</h4>
              <p className="text-slate-500 text-[10.5px] mt-0.5 leading-relaxed">
                Cada operador que assina faturas ou exporta o SAF-T fica registado de forma irrevogável no ficheiro XML de auditoria segundo as diretivas do Ministério das Finanças da República de Angola.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

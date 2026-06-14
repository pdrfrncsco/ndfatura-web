'use client';

import * as React from 'react';
import { 
  Building2, 
  CheckCircle2, 
  ChevronRight, 
  Package, 
  Users, 
  FileText, 
  ShieldCheck, 
  Rocket,
  MapPin,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';

interface WizardStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: WizardStep[] = [
  { 
    title: 'Dados Fiscais', 
    description: 'Confirme os dados da sua empresa para emissão fiscal.', 
    icon: Building2 
  },
  { 
    title: 'Filiais', 
    description: 'Configure a sua sede e pontos de venda.', 
    icon: MapPin 
  },
  { 
    title: 'Séries AGT', 
    description: 'Prepare as sequências de numeração autorizadas.', 
    icon: ShieldCheck 
  },
  { 
    title: 'Catálogo', 
    description: 'Registe o seu primeiro produto ou serviço.', 
    icon: Package 
  },
  { 
    title: 'Pronto a Faturar', 
    description: 'Tudo pronto para a sua primeira factura fiscal.', 
    icon: Rocket 
  },
];

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { currentTenant, updateTenantProfile, theme } = useAuthStore();
  const { clients, products, estabelecimentos, addProduct, addEstabelecimento, loadTenantData } = useDataStore();
  
  const [activeStep, setActiveStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  
  // Form States
  const [tenantForm, setTenantForm] = React.useState({
    name: currentTenant?.name || '',
    nif: currentTenant?.nif || '',
    address: currentTenant?.address || '',
    city: currentTenant?.city || '',
    fiscalRegime: currentTenant?.fiscalRegime || 'Regime Geral',
  });

  const [productForm, setProductForm] = React.useState({
    name: '',
    code: 'P001',
    price: 0,
    taxRate: 14,
    type: 'P' as 'P' | 'S',
  });

  const handleNext = async () => {
    if (activeStep === 0) {
      setLoading(true);
      try {
        await updateTenantProfile(tenantForm);
        setActiveStep(1);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else if (activeStep === 1) {
      if (estabelecimentos.length === 0) {
        setLoading(true);
        try {
          await addEstabelecimento({
            code: 'SEDE',
            name: 'Sede Principal',
            address: tenantForm.address,
            city: tenantForm.city,
            isActive: true
          });
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
      setActiveStep(2);
    } else if (activeStep === 3) {
      if (productForm.name) {
        setLoading(true);
        try {
          await addProduct({
            ...productForm,
            category: 'Geral',
            stock: 0,
            unit: 'UN',
            isActive: true,
            tenantId: currentTenant?.id || ''
          });
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
      setActiveStep(4);
    } else if (activeStep === steps.length - 1) {
      onComplete();
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(Math.max(0, activeStep - 1));
  };

  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${isDark ? 'bg-slate-950/90' : 'bg-slate-900/60'} backdrop-blur-sm animate-in fade-in duration-300`}>
      <div className={`w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col md:flex-row h-[600px]`}>
        
        {/* Sidebar Steps */}
        <aside className={`w-full md:w-72 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className="mb-8">
            <h2 className="text-xl font-black text-blue-600 italic tracking-tighter">FACTURYAN</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Configuração Inicial</p>
          </div>
          
          <nav className="space-y-4 flex-1">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === activeStep;
              const isDone = idx < activeStep;
              
              return (
                <div key={idx} className={`flex items-center gap-3 transition-colors ${isActive ? 'text-blue-500' : isDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    isActive ? 'border-blue-500 bg-blue-500/10' : 
                    isDone ? 'border-emerald-500 bg-emerald-500/10' : 
                    'border-slate-300 dark:border-slate-800'
                  }`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-xs font-bold leading-none mb-0.5">{step.title}</p>
                    <p className={`text-[10px] ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>Passo {idx + 1}</p>
                  </div>
                </div>
              );
            })}
          </nav>
          
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 hidden md:block">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Ambiente Certificado AGT</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col p-6 md:p-10">
          <header className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{steps[activeStep].title}</h3>
            <p className="text-slate-500 mt-1">{steps[activeStep].description}</p>
          </header>

          <div className="flex-1 overflow-y-auto pr-2">
            {activeStep === 0 && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2">
                <InputGroup label="Nome da Empresa">
                  <input 
                    className="input-field" 
                    value={tenantForm.name} 
                    onChange={e => setTenantForm({...tenantForm, name: e.target.value})}
                  />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="NIF">
                    <input 
                      className="input-field" 
                      value={tenantForm.nif}
                      onChange={e => setTenantForm({...tenantForm, nif: e.target.value})}
                    />
                  </InputGroup>
                  <InputGroup label="Regime Fiscal">
                    <select 
                      className="input-field"
                      value={tenantForm.fiscalRegime}
                      onChange={e => setTenantForm({...tenantForm, fiscalRegime: e.target.value})}
                    >
                      <option>Regime Geral</option>
                      <option>Regime de Exclusão</option>
                      <option>Regime Simplificado</option>
                    </select>
                  </InputGroup>
                </div>
                <InputGroup label="Endereço">
                  <input 
                    className="input-field" 
                    value={tenantForm.address}
                    onChange={e => setTenantForm({...tenantForm, address: e.target.value})}
                  />
                </InputGroup>
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2">
                <div className={`p-4 rounded-lg border flex items-center gap-4 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-600 font-bold">1</div>
                  <div>
                    <p className="text-sm font-bold">Filial SEDE automática</p>
                    <p className="text-xs text-slate-500">Iremos criar automaticamente a sua sede com o endereço configurado.</p>
                  </div>
                </div>
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500 italic">Poderá adicionar filiais adicionais (lojas, armazéns) no menu de Definições mais tarde.</p>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2">
                <div className={`p-6 rounded-xl border ${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                  <h4 className="font-bold text-indigo-600 mb-2">Comunicação AGT Automática</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    A FACTURYAN irá gerir as suas séries de facturação automaticamente. Ao emitir o primeiro documento, o sistema solicita à AGT o registo da série conforme o ano fiscal actual.
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                      Sequencial e contínuo por filial
                    </li>
                    <li className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                      Comunicação em tempo real
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2">
                <InputGroup label="Nome do Produto / Serviço">
                  <input 
                    placeholder="Ex: Consultoria Técnica ou Software Licença"
                    className="input-field"
                    value={productForm.name}
                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                  />
                </InputGroup>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Tipo">
                    <select 
                      className="input-field"
                      value={productForm.type}
                      onChange={e => setProductForm({...productForm, type: e.target.value as 'P' | 'S'})}
                    >
                      <option value="P">Produto (Bem)</option>
                      <option value="S">Serviço</option>
                    </select>
                  </InputGroup>
                  <InputGroup label="IVA (%)">
                    <select 
                      className="input-field"
                      value={productForm.taxRate}
                      onChange={e => setProductForm({...productForm, taxRate: Number(e.target.value)})}
                    >
                      <option value="14">14% - Taxa Geral</option>
                      <option value="7">7% - Simplificado</option>
                      <option value="5">5% - Regime Especial</option>
                      <option value="0">0% - Isento</option>
                    </select>
                  </InputGroup>
                </div>
                <InputGroup label="Preço Base (AOA)">
                  <input 
                    type="number"
                    className="input-field font-mono"
                    value={productForm.price || ''}
                    onChange={e => setProductForm({...productForm, price: Number(e.target.value)})}
                  />
                </InputGroup>
              </div>
            )}

            {activeStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center h-full animate-in zoom-in-95 duration-500">
                <div className="h-20 w-20 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-6">
                  <Rocket className="h-10 w-10" />
                </div>
                <h4 className="text-xl font-bold">Parabéns! Configuração Concluída.</h4>
                <p className="text-slate-500 mt-2 max-w-sm">
                  A sua empresa está devidamente configurada e pronta para emitir documentos fiscais certificados pela AGT.
                </p>
                
                <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                  <div className={`p-4 rounded-lg border text-left ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-xs font-bold uppercase text-slate-500 mb-1">Empresa</p>
                    <p className="text-sm font-semibold truncate">{tenantForm.name}</p>
                  </div>
                  <div className={`p-4 rounded-lg border text-left ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-xs font-bold uppercase text-slate-500 mb-1">NIF</p>
                    <p className="text-sm font-semibold">{tenantForm.nif}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button 
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition disabled:opacity-30 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            
            <button 
              onClick={handleNext}
              disabled={loading || (activeStep === 0 && !tenantForm.name) || (activeStep === 3 && !productForm.name)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'A processar...' : activeStep === steps.length - 1 ? 'Ir para o Dashboard' : 'Continuar'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </footer>
        </main>
      </div>
      
      <style jsx>{`
        .input-field {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid ${isDark ? '#1e293b' : '#e2e8f0'};
          background: ${isDark ? '#0f172a' : '#ffffff'};
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}

function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { FiscalConfigurationService, TenantService } from '../../services/api';
import { ElectronicBillingConfiguration, ElectronicBillingStatus } from '../../types/invoice';
import { 
  Settings, 
  Building, 
  Award, 
  ShieldCheck, 
  CheckCircle, 
  Upload, 
  AlertCircle,
  Plus,
  Trash2,
  Globe,
  DollarSign,
  Palette,
  Layout,
  RefreshCw
} from 'lucide-react';

export default function SettingsModule() {
  const { theme, currentTenant, updateTenantProfile, addNotification } = useAuthStore();
  const { 
    estabelecimentos, 
    exchangeRates, 
    addEstabelecimento, 
    addExchangeRate,
  } = useDataStore();

  const [activeTab, setActiveTab] = React.useState<'profile' | 'personalization' | 'branches' | 'security'>('profile');

  // Profile forms
  const [profileName, setProfileName] = React.useState(currentTenant?.name || '');
  const [profileNif, setProfileNif] = React.useState(currentTenant?.nif || '');
  const [profileAddress, setProfileAddress] = React.useState(currentTenant?.address || '');
  const [profileCity, setProfileCity] = React.useState(currentTenant?.city || 'Luanda');
  const [fiscalRegime, setFiscalRegime] = React.useState(currentTenant?.fiscalRegime || 'Regime Geral');
  const [agtCertificateNo, setAgtCertificateNo] = React.useState(currentTenant?.agtCertificateNo || '');
  
  // Personalization
  const [systemName, setSystemName] = React.useState(currentTenant?.systemName || 'FACTURYAN ERP');
  const [primaryColor, setPrimaryColor] = React.useState(currentTenant?.primaryColor || '#3b82f6');

  // Branch & Rate states
  const [newBranch, setNewBranch] = React.useState({ code: '', name: '', address: '', city: 'Luanda' });
  const [newRate, setNewRate] = React.useState({ currencyCode: 'USD', rate: 1000, date: new Date().toISOString().split('T')[0] });

  // UI state
  const [uploadedLogo, setUploadedLogo] = React.useState<string | null>(currentTenant?.logoUrl || null);
  const [fiscalConfig, setFiscalConfig] = React.useState<ElectronicBillingConfiguration | null>(null);
  const [isLoadingFiscalConfig, setIsLoadingFiscalConfig] = React.useState(false);
  const [isStartingActivation, setIsStartingActivation] = React.useState(false);
  const [certificatePassword, setCertificatePassword] = React.useState('');
  const [isUploadingCertificate, setIsUploadingCertificate] = React.useState(false);

  const loadFiscalConfig = React.useCallback(async () => {
    if (!currentTenant) return;
    setIsLoadingFiscalConfig(true);
    try {
      const status = await FiscalConfigurationService.getElectronicBillingStatus();
      setFiscalConfig(status);
    } catch {
      addNotification({
        title: 'Configuração AGT indisponível',
        desc: 'Não foi possível carregar o estado da faturação eletrónica.',
        type: 'warning',
      });
    } finally {
      setIsLoadingFiscalConfig(false);
    }
  }, [currentTenant, addNotification]);

  React.useEffect(() => {
    if (activeTab === 'security') {
      loadFiscalConfig();
    }
  }, [activeTab, loadFiscalConfig]);

  if (!currentTenant) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await updateTenantProfile({
            name: profileName,
            nif: profileNif,
            address: profileAddress,
            city: profileCity,
            fiscalRegime: fiscalRegime,
            agtCertificateNo: agtCertificateNo,
            systemName: systemName,
            primaryColor: primaryColor
        });
        addNotification({
            title: 'Configurações Gravadas',
            desc: 'O perfil e personalização foram sincronizados.',
            type: 'success'
        });
    } catch (err) {
        alert('Falha ao actualizar perfil.');
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await addEstabelecimento({
          ...newBranch,
          isActive: true
        });
        setNewBranch({ code: '', name: '', address: '', city: 'Luanda' });
        addNotification({ title: 'Filial Adicionada', desc: 'Nova unidade organizacional registada.', type: 'success' });
    } catch (err) {
        alert('Erro ao adicionar estabelecimento.');
    }
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await addExchangeRate(newRate);
        addNotification({ title: 'Taxa de Câmbio', desc: 'Novo câmbio registado para o dia.', type: 'success' });
    } catch (err) {
        alert('Erro ao registar taxa de câmbio.');
    }
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedLogo(url);
      // In a real app we would upload to backend and get a permanent URL
      addNotification({
        title: 'Logo Actualizado',
        desc: 'O logotipo corporativo será exibido em todos os documentos.',
        type: 'success'
      });
    }
  };

  const handleRotateKeys = async () => {
    if (!confirm('Atenção: A rotação das chaves afectará o encadeamento dos hashes. Proceder apenas se instruído pela AGT. Deseja continuar?')) return;
    try {
        await TenantService.rotateKeys(currentTenant.id);
        // Refresh session to get updated tenant profile
        await useAuthStore.getState().bootstrapSession();
        addNotification({
            title: 'Chaves Rotacionadas',
            desc: 'Um novo par de chaves RSA foi gerado com sucesso.',
            type: 'success'
        });
    } catch (err) {
        alert('Falha ao rotacionar chaves.');
    }
  };

  const handleStartElectronicBilling = async () => {
    setIsStartingActivation(true);
    try {
      const status = await FiscalConfigurationService.startElectronicBilling();
      setFiscalConfig(status);
      addNotification({
        title: 'Processo iniciado',
        desc: 'A ativação da faturação eletrónica foi registada.',
        type: 'success',
      });
    } catch {
      addNotification({
        title: 'Ativação não iniciada',
        desc: 'Verifique as permissões e os dados fiscais da empresa.',
        type: 'warning',
      });
    } finally {
      setIsStartingActivation(false);
    }
  };

  const handleFiscalCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingCertificate(true);
    try {
      const status = await FiscalConfigurationService.uploadCertificate(file, certificatePassword);
      setFiscalConfig(status);
      setCertificatePassword('');
      addNotification({
        title: 'Certificado validado',
        desc: 'O certificado fiscal foi carregado e associado à empresa.',
        type: 'success',
      });
    } catch (error) {
      addNotification({
        title: 'Certificado recusado',
        desc: error instanceof Error ? error.message : 'Verifique o ficheiro, a password e o NIF associado.',
        type: 'warning',
      });
    } finally {
      setIsUploadingCertificate(false);
    }
  };

  const fiscalStatusLabel: Record<ElectronicBillingStatus, string> = {
    NotStarted: 'Comunicação inativa',
    ActivationStarted: 'Ativação iniciada',
    CertificateMissing: 'Certificado pendente',
    CertificateInvalid: 'Certificado inválido',
    SeriesPending: 'Séries pendentes',
    Active: 'Comunicação ativa',
    Error: 'Erro de comunicação',
  };

  const fiscalStatusClass = (status?: ElectronicBillingStatus) => {
    if (status === 'Active') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (status === 'Error' || status === 'CertificateInvalid') return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    if (status === 'NotStarted') return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-500" />
            Configurações
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Administre os dados fiscais, identidade visual e unidades da sua organização.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto bg-slate-500/5 rounded-t-xl px-2">
        {[
          { id: 'profile', label: 'Fiscal e Perfil', icon: Building },
          { id: 'personalization', label: 'Marca e Logo', icon: Palette },
          { id: 'branches', label: 'Filiais e Câmbios', icon: Globe },
          { id: 'security', label: 'Certificados AGT', icon: ShieldCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-500 bg-white dark:bg-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className={`p-8 rounded-b-xl border border-t-0 space-y-8 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
            <div className="max-w-4xl space-y-6">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Dados do Contribuinte Angolano</h3>
                    <p className="text-[11px] text-slate-500">Estas informações serão impressas no cabeçalho de todos os documentos fiscais emitidos.</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 uppercase text-[10px]">Designação Social</label>
                            <input value={profileName} onChange={e => setProfileName(e.target.value)} className={`w-full p-2.5 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 uppercase text-[10px]">NIF (Número de Identificação Fiscal)</label>
                            <input value={profileNif} onChange={e => setProfileNif(e.target.value)} className={`w-full p-2.5 border rounded-lg font-mono ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="font-bold text-slate-500 uppercase text-[10px]">Morada de Sede</label>
                            <input value={profileAddress} onChange={e => setProfileAddress(e.target.value)} className={`w-full p-2.5 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 uppercase text-[10px]">Província / Cidade</label>
                            <input value={profileCity} onChange={e => setProfileCity(e.target.value)} className={`w-full p-2.5 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-500 uppercase text-[10px]">Regime de IVA</label>
                        <select value={fiscalRegime} onChange={e => setFiscalRegime(e.target.value)} className={`w-full p-2.5 border rounded-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'}`}>
                            <option value="Regime Geral">Regime Geral (IVA 14%)</option>
                            <option value="Regime Simplificado">Regime Simplificado (Art. 22-A)</option>
                            <option value="Regime de Exclusão">Regime de Exclusão (Isento)</option>
                        </select>
                    </div>

                    <div className="pt-6 border-t border-slate-900/10">
                        <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Guardar Dados Fiscais
                        </button>
                    </div>
                </form>
            </div>
          </div>
        )}

        {/* PERSONALIZATION TAB */}
        {activeTab === 'personalization' && (
          <div className={`p-8 rounded-b-xl border border-t-0 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Identidade Visual</h3>
                        <p className="text-[11px] text-slate-500">Personalize o ambiente de trabalho para alinhar com a marca da sua empresa.</p>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 uppercase text-[10px]">Nome Personalizado do Sistema</label>
                            <input 
                                value={systemName} 
                                onChange={e => setSystemName(e.target.value)} 
                                placeholder="Ex: PORTAL FINANCEIRO ACME"
                                className={`w-full p-2.5 border rounded-lg font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-slate-50 text-blue-600'}`} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-slate-500 uppercase text-[10px]">Cor de Destaque (Brand Color)</label>
                            <div className="flex gap-4 items-center p-3 border rounded-xl bg-slate-500/5">
                                <input 
                                    type="color" 
                                    value={primaryColor} 
                                    onChange={e => setPrimaryColor(e.target.value)} 
                                    className="h-12 w-12 rounded-lg cursor-pointer border-none bg-transparent" 
                                />
                                <div className="space-y-0.5">
                                    <span className="font-mono font-bold text-sm block uppercase">{primaryColor}</span>
                                    <span className="text-[9px] text-slate-400">Clique no quadrado para alterar a cor principal da interface.</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white font-bold rounded-lg transition-transform active:scale-95">
                            Aplicar Preferências Visuais
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Logotipo Institucional</h3>
                        <p className="text-[11px] text-slate-500">O logótipo será utilizado no canto superior das facturas e recibos PDF.</p>
                    </div>

                    <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl bg-slate-500/5 border-slate-500/20">
                        <div className="relative group">
                            <div className={`h-32 w-32 rounded-2xl border bg-white flex items-center justify-center shadow-sm overflow-hidden ${!uploadedLogo && 'p-8'}`}>
                                {uploadedLogo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={uploadedLogo} alt="Logo" className="h-full w-full object-contain" />
                                ) : (
                                    <Layout className="h-full w-full text-slate-200" />
                                )}
                            </div>
                            <button 
                                onClick={() => document.getElementById('logo-upload-input')?.click()}
                                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <input id="logo-upload-input" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <p className="mt-6 text-[10px] text-slate-400 text-center max-w-[200px]">Formatos aceites: PNG, JPG ou SVG. Tamanho máximo: 2MB.</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* BRANCHES & RATES TAB */}
        {activeTab === 'branches' && (
          <div className={`p-8 rounded-b-xl border border-t-0 space-y-10 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Branches List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Building className="h-4 w-4 text-emerald-500" /> Unidades e Filiais
                            </h3>
                            <p className="text-[11px] text-slate-500">Cada estabelecimento terá as suas séries fiscais independentes.</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddBranch} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-slate-500/5 p-5 rounded-2xl border border-slate-500/10">
                        <input placeholder="Cód (ex: LOJA01)" value={newBranch.code} onChange={e => setNewBranch({...newBranch, code: e.target.value.toUpperCase()})} className={`p-2.5 border rounded-xl font-mono font-bold text-blue-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white'}`} />
                        <input placeholder="Nome da Filial" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} className={`p-2.5 border rounded-xl sm:col-span-3 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white'}`} />
                        <button type="submit" className="bg-emerald-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                            <Plus className="h-4 w-4" /> Add
                        </button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {estabelecimentos.map(b => (
                            <div key={b.id} className="p-5 flex justify-between items-start border rounded-2xl hover:border-blue-500/30 transition-colors bg-slate-500/5">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 bg-blue-500 text-white rounded font-mono font-bold text-[10px] tracking-widest">{b.code}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{b.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <Globe className="h-3 w-3" />
                                        <span>{b.city}, Angola</span>
                                    </div>
                                </div>
                                <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500 cursor-pointer transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Daily Rates */}
                <div className="space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-amber-500" /> Câmbios do Dia
                        </h3>
                        <p className="text-[11px] text-slate-500">Taxas para conversão automática AOA.</p>
                    </div>

                    <form onSubmit={handleAddRate} className="space-y-3 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                        <div className="grid grid-cols-2 gap-2">
                            <select value={newRate.currencyCode} onChange={e => setNewRate({...newRate, currencyCode: e.target.value})} className={`p-2.5 border rounded-xl font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
                                <option value="USD">USD - Dólar</option>
                                <option value="EUR">EUR - Euro</option>
                            </select>
                            <input type="number" placeholder="Taxa" value={newRate.rate} onChange={e => setNewRate({...newRate, rate: Number(e.target.value)})} className={`p-2.5 border rounded-xl font-mono font-bold text-emerald-600 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white'}`} />
                        </div>
                        <button type="submit" className="w-full py-2.5 bg-amber-600 text-white font-bold rounded-xl shadow-lg hover:bg-amber-700 transition-colors">Registrar Câmbio</button>
                    </form>

                    <div className="space-y-2">
                        {exchangeRates.slice(0, 3).map(r => (
                            <div key={r.id} className="p-3 flex justify-between items-center bg-slate-500/5 rounded-xl border border-slate-500/10">
                                <span className="font-bold text-slate-600 dark:text-slate-300">{r.currencyCode}/AOA</span>
                                <span className="font-mono font-bold text-emerald-500">{r.rate.toLocaleString('pt-PT')}</span>
                                <span className="text-[9px] text-slate-400 font-mono">{new Date(r.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className={`p-8 rounded-b-xl border border-t-0 space-y-6 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Antes de avançar para a configuração da Fatura Eletrónica, confirme a ativação no portal da AGT e a disponibilidade das credenciais fiscais.</p>
                  <ul className="list-disc space-y-1 pl-5 text-xs">
                    <li>Faça a ativação da Fatura Eletrónica no portal da AGT.</li>
                    <li>Tenha o certificado e as chaves fiscais válidas para comunicação.</li>
                    <li>Sem esta configuração, a comunicação eletrónica não substitui as obrigações fiscais existentes.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                  Faturação Eletrónica AGT
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">Estado operacional da comunicação fiscal da empresa.</p>
              </div>
              <button
                type="button"
                onClick={loadFiscalConfig}
                disabled={isLoadingFiscalConfig}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-500/5 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFiscalConfig ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className={`min-h-[190px] rounded-lg border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'} overflow-hidden`}>
                <div className="border-b border-slate-200 bg-blue-500/10 px-5 py-4 text-center dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">1. Faturação Eletrónica</h4>
                  <p className="mt-1 text-xs text-slate-500">Iniciar ativação.</p>
                </div>
                <div className="flex flex-col items-center gap-4 p-6 text-center">
                  <p className="max-w-[320px] text-xs leading-6 text-slate-500">Inicie o processo para preparar a empresa para comunicação eletrónica com a AGT.</p>
                  <button
                    type="button"
                    onClick={handleStartElectronicBilling}
                    disabled={!fiscalConfig?.canStartActivation || isStartingActivation}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isStartingActivation ? 'A iniciar...' : 'Iniciar Processo'}
                  </button>
                </div>
              </div>

              <div className={`min-h-[190px] rounded-lg border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'} overflow-hidden ${!fiscalConfig?.canUploadCertificate && fiscalConfig?.status !== 'Active' ? 'opacity-60' : ''}`}>
                <div className="border-b border-slate-200 bg-blue-500/10 px-5 py-4 text-center dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">2. Configurar Certificado</h4>
                  <p className="mt-1 text-xs text-slate-500">Validação do certificado fiscal.</p>
                </div>
                <div className="space-y-4 p-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-blue-600">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>Certificado: {fiscalConfig?.certificate.exists ? fiscalConfig.certificate.serialNumber || 'sem número' : 'não carregado'}</p>
                    <p>Validade: {fiscalConfig?.certificate.expiresAt ? new Date(fiscalConfig.certificate.expiresAt).toLocaleDateString('pt-AO') : '-'}</p>
                  </div>
                  <div className="mx-auto w-full max-w-[260px] space-y-2">
                    <input
                      type="password"
                      value={certificatePassword}
                      onChange={(event) => setCertificatePassword(event.target.value)}
                      placeholder="Password do certificado"
                      disabled={!fiscalConfig?.canUploadCertificate || isUploadingCertificate}
                      className={`w-full rounded-md border px-3 py-2 text-xs outline-none ${theme === 'dark' ? 'border-slate-800 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                    />
                    <button
                      type="button"
                      disabled={!fiscalConfig?.canUploadCertificate || isUploadingCertificate}
                      onClick={() => document.getElementById('fiscal-certificate-input')?.click()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingCertificate ? 'A validar...' : 'Carregar Certificado'}
                    </button>
                    <input
                      id="fiscal-certificate-input"
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleFiscalCertificateUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className={`min-h-[190px] rounded-lg border ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'} overflow-hidden`}>
                <div className="border-b border-slate-200 bg-blue-500/10 px-5 py-4 text-center dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">Estado da Configuração</h4>
                  <p className="mt-1 text-xs text-slate-500">{fiscalConfig ? fiscalStatusLabel[fiscalConfig.status] : 'A carregar estado.'}</p>
                </div>
                <div className="space-y-4 p-6">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${fiscalStatusClass(fiscalConfig?.status)}`}>
                    {fiscalConfig ? fiscalStatusLabel[fiscalConfig.status] : 'A carregar'}
                  </span>
                  <div className="space-y-2 text-xs text-slate-500">
                    <p>Séries ativas: {fiscalConfig?.series.filter((item) => item.isActive).length ?? 0}</p>
                    <p>Último AGT: {fiscalConfig?.lastAgtSync?.responseCode || '-'}</p>
                    <p>Emissão fiscal: {fiscalConfig?.canIssueInvoices ? 'permitida' : 'bloqueada'}</p>
                  </div>
                </div>
              </div>
            </div>

            {fiscalConfig?.warnings?.length ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {fiscalConfig.warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Award className="h-4 w-4" />
                Homologação do Software
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">N.º de Homologação AGT</div>
                  <div className="mt-1 font-mono text-lg font-black text-blue-600">{currentTenant.agtCertificateNo || 'Por configurar'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Chave pública</div>
                  <div className="mt-1 break-all rounded-md bg-slate-900 p-3 font-mono text-[9px] leading-relaxed text-slate-400">
                    {currentTenant.softwarePublicKey || 'Chave pública ainda não disponível.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

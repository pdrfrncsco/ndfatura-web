'use client';

import * as React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Settings, Building, Award, ShieldCheck, CheckCircle, Upload, AlertCircle } from 'lucide-react';

export default function SettingsModule() {
  const { theme, currentTenant, updateTenantProfile, addNotification } = useAuthStore();

  // Profile forms - Initialized directly from currentTenant state
  const [profileName, setProfileName] = React.useState(currentTenant?.name || '');
  const [profileNif, setProfileNif] = React.useState(currentTenant?.nif || '');
  const [profileAddress, setProfileAddress] = React.useState(currentTenant?.address || '');
  const [profileCity, setProfileCity] = React.useState(currentTenant?.city || 'Luanda');
  const [fiscalRegime, setFiscalRegime] = React.useState(currentTenant?.fiscalRegime || 'Regime Geral');
  const [agtCertificateNo, setAgtCertificateNo] = React.useState(currentTenant?.agtCertificateNo || '241/AGT/2026');

  // Logo uploading simulation
  const [dragOver, setDragOver] = React.useState(false);
  const [uploadedLogo, setUploadedLogo] = React.useState<string | null>(null);

  if (!currentTenant) return null;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateTenantProfile({
      name: profileName,
      nif: profileNif,
      address: profileAddress,
      city: profileCity,
      fiscalRegime: fiscalRegime,
      agtCertificateNo: agtCertificateNo
    });

    addNotification({
      title: 'Configurações Gravadas',
      desc: 'O perfil fiscal da empresa foi sincronizado e atualizado.',
      type: 'success'
    });
    alert('Configurações actualizadas com sucesso no ERP.');
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedLogo(url);
      addNotification({
        title: 'Logo Corporativo',
        desc: 'Logotipo carregado com sucesso para visualização de facturas.',
        type: 'success'
      });
    }
  };

  return (
    <div className="space-y-6 text-xs">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-500" />
            Parâmetros do ERP e Configurações
          </h1>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Configure os enquadramentos fiscais, dados cadastrais e chaves de validação AGT da sua organização.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Fiscal Profile column */}
        <div className={`p-5 rounded-xl border lg:col-span-2 space-y-5 ${
          theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-2 border-b pb-3 border-slate-900/10 dark:border-slate-900/40">
            <Building className="h-4.5 w-4.5 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Contribuinte Angolano</h3>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            
            {/* Business name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 block">Razão Social Oficial (Empresa)</label>
              <input
                id="input-settings-name"
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={`w-full text-xs p-2.5 border rounded-lg ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {/* NIF & Regime */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* NIF */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Número de Identificação Fiscal (NIF)</label>
                <input
                  id="input-settings-nif"
                  type="text"
                  required
                  maxLength={9}
                  value={profileNif}
                  onChange={(e) => setProfileNif(e.target.value.replace(/\D/g, ''))}
                  className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-202 text-slate-800'
                  }`}
                />
              </div>

              {/* Fiscal Regime */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Enquadramento / Regime de IVA</label>
                <select
                  id="select-settings-regime"
                  value={fiscalRegime}
                  onChange={(e) => setFiscalRegime(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-202 text-slate-800'
                  }`}
                >
                  <option value="Regime Geral">Regime Geral (Exige IVA 14%)</option>
                  <option value="Regime Simplificado (Art. 22-A do IVA)">Regime Simplificado (Art. 22-A do IVA)</option>
                  <option value="Regime de Exclusão">Regime de Exclusão (Isento nos termos do Artigo 9º)</option>
                </select>
              </div>

            </div>

            {/* Address & City */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Address */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 block">Endereço de Sede / Escritórios</label>
                <input
                  id="input-settings-address"
                  type="text"
                  required
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border-slate-202 text-slate-800'
                  }`}
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">Sede Gubernamental</label>
                <input
                  id="input-settings-city"
                  type="text"
                  required
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-202 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Submitting button */}
            <div className="pt-4 border-t border-slate-900/10 dark:border-slate-900/40">
              <button
                id="btn-save-settings-profile"
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
              >
                Gravar Configurações Fiscais
              </button>
            </div>

          </form>
        </div>

        {/* AGT Validation configuration and Logos */}
        <div className="space-y-5">
          
          {/* Certificate management */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-900/10 dark:border-slate-900/40">
              <Award className="h-4.5 w-4.5 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Validação Software AGT</h3>
            </div>

            <div className="space-y-3 font-sans">
              <div className="space-y-1 text-xs">
                <label className="text-[10px] uppercase text-slate-500 font-bold block">Chave / Certificado de Assinatura n.º</label>
                <input
                  id="input-settings-certificate"
                  type="text"
                  required
                  value={agtCertificateNo}
                  onChange={(e) => setAgtCertificateNo(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-lg font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-202 text-slate-808'
                  }`}
                />
              </div>

              {/* Drag drop mock area */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold block">Upload Certificado Digital (.pfx / .pem)</label>
                <div
                  id="drag-drop-certified-container"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    addNotification({
                      title: 'Certificado Carregado',
                      desc: 'Chave de criptografia instalada para assinaturas digitais.',
                      type: 'success'
                    });
                  }}
                  className={`p-5 border-2 border-dashed rounded-lg text-center transition-all cursor-pointer ${
                    dragOver 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : (theme === 'dark' ? 'border-slate-800 bg-slate-900/30 text-slate-400' : 'border-slate-300 bg-slate-50 text-slate-500')
                  }`}
                >
                  <Upload className="h-7 w-7 text-blue-500 mx-auto opacity-50 mb-2.5" />
                  <span className="text-[10.5px] font-semibold block leading-tight">Escolher ou arrastar ficheiro .pfx</span>
                  <span className="text-[8px] text-slate-500 block mt-1">Chave privada com as credenciais municipais</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Upload area */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-100' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 border-b pb-3 border-slate-900/10 dark:border-slate-900/40">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Logotipo no Cabeçalho</h3>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-lg border border-dashed flex items-center justify-center font-bold text-slate-400 shrink-0 ${
                  theme === 'dark' ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50'
                }`}>
                  {uploadedLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={uploadedLogo} alt="Logotipo customizado" className="h-full w-full object-contain rounded-lg" />
                  ) : (
                    'LOGO'
                  )}
                </div>

                <div className="flex-1 space-y-1 text-xs">
                  <span className="font-semibold block leading-none">Actualizar Logotipo da Empresa</span>
                  <span className="text-[9.5px] text-slate-500 mt-1 block">Tamanho sugerido: 200x200px (PNG transparente)</span>
                  <input
                    id="input-logo-file-picker"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    id="btn-trigger-picker-click"
                    onClick={() => {
                      const el = document.getElementById('input-logo-file-picker');
                      if (el) el.click();
                    }}
                    type="button"
                    className="text-[9.5px] font-bold text-blue-500 hover:underline mt-1 block text-left"
                  >
                     Carregar do Computador
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

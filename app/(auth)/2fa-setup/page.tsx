'use client';

import * as React from 'react';
import { ShieldCheck, ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { AuthService } from '../../../services/api';
import { QRCodeSVG } from 'qrcode.react';

export default function TwoFactorSetupPage() {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'qr_ready' | 'verifying' | 'success' | 'error'>('idle');
  const [setupData, setSetupData] = React.useState<{ secret: string; qr_code_url: string } | null>(null);
  const [token, setToken] = React.useState('');
  const [error, setError] = React.useState('');

  const initSetup = async () => {
    setStatus('loading');
    setError('');
    try {
      const data = await AuthService.setup2FA();
      setSetupData(data);
      setStatus('qr_ready');
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.error || 'Erro ao iniciar configuração do 2FA.');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('verifying');
    setError('');
    try {
      await AuthService.verify2FA(token);
      setStatus('success');
    } catch (err: any) {
      setStatus('qr_ready');
      setError(err.response?.data?.error || 'Código inválido. Tente novamente.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">2FA Activado</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            A autenticação de dois factores foi configurada com sucesso. A sua conta está agora muito mais segura.
          </p>
        </div>
        <Link 
          href="/"
          className="w-full py-3 inline-flex bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl items-center justify-center transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
        >
          Voltar ao Painel
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl">
      <div className="border-b border-white/5 pb-4 mb-6">
        <h2 className="text-sm font-bold tracking-widest text-slate-300 uppercase flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-500" />
          Segurança Avançada (2FA)
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Proteja a sua conta corporativa exigindo um código adicional a cada início de sessão.
        </p>
      </div>

      {status === 'idle' || status === 'loading' || status === 'error' && !setupData ? (
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200 leading-relaxed">
              Recomendamos o uso de aplicações como <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
            </p>
          </div>
          
          <button
            onClick={initSetup}
            disabled={status === 'loading'}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] disabled:opacity-70"
          >
            {status === 'loading' ? 'A iniciar...' : 'Configurar 2FA Agora'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white p-4 rounded-xl mx-auto w-48 h-48 flex items-center justify-center shadow-inner">
            {setupData?.qr_code_url && (
              <QRCodeSVG value={setupData.qr_code_url} size={160} level="M" includeMargin={false} />
            )}
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código Manual</p>
            <p className="font-mono text-lg tracking-widest text-blue-400">{setupData?.secret}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block text-center">Insira o código gerado pela App</label>
            <input
              type="text"
              required
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-700"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'verifying' || token.length !== 6}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === 'verifying' ? 'A validar...' : 'Verificar e Activar'}
            {status !== 'verifying' && <ChevronRight className="h-4 w-4" />}
          </button>
        </form>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 text-center">
          {error}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Voltar ao Painel
        </Link>
      </div>
    </div>
  );
}

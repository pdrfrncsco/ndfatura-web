'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { Mail, Lock, ChevronRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const [email, setEmail] = React.useState('ndeasdigital@gmail.com');
  const [password, setPassword] = React.useState('admin12345');
  const [otp, setOtp] = React.useState('');
  
  const [loginError, setLoginError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [requires2FA, setRequires2FA] = React.useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await login(email, password, requires2FA ? otp : undefined);
      router.push('/');
    } catch (err: any) {
      if (err.response?.data?.['2fa_required']) {
        setRequires2FA(true);
        setLoginError('');
      } else if (err.response?.data?.otp) {
        setLoginError(err.response.data.otp);
      } else if (err.response?.data?.detail) {
        setLoginError(err.response.data.detail);
      } else {
        setLoginError('Credenciais inválidas ou API indisponível.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl">
      <div className="border-b border-white/5 pb-4 mb-6">
        <h2 className="text-sm font-bold tracking-widest text-slate-300 uppercase">
          {requires2FA ? 'Autenticação em 2 Passos' : 'Acesso Seguro'}
        </h2>
      </div>

      <form onSubmit={handleLoginSubmit} className="space-y-5">
        {!requires2FA ? (
          <>
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">Endereço de E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm placeholder:text-slate-600"
                  placeholder="nome@empresa.ao"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 block">Palavra-passe</label>
                <Link href="/forgot-password" className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Esqueceu a palavra-passe?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-200 leading-relaxed">
                Esta conta tem a autenticação de 2 factores (2FA) activada. Por favor, insira o código de 6 dígitos gerado pela sua aplicação de autenticação.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block">Código TOTP</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono placeholder:text-slate-700"
                placeholder="000000"
                autoFocus
              />
            </div>
            
            <button
              type="button"
              onClick={() => { setRequires2FA(false); setOtp(''); }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar e usar outra conta
            </button>
          </div>
        )}

        {/* Login submit */}
        <button
          type="submit"
          disabled={isLoggingIn}
          className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span>{isLoggingIn ? 'A validar...' : requires2FA ? 'Verificar e Entrar' : 'Entrar no Sistema'}</span>
          {!isLoggingIn && <ChevronRight className="h-4 w-4" />}
        </button>

        {loginError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 animate-in fade-in zoom-in-95">
            {loginError}
          </div>
        )}
      </form>
      
      {!requires2FA && (
        <div className="mt-6 text-center text-xs text-slate-400">
          Não tem uma conta corporativa?{' '}
          <Link href="/register" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">
            Solicitar acesso
          </Link>
        </div>
      )}
    </div>
  );
}

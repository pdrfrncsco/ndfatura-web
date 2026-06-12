'use client';

import * as React from 'react';
import { Lock, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { AuthService } from '../../../../../services/api';
import { useParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const params = useParams();
  const uidb64 = params.uid as string;
  const token = params.token as string;
  
  const [password, setPassword] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    
    try {
      await AuthService.confirmPasswordReset(uidb64, token, password);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Link expirado ou inválido. Solicite novamente.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Palavra-passe Alterada</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            A sua nova palavra-passe foi guardada com sucesso. Já pode aceder à plataforma com as novas credenciais.
          </p>
        </div>
        <Link 
          href="/login"
          className="w-full py-3 inline-flex bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl items-center justify-center transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
        >
          Aceder à Plataforma
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl">
      <div className="border-b border-white/5 pb-4 mb-6">
        <h2 className="text-sm font-bold tracking-widest text-slate-300 uppercase">
          Nova Palavra-passe
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Defina uma nova palavra-passe forte para proteger a sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 block">Nova Palavra-passe</label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm placeholder:text-slate-600"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span>{status === 'loading' ? 'A guardar...' : 'Redefinir Acesso'}</span>
          {status !== 'loading' && <ChevronRight className="h-4 w-4" />}
        </button>

        {status === 'error' && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs flex items-start gap-2 text-red-300 animate-in fade-in zoom-in-95">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <span>{message}</span>
          </div>
        )}
      </form>
    </div>
  );
}

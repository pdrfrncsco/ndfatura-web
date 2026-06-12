'use client';

import * as React from 'react';
import { Mail, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuthService } from '../../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    
    try {
      const res = await AuthService.requestPasswordReset(email);
      setStatus('success');
      setMessage(res.message || 'Instruções enviadas para o seu e-mail.');
    } catch (err: any) {
      setStatus('error');
      setMessage('Ocorreu um erro ao processar o pedido. Tente novamente.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-blue-500/20">
          <Mail className="w-8 h-8 text-blue-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">E-mail Enviado</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Se o endereço <strong>{email}</strong> estiver registado, receberá um link para redefinir a sua palavra-passe.
          </p>
        </div>
        <Link 
          href="/login"
          className="w-full py-3 inline-flex bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl items-center justify-center transition-all border border-white/10"
        >
          Voltar ao início de sessão
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl">
      <div className="border-b border-white/5 pb-4 mb-6">
        <h2 className="text-sm font-bold tracking-widest text-slate-300 uppercase">
          Recuperar Palavra-passe
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Insira o e-mail associado à sua conta. Enviaremos as instruções para redefinir o seu acesso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span>{status === 'loading' ? 'A enviar...' : 'Enviar Instruções'}</span>
          {status !== 'loading' && <ChevronRight className="h-4 w-4" />}
        </button>

        {status === 'error' && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 animate-in fade-in zoom-in-95">
            {message}
          </div>
        )}
      </form>
      
      <div className="mt-6 text-center">
        <Link href="/login" className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
          <ArrowLeft className="h-3 w-3" />
          Voltar ao início de sessão
        </Link>
      </div>
    </div>
  );
}

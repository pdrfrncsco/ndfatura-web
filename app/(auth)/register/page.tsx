'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AuthService } from '../../../services/api';

export default function RegisterPage() {
  const router = useRouter();
  
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [companyNif, setCompanyNif] = React.useState('');
  
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await AuthService.register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        company_name: companyName,
        company_nif: companyNif
      });
      setIsSuccess(true);
    } catch (err: any) {
      if (err.response?.data?.error) {
        // Handle array of messages or string
        const errMsg = err.response.data.error;
        setError(Array.isArray(errMsg) ? errMsg[0] : (typeof errMsg === 'object' ? Object.values(errMsg)[0] : errMsg));
      } else {
        setError('Ocorreu um erro ao criar a conta. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-[#0B1221]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
        <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Conta Criada com Sucesso</h2>
          <p className="text-xs text-slate-400">
            A sua conta foi registada. Já pode aceder ao sistema com as suas credenciais.
          </p>
        </div>
        <Link 
          href="/login"
          className="w-full py-3 inline-flex bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl items-center justify-center transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
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
          Criar Nova Conta
        </h2>
      </div>

      <form onSubmit={handleRegisterSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">Nome</label>
            <div className="relative group">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm placeholder:text-slate-600"
                placeholder="Ex: João"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">Apelido</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm placeholder:text-slate-600"
              placeholder="Ex: Silva"
            />
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">Nome da Empresa</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm placeholder:text-slate-600"
              placeholder="Ex: Facturyan Lda"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 block">NIF da Empresa</label>
            <input
              type="text"
              required
              value={companyNif}
              onChange={(e) => setCompanyNif(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm placeholder:text-slate-600"
              placeholder="Ex: 500000000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 block">Palavra-passe</label>
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
          disabled={isLoading}
          className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span>{isLoading ? 'A processar...' : 'Registar Conta'}</span>
          {!isLoading && <ChevronRight className="h-4 w-4" />}
        </button>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300 animate-in fade-in zoom-in-95">
            {error}
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

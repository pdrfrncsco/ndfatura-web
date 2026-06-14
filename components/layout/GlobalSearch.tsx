'use client';

import * as React from 'react';
import { 
  Search, 
  X, 
  Command, 
  User, 
  Package, 
  FileText, 
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useDataStore } from '../../stores/dataStore';
import { Client, Product, Invoice } from '../../types/invoice';

export function GlobalSearch() {
  const { theme, setCurrentScreen } = useAuthStore();
  const { clients, products, invoices } = useDataStore();
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredClients = query.length > 1 
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.nif.includes(query)).slice(0, 3)
    : [];

  const filteredProducts = query.length > 1 
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.code.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const filteredInvoices = query.length > 1 
    ? invoices.filter(i => (i.invoiceNo?.toLowerCase() || '').includes(query.toLowerCase()) || i.clientName.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  const totalResults = filteredClients.length + filteredProducts.length + filteredInvoices.length;

  const navigateTo = (screen: any) => {
    setCurrentScreen(screen);
    setIsOpen(false);
  };

  if (!isOpen) return (
    <button 
      onClick={() => setIsOpen(true)}
      className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all group"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="text-[11px] font-medium mr-4">Pesquisa inteligente...</span>
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[9px] font-bold">
        <Command className="h-2 w-2" />
        <span>K</span>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl overflow-hidden rounded-xl border shadow-2xl animate-in zoom-in-95 duration-200 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="relative flex items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="absolute left-6 h-5 w-5 text-blue-500" />
          <input
            ref={inputRef}
            placeholder="O que procura? (Facturas, Clientes, Produtos...)"
            className="w-full bg-transparent pl-10 pr-10 text-base outline-none text-slate-900 dark:text-slate-100"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute right-4 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length <= 1 ? (
            <div className="p-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 mb-3">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Comece a digitar para pesquisar...</p>
              <p className="text-xs text-slate-400 mt-1">Pesquise por nome, NIF, número de factura ou código de produto.</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-500">Nenhum resultado encontrado para "{query}"</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {filteredClients.length > 0 && (
                <section>
                  <h4 className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Clientes</h4>
                  <div className="mt-1 space-y-1">
                    {filteredClients.map(c => (
                      <SearchResultItem 
                        key={c.id} 
                        icon={User} 
                        title={c.name} 
                        subtitle={`NIF: ${c.nif}`} 
                        onClick={() => navigateTo('clients')} 
                        theme={theme}
                      />
                    ))}
                  </div>
                </section>
              )}

              {filteredProducts.length > 0 && (
                <section>
                  <h4 className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Produtos</h4>
                  <div className="mt-1 space-y-1">
                    {filteredProducts.map(p => (
                      <SearchResultItem 
                        key={p.id} 
                        icon={Package} 
                        title={p.name} 
                        subtitle={`Cód: ${p.code} | ${p.price.toLocaleString()} Kz`} 
                        onClick={() => navigateTo('products')} 
                        theme={theme}
                      />
                    ))}
                  </div>
                </section>
              )}

              {filteredInvoices.length > 0 && (
                <section>
                  <h4 className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Documentos Fiscais</h4>
                  <div className="mt-1 space-y-1">
                    {filteredInvoices.map(i => (
                      <SearchResultItem 
                        key={i.id} 
                        icon={FileText} 
                        title={i.invoiceNo || 'Proforma'} 
                        subtitle={`${i.clientName} | ${i.grandTotal.toLocaleString()} Kz`} 
                        onClick={() => navigateTo('invoices')} 
                        theme={theme}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-slate-200 dark:bg-slate-800">↵</kbd> para seleccionar</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-slate-200 dark:bg-slate-800">esc</kbd> para fechar</span>
          </div>
          <div className="font-semibold text-blue-500 italic">FACTURYAN AI SEARCH</div>
        </footer>
      </div>
    </div>
  );
}

function SearchResultItem({ icon: Icon, title, subtitle, onClick, theme }: { icon: any, title: string, subtitle: string, onClick: () => void, theme: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group ${
        theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-blue-50'
      }`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-400 group-hover:border-blue-500/50 group-hover:text-blue-400' : 'bg-white border-slate-200 text-slate-500 group-hover:border-blue-200 group-hover:text-blue-600'
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{title}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

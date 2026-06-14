'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Invoice, Tenant } from '../../../types/invoice';
import { InvoicePrintView } from '../../../components/invoices/InvoicePrintView';
import { Download, Printer, ShieldCheck, Landmark } from 'lucide-react';

export default function PublicInvoicePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [invoice, setInvoice] = React.useState<Invoice | null>(null);
  const [tenant, setTenant] = React.useState<Tenant | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchPublicInvoice = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/public/facturas/${token}/`);
        if (!response.ok) throw new Error('Factura não encontrada.');
        const data = await response.json();
        setInvoice(data);
        
        // Construct tenant object from the extra info
        if (data.empresa_details) {
          setTenant({
            id: '',
            name: data.empresa_details.name,
            nif: data.empresa_details.nif,
            address: data.empresa_details.address,
            city: data.empresa_details.city,
            country: 'Angola',
            fiscalRegime: 'Regime Geral',
            logoUrl: data.empresa_details.logo_url,
            agtCertificateNo: data.agt_response_code === 'Sync' ? '0000/AGT/2026' : undefined
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar documento.');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchPublicInvoice();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
    </div>
  );

  if (error || !invoice || !tenant) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
        <Landmark className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Documento Indisponível</h1>
      <p className="text-slate-500 mt-2 max-w-xs">{error || 'O link pode ter expirado ou estar incorrecto.'}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
      >
        Tentar Novamente
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      {/* Top Bar for Actions */}
      <nav className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs italic">FACT</div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-tight">Portal do Cliente</p>
              <p className="text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-none">{tenant.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-semibold transition-all"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold shadow-sm transition-all"
            >
              <Download className="h-4 w-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4">
        {/* Verification Banner */}
        {invoice.status === 'AGT_Synced' && (
          <div className="mb-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="h-10 w-10 shrink-0 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-800">Documento Fiscal Validado</h3>
              <p className="text-xs text-emerald-600 leading-relaxed">Este documento foi devidamente assinado e comunicado à AGT em {new Date(invoice.agtSyncDate!).toLocaleString('pt-AO')}.</p>
            </div>
          </div>
        )}

        {/* The Invoice View */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200 print:shadow-none print:border-0">
          <div className="p-8 print:p-0">
            <InvoicePrintView invoice={invoice} tenant={tenant} />
          </div>
        </div>

        {/* Public Payment Box */}
        {invoice.status !== 'Paid' && invoice.multicaixaReference && (
          <div className="mt-8 bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3 mb-6">
              <Landmark className="h-6 w-6" />
              <h3 className="text-lg font-bold tracking-tight">Pagar via Multicaixa Express</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100 mb-1">Entidade</p>
                <p className="text-2xl font-mono font-black">{invoice.multicaixaReference.entityCode}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100 mb-1">Referência</p>
                <p className="text-2xl font-mono font-black">
                  {invoice.multicaixaReference.referenceNumber?.match(/.{1,3}/g)?.join(' ') || invoice.multicaixaReference.referenceNumber}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100 mb-1">Montante</p>
                <p className="text-2xl font-mono font-black">
                  {invoice.grandTotal.toLocaleString('pt-AO')} <span className="text-sm font-bold">AOA</span>
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex items-start gap-3 text-xs text-blue-100/80 leading-relaxed">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <p>Após efectuar o pagamento no seu banco ou aplicativo Multicaixa Express, a factura será liquidada automaticamente e o recibo enviado para o seu e-mail.</p>
            </div>
          </div>
        )}
        
        {/* Footer info */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-400">Portal do Cliente providenciado por <strong className="text-blue-500">FACTURYAN</strong></p>
          <p className="text-[10px] text-slate-300 mt-1">© 2026 FACTURYAN - Todos os direitos reservados.</p>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          nav { display: none !important; }
          footer { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          .bg-slate-100 { background-color: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

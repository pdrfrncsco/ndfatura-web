'use client';

import * as React from 'react';
import { Invoice, Tenant, Estabelecimento } from '../../types/invoice';
import { Landmark, ShieldCheck, MapPin, Truck } from 'lucide-react';

interface InvoicePrintViewProps {
  invoice: Invoice | null;
  tenant: Tenant | null;
  branch?: Estabelecimento | null;
}

const money = (value: number, currency = 'AOA') =>
  `${value.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === 'AOA' ? 'Kz' : currency}`;

const dateLabel = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function InvoicePrintView({ invoice, tenant, branch }: InvoicePrintViewProps) {
  if (!invoice || !tenant) return null;

  // Find branch if not provided but exists in invoice
  const branchInfo = branch || null; 

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'FT': return 'FACTURA';
      case 'FR': return 'FACTURA-RECIBO';
      case 'NC': return 'NOTA DE CRÉDITO';
      case 'VD': return 'VENDA A DINHEIRO';
      case 'ND': return 'NOTA DE DÉBITO';
      case 'GR': return 'GUIA DE REMESSA';
      case 'PP': return 'PROFORMA';
      default: return type;
    }
  };

  return (
    <div className="bg-white p-0 font-sans text-slate-900" style={{ width: '100%', minHeight: '297mm', margin: '0 auto' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-10 border-b-4 border-slate-800 pb-8">
        <div className="w-1/2">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="h-20 mb-4 object-contain" />
          ) : (
            <div className="h-20 mb-4 flex items-center justify-center bg-slate-100 rounded border border-dashed border-slate-300 w-56 text-blue-600">
               <Landmark className="h-10 w-10 mr-2" />
               <span className="font-black text-2xl tracking-tighter italic">FACTURYAN</span>
            </div>
          )}
          <h1 className="text-xl font-black uppercase tracking-tight">{tenant.name}</h1>
          <div className="text-sm mt-2 text-slate-600 space-y-0.5">
            <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {tenant.address}</p>
            <p className="ml-5">{tenant.city}, Angola</p>
            <p className="mt-2 inline-block bg-slate-900 text-white px-3 py-1 font-bold rounded-sm">NIF: {tenant.nif}</p>
          </div>
          {branchInfo && (
            <div className="mt-4 pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Filial / Local de Emissão</p>
              <p className="text-xs font-bold text-slate-700 uppercase">{branchInfo.name} ({branchInfo.code})</p>
              <p className="text-[10px] text-slate-500 italic">{branchInfo.address}</p>
            </div>
          )}
        </div>

        <div className="text-right w-1/2">
          <div className="inline-block bg-blue-600 text-white px-6 py-2 rounded-bl-3xl rounded-tr-lg mb-2">
             <h2 className="text-2xl font-black tracking-tighter">{getDocTypeLabel(invoice.type)}</h2>
          </div>
          <p className="text-2xl font-mono mt-1 font-bold text-slate-800">{invoice.invoiceNo || 'RASCUNHO'}</p>
          
          <div className="mt-6 space-y-1.5 text-sm">
            <div className="flex justify-end gap-4">
              <span className="text-slate-500 font-medium">Data de Emissão:</span>
              <span className="font-bold">{dateLabel(invoice.issueDate)}</span>
            </div>
            {invoice.dueDate && invoice.type !== 'FR' && invoice.type !== 'VD' && (
              <div className="flex justify-end gap-4">
                <span className="text-slate-500 font-medium">Data de Vencimento:</span>
                <span className="font-bold text-rose-600">{dateLabel(invoice.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-end gap-4">
              <span className="text-slate-500 font-medium">Moeda:</span>
              <span className="font-bold uppercase">{invoice.currency}</span>
            </div>
            <div className="flex justify-end gap-4">
              <span className="text-slate-500 font-medium">Página:</span>
              <span className="font-bold">1 de 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Section */}
      <div className="mb-10 grid grid-cols-2 gap-8 items-stretch">
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
           <div>
              <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] mb-3">Entidade Adquirente</h3>
              <p className="text-lg font-black text-slate-800 leading-tight">{invoice.clientName}</p>
              <p className="text-sm text-slate-600 mt-2 font-medium">{invoice.clientAddress || 'Endereço não especificado'}</p>
           </div>
           <div className="mt-4 pt-4 border-t border-slate-200">
              <span className="text-xs font-bold bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-700">NIF: {invoice.clientNif}</span>
           </div>
        </div>

        {/* Goods Movement Details (Only if GR or has data) */}
        {(invoice.type === 'GR' || invoice.vehiclePlate) ? (
          <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] mb-3 flex items-center gap-2">
              <Truck className="h-3 w-3" /> Circulação de Mercadorias
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px]">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px]">Viatura / Motorista</p>
                <p className="font-bold text-slate-700 truncate">{invoice.vehiclePlate || '---'} | {invoice.driverName || '---'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[9px]">Carga (Data/Hora)</p>
                <p className="font-bold text-slate-700">{invoice.loadingDate ? new Date(invoice.loadingDate).toLocaleString('pt-AO') : '---'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 font-bold uppercase text-[9px]">Ponto de Carga / Descarga</p>
                <p className="text-slate-700 line-clamp-2">De: {invoice.loadingPoint || '---'}<br/>Para: {invoice.deliveryPoint || '---'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50/30 rounded-2xl border border-slate-100 flex items-center justify-center border-dashed">
             <div className="text-center opacity-30">
                <Landmark className="h-10 w-10 mx-auto mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Documento Certificado</p>
             </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="py-3 px-4 text-left rounded-l-lg">Descrição do Produto ou Serviço</th>
              <th className="py-3 px-2 text-center">Qtd.</th>
              <th className="py-3 px-3 text-right">Preço Unit.</th>
              <th className="py-3 px-2 text-center">Desc %</th>
              <th className="py-3 px-2 text-center">IVA %</th>
              <th className="py-3 px-4 text-right rounded-r-lg">Total Líquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4">
                  <p className="font-bold text-slate-800">{item.productName}</p>
                </td>
                <td className="py-4 px-2 text-center text-slate-600">{item.quantity}</td>
                <td className="py-4 px-3 text-right font-mono text-slate-500">{money(item.price, invoice.currency)}</td>
                <td className="py-4 px-2 text-center text-slate-500">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                <td className="py-4 px-2 text-center">
                   <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.taxRate}%</span>
                </td>
                <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">{money(item.total, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary and Totals Section */}
      <div className="flex justify-between items-start gap-10 mb-12">
        <div className="flex-1 space-y-6">
          {invoice.notes && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Observações</h3>
              <p className="text-xs text-slate-600 italic leading-relaxed">{invoice.notes}</p>
            </div>
          )}
          
          <div className="px-1">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Regime Fiscal</h3>
            <p className="text-xs font-bold text-slate-500">{tenant.fiscalRegime || 'REGIME GERAL'}</p>
          </div>
        </div>

        <div className="w-[320px] bg-slate-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center opacity-60 text-xs">
              <span className="font-medium uppercase">Subtotal</span>
              <span className="font-mono">{money(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between items-center text-rose-400 text-xs">
                <span className="font-medium uppercase">Descontos</span>
                <span className="font-mono">-{money(invoice.discountTotal, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium uppercase opacity-60">IVA Total</span>
              <span className="font-mono text-blue-400">{money(invoice.taxTotal, invoice.currency)}</span>
            </div>
            {invoice.withholdingTaxAmount > 0 && (
              <div className="flex justify-between items-center text-rose-400 text-xs">
                <span className="font-medium uppercase">Retenção ({invoice.withholdingTaxRate}%)</span>
                <span className="font-mono">-{money(invoice.withholdingTaxAmount, invoice.currency)}</span>
              </div>
            )}
            <div className="pt-6 mt-4 border-t border-white/10 flex justify-between items-end">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total a Pagar</span>
              <div className="text-right">
                 <p className="text-3xl font-black font-mono tracking-tighter text-blue-500">{money(invoice.grandTotal, invoice.currency)}</p>
                 <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest mt-1">Angolan Kwanza</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fiscal Footer */}
      <div className="mt-auto pt-10 border-t-2 border-slate-100">
        <div className="flex justify-between items-end">
          <div className="w-2/3">
            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
              <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase">
                {invoice.invoiceHash ? (
                  <>
                    <span className="font-black text-slate-800 tracking-wider">Hash de Assinatura Fiscal (AGT):</span><br/>
                    <span className="text-blue-600 font-bold">{invoice.invoiceHash}</span>
                  </>
                ) : (
                  <span className="italic font-bold text-amber-600">Este documento não possui valor fiscal - Documento de Rascunho</span>
                )}
              </p>
            </div>
            
            <div className="text-[10px] text-slate-400 space-y-1 font-medium">
              <p>Processado por programa certificado nº {tenant.agtCertificateNo || '0000/AGT/2026'} - {tenant.systemName || 'FACTURYAN'}</p>
              <p>Os bens/serviços foram colocados à disposição do adquirente na data do documento.</p>
              <p className="font-black text-slate-500 tracking-wider uppercase mt-2">Software de Facturação Certificado pela AGT</p>
            </div>
          </div>

          <div className="w-32 h-32 flex flex-col items-center justify-center border-2 border-slate-100 rounded-2xl p-2 bg-white shadow-inner">
            <div className="text-[8px] font-black text-slate-300 text-center mb-1 uppercase tracking-widest">Validação AGT</div>
            <div className="w-20 h-20 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
               {invoice.qrcodeString ? (
                  <span className="text-[8px] text-slate-300 font-bold text-center">QR CODE<br/>DISPONÍVEL</span>
               ) : (
                  <span className="text-[10px] text-slate-300 font-bold">QR CODE</span>
               )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Absolute Footer for gratitude */}
      <div className="mt-8 text-center pt-4 border-t border-slate-50">
        <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.4em]">Obrigado pela sua preferência!</p>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { Receipt, Tenant } from '../../types/invoice';
import { Landmark, ShieldCheck } from 'lucide-react';

interface ReceiptPrintViewProps {
  receipt: Receipt | null;
  tenant: Tenant | null;
}

const money = (value: number, currency = 'AOA') =>
  `${value.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === 'AOA' ? 'Kz' : currency}`;

const dateLabel = (date: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function ReceiptPrintView({ receipt, tenant }: ReceiptPrintViewProps) {
  if (!receipt || !tenant) return null;

  const methodLabels: Record<string, string> = {
    CH: 'NUMERÁRIO',
    TR: 'TRANSFERÊNCIA BANCÁRIA',
    TP: 'TPA',
    DP: 'DEPÓSITO',
    OU: 'OUTRO',
  };

  return (
    <div className="bg-white p-0 font-sans text-slate-900" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 border-b-4 border-slate-800 pb-6">
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
          <p className="text-sm mt-1">{tenant.address}</p>
          <p className="text-sm">{tenant.city}, Angola</p>
          <p className="text-sm font-bold mt-1 bg-slate-900 text-white inline-block px-2 py-0.5">NIF: {tenant.nif}</p>
        </div>

        <div className="text-right w-1/2">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">RECIBO</h2>
          <p className="text-2xl font-mono mt-1 font-bold text-blue-600">{receipt.receiptNo || 'RASCUNHO'}</p>
          
          <div className="mt-6 space-y-1 text-sm">
            <div className="flex justify-end gap-3">
              <span className="text-slate-500 font-medium">Data de Emissão:</span>
              <span className="font-bold">{dateLabel(receipt.issueDate)}</span>
            </div>
            <div className="flex justify-end gap-3">
              <span className="text-slate-500 font-medium">Método de Pagamento:</span>
              <span className="font-bold uppercase">{methodLabels[receipt.paymentMethod] || receipt.paymentMethod}</span>
            </div>
            <div className="flex justify-end gap-3">
              <span className="text-slate-500 font-medium">Moeda:</span>
              <span className="font-bold">AOA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Section */}
      <div className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
        <div>
          <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] mb-2">Dados do Cliente</h3>
          <p className="text-lg font-black text-slate-800">{receipt.clientName}</p>
          <p className="text-sm text-slate-600 mt-1 font-medium">NIF: {receipt.clientNif || '999999999'}</p>
        </div>
        <div className="text-right">
           <div className="bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Liquidado</p>
              <p className="text-2xl font-black text-blue-600 font-mono tracking-tighter">{money(receipt.totalAmount)}</p>
           </div>
        </div>
      </div>

      {/* Liquidações Table */}
      <div className="mb-10">
        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 flex items-center gap-2 px-1">
          <ShieldCheck className="h-3 w-3" /> Detalhes dos Documentos Liquidados
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="py-3 px-4 text-left rounded-l-lg">Documento</th>
              <th className="py-3 px-4 text-left">Data Fatura</th>
              <th className="py-3 px-4 text-right">Total Documento</th>
              <th className="py-3 px-4 text-right rounded-r-lg">Valor Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipt.items.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-4 font-mono font-bold text-blue-600">{item.invoiceNo}</td>
                <td className="py-4 px-4 text-slate-600">{item.invoiceNo.includes('/') ? 'Referente à fatura emitida' : '-'}</td>
                <td className="py-4 px-4 text-right font-mono text-slate-500">{money(item.amountPaid)}</td>
                <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">{money(item.amountPaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div className="flex justify-end mb-16">
        <div className="w-1/3 bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
           <div className="flex justify-between items-center mb-2 opacity-60">
              <span className="text-[10px] font-bold uppercase">Subtotal</span>
              <span className="font-mono text-xs">{money(receipt.totalAmount)}</span>
           </div>
           <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-xs font-black uppercase">Total do Recibo</span>
              <span className="text-xl font-black font-mono">{money(receipt.totalAmount)}</span>
           </div>
        </div>
      </div>

      {/* Notes */}
      {receipt.notes && (
        <div className="mb-12 p-4 bg-amber-50/30 border-l-4 border-amber-400 rounded-r-lg">
          <p className="text-[10px] font-black uppercase text-amber-600 mb-1">Observações</p>
          <p className="text-xs text-slate-600 italic leading-relaxed">{receipt.notes}</p>
        </div>
      )}

      {/* Fiscal Footer */}
      <div className="mt-auto pt-10 border-t-2 border-slate-100">
        <div className="flex justify-between items-end">
          <div className="w-2/3">
            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
              <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase">
                {receipt.receiptHash ? (
                  <>
                    <span className="font-black text-slate-800">Hash de Assinatura Fiscal (AGT):</span><br/>
                    <span className="text-blue-600 font-bold">{receipt.receiptHash}</span>
                  </>
                ) : (
                  <span className="italic font-bold text-amber-600">Este documento não possui valor fiscal - Documento de Rascunho</span>
                )}
              </p>
            </div>
            
            <div className="text-[10px] text-slate-400 space-y-1 font-medium">
              <p>Processado por programa certificado nº {tenant.agtCertificateNo || '0000/AGT/2026'} - {tenant.systemName || 'FACTURYAN'}</p>
              <p>O imposto selo foi liquidado conforme o código do imposto do selo.</p>
              <p className="font-black text-slate-500 tracking-wider">SOFTWARE DE FACTURAÇÃO CERTIFICADO PELA AGT</p>
            </div>
          </div>

          <div className="w-28 h-28 flex flex-col items-center justify-center border-2 border-slate-100 rounded-2xl p-2 bg-white shadow-inner">
            <div className="text-[8px] font-black text-slate-300 text-center mb-1">VALIDAÇÃO AGT</div>
            <div className="w-16 h-16 bg-slate-50 rounded border border-dashed border-slate-200 flex items-center justify-center">
               <span className="text-[10px] text-slate-300 font-bold">QR CODE</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center pt-4 border-t border-slate-50">
        <p className="text-[9px] text-slate-400 uppercase font-black tracking-[0.3em]">Obrigado pela sua preferência!</p>
      </div>
    </div>
  );
}

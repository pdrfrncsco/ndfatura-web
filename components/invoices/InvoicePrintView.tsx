'use client';

import * as React from 'react';
import { Invoice, Tenant, Estabelecimento } from '../../types/invoice';
import { Landmark } from 'lucide-react';

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
    <div className="bg-white p-0 font-sans text-slate-900" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div className="w-1/2">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="h-16 mb-4 object-contain" />
          ) : (
            <div className="h-16 mb-4 flex items-center justify-center bg-slate-100 rounded border border-dashed border-slate-300 w-48">
              <span className="text-slate-400 font-bold text-xl">{tenant.name.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
          <h1 className="text-lg font-bold uppercase">{tenant.name}</h1>
          <p className="text-sm">{tenant.address}</p>
          <p className="text-sm">{tenant.city}, Angola</p>
          <p className="text-sm font-semibold mt-1">NIF: {tenant.nif}</p>
          {branchInfo && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-semibold">Filial: {branchInfo.name}</p>
              <p className="text-xs text-slate-500">{branchInfo.address}</p>
            </div>
          )}
        </div>

        <div className="text-right w-1/2">
          <h2 className="text-2xl font-black text-slate-800">{getDocTypeLabel(invoice.type)}</h2>
          <p className="text-xl font-mono mt-1">{invoice.invoiceNo || 'RASCUNHO'}</p>
          
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-500">Data de Emissão:</span>
            <span className="font-semibold">{dateLabel(invoice.issueDate)}</span>
            <span className="text-slate-500">Data de Vencimento:</span>
            <span className="font-semibold">{dateLabel(invoice.dueDate)}</span>
            <span className="text-slate-500">Moeda:</span>
            <span className="font-semibold">{invoice.currency}</span>
            <span className="text-slate-500">Página:</span>
            <span className="font-semibold">1 de 1</span>
          </div>
        </div>
      </div>

      {/* Client Section */}
      <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Dados do Cliente</h3>
          <p className="text-base font-bold">{invoice.clientName}</p>
          <p className="text-sm">{invoice.clientAddress || 'Endereço não especificado'}</p>
          <p className="text-sm font-semibold mt-1">NIF: {invoice.clientNif}</p>
        </div>
        <div className="text-right flex flex-col justify-end">
        </div>
      </div>

      {/* Goods Movement Details (Only if GR or has data) */}
      {(invoice.type === 'GR' || invoice.vehiclePlate) && (
        <div className="mb-8 p-4 border border-slate-200 rounded-lg">
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
            <Landmark className="h-3 w-3" /> Detalhes da Circulação de Mercadorias
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-slate-500 uppercase font-semibold text-[9px]">Viatura (Matrícula)</p>
              <p className="font-bold">{invoice.vehiclePlate || '---'}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase font-semibold text-[9px]">Motorista</p>
              <p className="font-bold">{invoice.driverName || '---'}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase font-semibold text-[9px]">Carga (Data/Hora)</p>
              <p className="font-bold">{invoice.loadingDate ? new Date(invoice.loadingDate).toLocaleString('pt-AO') : '---'}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase font-semibold text-[9px]">Descarga (Prevista)</p>
              <p className="font-bold">{invoice.deliveryDate ? new Date(invoice.deliveryDate).toLocaleString('pt-AO') : '---'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 uppercase font-semibold text-[9px]">Ponto de Carga</p>
              <p className="">{invoice.loadingPoint || '---'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 uppercase font-semibold text-[9px]">Ponto de Descarga</p>
              <p className="">{invoice.deliveryPoint || '---'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <table className="w-full mb-8 text-sm">
        <thead>
          <tr className="border-b-2 border-slate-800 text-left">
            <th className="py-2 px-1">Cód.</th>
            <th className="py-2 px-1">Descrição</th>
            <th className="py-2 px-1 text-center">Qtd.</th>
            <th className="py-2 px-1 text-right">Preço Unit.</th>
            <th className="py-2 px-1 text-center">Desc %</th>
            <th className="py-2 px-1 text-center">Taxa %</th>
            <th className="py-2 px-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {invoice.items.map((item, idx) => (
            <tr key={idx} className="align-top">
              <td className="py-3 px-1 font-mono text-xs">{idx + 1}</td>
              <td className="py-3 px-1">
                <p className="font-semibold">{item.productName}</p>
              </td>
              <td className="py-3 px-1 text-center">{item.quantity}</td>
              <td className="py-3 px-1 text-right">{money(item.price, invoice.currency)}</td>
              <td className="py-3 px-1 text-center">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
              <td className="py-3 px-1 text-center">{item.taxRate}%</td>
              <td className="py-3 px-1 text-right font-semibold">{money(item.total, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="flex justify-between items-start">
        <div className="w-1/2">
          {invoice.notes && (
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-1">Observações</h3>
              <p className="text-xs text-slate-600 italic">{invoice.notes}</p>
            </div>
          )}
          
          <div className="text-xs text-slate-500">
            <p className="mb-1 font-semibold uppercase tracking-wider">Regime Fiscal:</p>
            <p>{tenant.fiscalRegime || 'Regime Geral'}</p>
          </div>
        </div>

        <div className="w-5/12">
          <div className="space-y-1 text-sm border-t-2 border-slate-100 pt-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span>{money(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Descontos:</span>
                <span>-{money(invoice.discountTotal, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">IVA Total:</span>
              <span>{money(invoice.taxTotal, invoice.currency)}</span>
            </div>
            {invoice.withholdingTaxAmount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span className="">Retenção na Fonte ({invoice.withholdingTaxRate}%):</span>
                <span>-{money(invoice.withholdingTaxAmount, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black border-t-2 border-slate-800 pt-2 mt-2">
              <span>TOTAL:</span>
              <span>{money(invoice.grandTotal, invoice.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fiscal Footer */}
      <div className="mt-16 pt-8 border-t border-slate-200">
        <div className="flex justify-between items-end">
          <div className="w-2/3">
            <div className="bg-slate-50 p-3 rounded mb-4">
              <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase">
                {invoice.invoiceHash ? (
                  <>
                    <span className="font-bold text-slate-700">Hash de Assinatura:</span><br/>
                    {invoice.invoiceHash.substring(0, 4)}-{invoice.invoiceHash.substring(invoice.invoiceHash.length - 4)}
                  </>
                ) : (
                  <span className="italic">Documento sem valor fiscal - Rascunho</span>
                )}
              </p>
            </div>
            
            <div className="text-[10px] text-slate-400 space-y-1">
              <p>Processado por programa certificado nº {tenant.agtCertificateNo || '0000/AGT/2026'} - {tenant.systemName || 'FACTURYAN'}</p>
              <p>Os bens/serviços foram colocados à disposição do adquirente na data do documento.</p>
              <p className="font-bold">Software de Facturação Certificado pela AGT</p>
            </div>
          </div>

          <div className="w-24 h-24 flex items-center justify-center border border-slate-200 rounded p-1">
            {invoice.qrcodeString ? (
               <div className="text-[8px] text-center text-slate-300">QR CODE<br/>VALIDAÇÃO AGT</div>
            ) : (
               <div className="text-[8px] text-center text-slate-300">QR CODE<br/>PENDENTE</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Absolute Footer for legislation text */}
      <div className="mt-8 text-center border-t border-slate-100 pt-4">
        <p className="text-[9px] text-slate-400 uppercase tracking-widest">Obrigado pela sua preferência!</p>
      </div>
    </div>
  );
}

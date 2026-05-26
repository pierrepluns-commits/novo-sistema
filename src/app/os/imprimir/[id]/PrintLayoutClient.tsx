"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, ToggleLeft, ToggleRight, Check, X, Circle } from "lucide-react";

interface Client {
  id: string;
  name: string;
  phone: string;
  document: string | null;
  email: string | null;
  cep: string | null;
  address: string | null;
}

interface ServiceOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
    sku: string;
  };
}

interface Company {
  name: string;
  document: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
}

interface Unit {
  name: string;
  document: string | null;
  address: string | null;
  contact: string | null;
}

interface ServiceOrder {
  id: string;
  osNumber: number;
  equipmentType: string;
  equipmentBrand: string;
  equipmentModel: string;
  equipmentSerial: string | null;
  equipmentColor: string | null;
  equipmentPassword: string | null;
  reportedDefect: string;
  physicalState: string | null;
  accessories: string | null;
  checklist: string; // JSON string
  status: string;
  technicalReport: string | null;
  servicePrice: number;
  partsPrice: number;
  prepayment: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string | null;
  installments: number;
  cardFee: number;
  warrantyPeriod: number;
  warrantyTerms: string | null;
  warrantyStatus: string;
  warrantyExpiresAt: string | null;
  createdAt: string;
  client: Client;
  company: Company;
  unit: Unit;
  user: { name: string } | null;
  items: ServiceOrderItem[];
}

interface PrintLayoutClientProps {
  os: ServiceOrder;
}

const statusMap: Record<string, string> = {
  BUDGET: "Orçamento",
  WAITING_APPROVAL: "Aguardando Aprovação",
  WAITING_PARTS: "Aguardando Peças",
  IN_PROGRESS: "Em Execução",
  COMPLETED: "Pronto",
  DELIVERED: "Entregue e Finalizado",
  UNREPAIRABLE: "Sem Conserto / Cancelado",
};

export default function PrintLayoutClient({ os }: PrintLayoutClientProps) {
  const router = useRouter();
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");

  // Parse checklist
  let checklistObj: Record<string, string> = {};
  try {
    checklistObj = JSON.parse(os.checklist);
  } catch {
    checklistObj = {};
  }

  const handlePrint = () => {
    window.print();
  };

  const remainder = Math.max(0, os.totalAmount - os.prepayment);

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 print:p-0 print:bg-white text-slate-100 print:text-black">
      
      {/* Dynamic CSS styles for print formatting */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .print-border-black {
            border-color: black !important;
          }
          .print-text-black {
            color: black !important;
          }
        }
      `}} />

      {/* Top action control bar - hidden during print */}
      <div className="print-hidden max-w-4xl mx-auto mb-6 bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para O.S.</span>
        </button>

        {/* Format Selector toggler */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold">
          <span className="text-slate-400">Formato de Impressão:</span>
          
          <button
            onClick={() => setPrintFormat("a4")}
            className={`px-3 py-1 rounded-lg transition-all ${
              printFormat === "a4" 
                ? "bg-indigo-600 text-white font-extrabold" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            A4 Standard
          </button>
          
          <button
            onClick={() => setPrintFormat("thermal")}
            className={`px-3 py-1 rounded-lg transition-all ${
              printFormat === "thermal" 
                ? "bg-indigo-600 text-white font-extrabold" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Térmica 80mm
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Agora</span>
        </button>
      </div>

      {/* Printable Sheet */}
      {printFormat === "a4" ? (
        
        // --- 1. A4 Standard Sheet Layout ---
        <div className="print-container max-w-4xl mx-auto bg-[#0a0e19] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-slate-200 print:text-black">
          
          {/* Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800 print:border-black pb-6">
            <div>
              <h1 className="text-xl font-black uppercase text-white print:text-black">
                {os.company.name}
              </h1>
              <p className="text-xs text-slate-400 print:text-black mt-1 leading-relaxed">
                {os.unit.address || "Endereço da unidade de assistência"}
              </p>
              {os.unit.contact && (
                <p className="text-xs text-slate-400 print:text-black font-semibold mt-0.5">
                  Tel/WhatsApp: {os.unit.contact}
                </p>
              )}
            </div>
            
            <div className="md:text-right flex flex-col justify-between items-start md:items-end">
              <div>
                <span className="font-mono text-2xl font-black text-indigo-400 print:text-black">
                  ORDEM DE SERVIÇO #{String(os.osNumber).padStart(4, "0")}
                </span>
                <div className="text-xs text-slate-400 print:text-black font-bold uppercase mt-1">
                  Status: {statusMap[os.status]}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 print:text-black mt-2 md:mt-0 font-mono">
                Data Abertura: {new Date(os.createdAt).toLocaleDateString("pt-BR")} às {new Date(os.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* Client Info Banner */}
          <div className="border border-slate-800 print:border-black rounded-xl p-4 bg-slate-950/40 print:bg-white text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold text-white print:text-black uppercase tracking-wider mb-2 text-[10px]">Dados do Cliente</h3>
              <p className="font-bold text-white print:text-black text-sm">{os.client.name}</p>
              {os.client.document && <p className="mt-1 font-mono">CPF/CNPJ: {os.client.document}</p>}
              <p className="mt-0.5">Celular/WhatsApp: <strong>{os.client.phone}</strong></p>
            </div>
            <div>
              <h3 className="font-bold text-white print:text-black uppercase tracking-wider mb-2 text-[10px]">Endereço / Contato</h3>
              {os.client.address ? (
                <p className="leading-relaxed">{os.client.address} {os.client.cep ? `| CEP: ${os.client.cep}` : ""}</p>
              ) : (
                <p className="text-slate-500 print:text-black italic">Endereço não informado</p>
              )}
              {os.client.email && <p className="mt-1 font-mono text-[10px]">{os.client.email}</p>}
            </div>
          </div>

          {/* Device details */}
          <div className="border border-slate-800 print:border-black rounded-xl p-4 text-xs space-y-4">
            <h3 className="font-bold text-white print:text-black uppercase tracking-wider text-[10px] border-b border-slate-800 print:border-black pb-1.5">Equipamento / Aparelho</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-500 print:text-black block font-medium">Marca/Modelo:</span>
                <span className="font-bold text-white print:text-black">{os.equipmentBrand} {os.equipmentModel}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-black block font-medium">Tipo:</span>
                <span className="text-white print:text-black font-semibold">{os.equipmentType}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-black block font-medium">Nº Série / IMEI:</span>
                <span className="font-mono text-white print:text-black">{os.equipmentSerial || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-black block font-medium">Cor:</span>
                <span className="text-white print:text-black font-semibold">{os.equipmentColor || "Não informado"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 print:border-black/20 pt-3">
              <div>
                <span className="text-slate-500 print:text-black block font-medium">Defeito Relatado:</span>
                <p className="text-white print:text-black mt-0.5 leading-relaxed font-semibold">{os.reportedDefect}</p>
              </div>
              <div>
                <span className="text-slate-500 print:text-black block font-medium">Estado Físico / Estético:</span>
                <p className="text-slate-300 print:text-black mt-0.5 leading-relaxed">{os.physicalState || "Sem observações adicionais"}</p>
              </div>
            </div>

            {os.accessories && (
              <div className="border-t border-slate-800/60 print:border-black/20 pt-3 text-[11px]">
                <span className="text-slate-500 print:text-black block font-medium">Acessórios Deixados:</span>
                <span className="text-white print:text-black font-semibold">{os.accessories}</span>
              </div>
            )}
          </div>

          {/* Triagem Checklist results (Only rendering OK or BAD tests to keep layout clean and save print space) */}
          {Object.keys(checklistObj).some((k) => checklistObj[k] !== "NONE") && (
            <div className="border border-slate-800 print:border-black rounded-xl p-4 text-xs space-y-2.5">
              <h3 className="font-bold text-white print:text-black uppercase tracking-wider text-[10px] border-b border-slate-800 print:border-black pb-1.5">Check-up de Recebimento</h3>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {Object.entries(checklistObj)
                  .filter(([_, status]) => status !== "NONE")
                  .map(([item, status]) => (
                    <span key={item} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border ${
                      status === "OK" 
                        ? "bg-green-500/10 border-green-500/20 text-green-400 print:text-green-800 print:border-green-600/30" 
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400 print:text-red-800 print:border-red-600/30"
                    }`}>
                      <span>{status === "OK" ? "✓" : "✗"}</span>
                      <span>{item}: <strong>{status}</strong></span>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Technical Diagnostics */}
          {os.technicalReport && (
            <div className="border border-slate-800 print:border-black rounded-xl p-4 text-xs space-y-2">
              <h3 className="font-bold text-white print:text-black uppercase tracking-wider text-[10px] border-b border-slate-800 print:border-black pb-1.5">Laudo Técnico / Diagnóstico de Assistência</h3>
              <p className="text-slate-200 print:text-black leading-relaxed font-semibold">{os.technicalReport}</p>
            </div>
          )}

          {/* Applied pieces breakdowns */}
          {os.items.length > 0 && (
            <div className="border border-slate-800 print:border-black rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-black font-bold uppercase tracking-wider text-[9px] border-b border-slate-800 print:border-black">
                  <tr>
                    <th className="px-4 py-2.5">Componente / Peça Substituída</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5">Quantidade</th>
                    <th className="px-4 py-2.5">Preço Unitário</th>
                    <th className="px-4 py-2.5 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 print:divide-black/20 text-slate-300 print:text-black">
                  {os.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 font-bold text-white print:text-black">{item.product.name}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px]">{item.product.sku}</td>
                      <td className="px-4 py-2.5 font-bold">{item.quantity}</td>
                      <td className="px-4 py-2.5 font-mono">R$ {item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Financial calculations breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
            {/* Warranty Certificate box */}
            {os.warrantyPeriod > 0 ? (
              <div className="border border-slate-800 print:border-black rounded-xl p-4 bg-slate-950/20 space-y-2">
                <h4 className="font-bold text-indigo-400 print:text-black uppercase tracking-wider text-[10px]">Certificado de Garantia</h4>
                <p className="text-[10px] text-slate-300 print:text-black leading-relaxed">
                  Esta assistência técnica oferece garantia de <strong>{os.warrantyPeriod} dias</strong>.
                  {os.warrantyExpiresAt && (
                    <span> Expiração em: <strong>{new Date(os.warrantyExpiresAt).toLocaleDateString("pt-BR")}</strong>.</span>
                  )}
                </p>
                {os.warrantyTerms && (
                  <p className="text-[9px] text-slate-400 print:text-black italic leading-normal border-t border-slate-800/50 print:border-black/20 pt-1.5 mt-1.5">
                    Termos: {os.warrantyTerms}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-slate-500 italic p-4 text-[10px] text-center border border-dashed border-slate-800 print:border-black rounded-xl">
                Nenhum termo de garantia cadastrado para esta O.S.
              </div>
            )}

            {/* Financial summaries */}
            <div className="border border-slate-800 print:border-black rounded-xl p-4 bg-slate-950/40 print:bg-white text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-black">Preço Mão de Obra:</span>
                <span className="font-mono text-white print:text-black">R$ {os.servicePrice.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-black">Total Peças:</span>
                <span className="font-mono text-white print:text-black">R$ {os.partsPrice.toFixed(2)}</span>
              </div>

              {os.prepayment > 0 && (
                <div className="flex justify-between text-emerald-400 print:text-black">
                  <span>Adiantamento / Sinal Pago:</span>
                  <span className="font-mono">- R$ {os.prepayment.toFixed(2)}</span>
                </div>
              )}

              {os.discount > 0 && (
                <div className="flex justify-between text-indigo-400 print:text-black">
                  <span>Desconto Concedido:</span>
                  <span className="font-mono">- R$ {os.discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-800 print:border-black pt-2 text-sm font-bold">
                <span className="text-white print:text-black uppercase tracking-wider">Valor Total O.S:</span>
                <span className="font-mono text-white print:text-black">R$ {os.totalAmount.toFixed(2)}</span>
              </div>

              {remainder > 0 && (
                <div className="flex justify-between border-t border-slate-800/50 print:border-black/20 pt-2 text-xs text-indigo-400 print:text-black font-extrabold uppercase">
                  <span>Saldo a Receber / Pagar:</span>
                  <span className="font-mono">R$ {remainder.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Legal / Policy footer */}
          <div className="text-[9px] text-slate-500 print:text-black leading-relaxed border-t border-slate-800 print:border-black pt-4 text-center">
            <p>
              Ao assinar o presente termo, o proprietário declara estar ciente e de pleno acordo com as condições descritas no verso e as regras de garantia técnica.
            </p>
          </div>

          {/* Double Signature Lines */}
          <div className="grid grid-cols-2 gap-8 pt-10 text-xs text-center border-t border-slate-800 print:border-black mt-8">
            <div className="space-y-1">
              <div className="border-t border-slate-800 print:border-black w-48 mx-auto pt-1 mt-6" />
              <p className="font-bold text-white print:text-black">{os.client.name}</p>
              <p className="text-[10px] text-slate-500 print:text-black">Assinatura do Proprietário</p>
            </div>
            
            <div className="space-y-1">
              <div className="border-t border-slate-800 print:border-black w-48 mx-auto pt-1 mt-6" />
              <p className="font-bold text-white print:text-black">{os.user?.name || "Técnico Responsável"}</p>
              <p className="text-[10px] text-slate-500 print:text-black">Assinatura do Técnico</p>
            </div>
          </div>

        </div>

      ) : (

        // --- 2. 80mm Thermal Bobbin Ticket Layout ---
        <div className="print-container max-w-[320px] mx-auto bg-white text-black p-4 border-2 border-dashed border-slate-800 shadow-xl space-y-4 text-xs font-mono">
          
          <div className="text-center space-y-1 border-b border-dashed border-black pb-3">
            <h2 className="font-bold text-sm uppercase">{os.company.name}</h2>
            <p className="text-[9px]">{os.unit.address}</p>
            {os.unit.contact && <p className="text-[9px] font-bold">Contato: {os.unit.contact}</p>}
          </div>

          <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[10px]">
            <div><strong>O.S. #{String(os.osNumber).padStart(4, "0")}</strong></div>
            <div>Data: {new Date(os.createdAt).toLocaleDateString("pt-BR")} às {new Date(os.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            <div>Status: <strong>{statusMap[os.status]}</strong></div>
          </div>

          <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
            <div className="font-bold uppercase text-[10px]">Cliente:</div>
            <div>{os.client.name}</div>
            <div>Celular: {os.client.phone}</div>
            {os.client.document && <div>CPF/CNPJ: {os.client.document}</div>}
          </div>

          <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
            <div className="font-bold uppercase text-[10px]">Equipamento:</div>
            <div>{os.equipmentBrand} {os.equipmentModel}</div>
            {os.equipmentSerial && <div>S/N: {os.equipmentSerial}</div>}
            {os.equipmentColor && <div>Cor: {os.equipmentColor}</div>}
            {os.equipmentPassword && <div>Senha: {os.equipmentPassword}</div>}
          </div>

          <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
            <div className="font-bold uppercase text-[10px]">Defeito:</div>
            <div className="italic leading-normal">{os.reportedDefect}</div>
          </div>

          {/* Applied parts */}
          {os.items.length > 0 && (
            <div className="space-y-1 border-b border-dashed border-black pb-2 text-[9px]">
              <div className="font-bold uppercase text-[10px]">Peças:</div>
              {os.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-1">
                  <span className="truncate max-w-[150px]">{item.product.name} (x{item.quantity})</span>
                  <span>R$ {(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Financial Ticket Summary */}
          <div className="space-y-1 border-b border-dashed border-black pb-2 text-[10px]">
            <div className="flex justify-between">
              <span>Mão de Obra:</span>
              <span>R$ {os.servicePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Peças:</span>
              <span>R$ {os.partsPrice.toFixed(2)}</span>
            </div>
            {os.prepayment > 0 && (
              <div className="flex justify-between font-bold">
                <span>Adiantamento:</span>
                <span>-R$ {os.prepayment.toFixed(2)}</span>
              </div>
            )}
            {os.discount > 0 && (
              <div className="flex justify-between font-bold">
                <span>Desconto:</span>
                <span>-R$ {os.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs border-t border-dashed border-black pt-1">
              <span>VALOR FINAL:</span>
              <span>R$ {os.totalAmount.toFixed(2)}</span>
            </div>
            {remainder > 0 && (
              <div className="flex justify-between font-bold text-xs">
                <span>A RECEBER:</span>
                <span>R$ {remainder.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Warranty thermal */}
          {os.warrantyPeriod > 0 && (
            <div className="text-[8px] border-b border-dashed border-black pb-2 space-y-1 leading-normal">
              <div className="font-bold text-[9px] uppercase">Garantia: {os.warrantyPeriod} Dias</div>
              {os.warrantyExpiresAt && <div>Validade: {new Date(os.warrantyExpiresAt).toLocaleDateString("pt-BR")}</div>}
              <div>{os.warrantyTerms}</div>
            </div>
          )}

          {/* Double Signature Thermal */}
          <div className="space-y-4 pt-4 text-[9px] text-center">
            <div>
              <div className="border-t border-dashed border-black w-32 mx-auto pt-1" />
              <p>{os.client.name}</p>
              <p className="text-[8px] text-slate-500">Proprietário</p>
            </div>
            <div>
              <div className="border-t border-dashed border-black w-32 mx-auto pt-1" />
              <p>{os.user?.name || "Técnico"}</p>
              <p className="text-[8px] text-slate-500">Técnico Responsável</p>
            </div>
            <p className="text-[8px] pt-4 italic">Agradecemos a preferência!</p>
          </div>

        </div>

      )}
      
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, Edit3, Save, Check, X, Shield, FileText, Clipboard } from "lucide-react";
import { saveReceiptConfig } from "@/app/actions/config";

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
  unitCost: number;
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
  receiptConfig: string | null;
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
  UNREPAIRABLE: "Sem Conserto",
};

const defaultIntakeTerms = `1. DO DIAGNÓSTICO E ORÇAMENTO: O prazo para análise técnica e apresentação do orçamento é de até 07 (sete) dias úteis. A execução do serviço só terá início após a aprovação expressa do cliente via canais oficiais de comunicação (WhatsApp ou Telefone).
2. DA IMPOSSIBILIDADE DE CHECKLIST E VÍCIOS OCULTOS: Aparelhos que dão entrada inoperantes (desligados), com tela danificada (sem imagem/touch) ou sem o fornecimento da senha de acesso impossibilitam a conferência funcional no ato do recebimento.
-I. ACEITE DE RISCO: O cliente declara estar ciente de que defeitos identificados apenas após a abertura ou reativação do sistema (ex: falhas em FaceID/TouchID, câmeras, sensores, Wi-Fi ou sinal de rede) são considerados Vícios Ocultos Preexistentes.
-II. ORÇAMENTO ADICIONAL: Caso novas falhas sejam detectadas durante o processo técnico, a CONTRATADA emitirá um Orçamento Complementar. O serviço ficará suspenso até a nova aprovação do cliente, não sendo a loja responsável por componentes que entraram sem possibilidade de teste prévio.
3. RISCOS TÉCNICOS EM REPARO DE PLACA: Intervenções em placa lógica envolvem procedimentos de micro-soldagem e exposição do hardware a altas temperaturas (estação de ar quente).
-I. RISCO DE APAGÃO: O cliente fica expressamente advertido de que, em casos de placas já instáveis, oxidadas ou com micro-fissuras, existe o risco técnico do aparelho sofrer um Apagão Total (deixar de ligar definitivamente) durante a tentativa de reparo.
-II. ISENÇÃO DE RESPONSABILIDADE: Ao autorizar o procedimento em placa, o cliente assume este risco, estando ciente de que a falha decorre da fragilidade estrutural do hardware e não de erro técnico operacional.
4. DA RESPONSABILIDADE SOBRE DADOS: A CONTRATADA não se responsabiliza pela integridade de dados (fotos, contatos, aplicativos) armazenados no dispositivo. É de total responsabilidade do cliente a realização de backup prévio. Reparos em placa ou software podem resultar em perda total de informações.
5. DO PRAZO DE RETIRADA E ABANDONO: Conforme o Art. 633 do Código Civil Brasileiro, o cliente tem o prazo de 90 dias para retirar o equipamento após a notificação de conclusão ou negativa de orçamento. Decorrido este prazo, o objeto será considerado abandonado, ficando a CONTRATADA autorizada a alienar o bem para ressarcimento de custos de peças, mão de obra e custódia.`;

const defaultDeliveryTerms = `1. CERTIFICADO DE GARANTIA: Esta assistência técnica oferece garantia pelo período estabelecido neste documento a contar da data de entrega, cobrindo exclusivamente as peças substituídas e a mão de obra do reparo realizado.
2. EXCLUSÃO DE GARANTIA: A garantia será imediatamente invalidada em caso de: danos físicos (quedas, quebras, trincados), contato com líquidos (oxidação), violação dos selos de garantia ou intervenção técnica por terceiros.
3. RETIRADA E ACEITE: O cliente declara ter testado o aparelho no ato da entrega e recebido o mesmo em perfeitas condições de funcionamento dos itens reparados.`;

export default function PrintLayoutClient({ os }: PrintLayoutClientProps) {
  const router = useRouter();
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">("a4");
  const [docType, setDocType] = useState<"abertura" | "encerramento" | "completo">(
    os.status === "COMPLETED" || os.status === "DELIVERED" ? "encerramento" : "abertura"
  );

  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load and parse receiptConfig terms
  const companyConfig = React.useMemo(() => {
    try {
      return JSON.parse(os.company.receiptConfig || "{}");
    } catch {
      return {};
    }
  }, [os.company.receiptConfig]);

  const [intakeTerms, setIntakeTerms] = useState<string>(
    companyConfig.intakeTerms || defaultIntakeTerms
  );
  const [deliveryTerms, setDeliveryTerms] = useState<string>(
    companyConfig.deliveryTerms || defaultDeliveryTerms
  );

  // Parse checklist
  let checklistObj: Record<string, any> = {};
  try {
    checklistObj = JSON.parse(os.checklist);
  } catch {
    checklistObj = {};
  }

  // Find technician name
  const technicianName = checklistObj.technicianName || os.user?.name || "Pierre Luns";

  const handlePrint = () => {
    window.print();
  };

  const handleSaveTerms = async () => {
    startTransition(async () => {
      const updatedConfig = {
        ...companyConfig,
        intakeTerms,
        deliveryTerms,
      };

      const res = await saveReceiptConfig(
        os.company.receiptHeader || "",
        os.company.receiptFooter || "",
        JSON.stringify(updatedConfig)
      );

      if (res.error) {
        alert("Erro ao salvar termos: " + res.error);
      } else {
        setIsEditingTerms(false);
        router.refresh();
      }
    });
  };

  const remainder = Math.max(0, os.totalAmount - os.prepayment);

  // Render checklist string matching the format: "TELA DISPLAY: SIM | TECLAS: SIM | BLUETOOTH: SIM"
  const checklistStr = Object.entries(checklistObj)
    .filter(([key, val]) => val !== "NONE" && key !== "technicianName")
    .map(([key, val]) => `${key.toUpperCase()}: ${val === "OK" ? "SIM" : "NÃO"}`)
    .join(" | ") || "NADA CONSTATADO";

  const renderA4Sheet = (copyType: "VIA EMPRESA" | "VIA CLIENTE" | null) => {
    const isIntake = docType === "abertura";
    const isDelivery = docType === "encerramento";
    const isFull = docType === "completo";

    // Format date nicely
    const dateStr = new Date(os.createdAt).toLocaleDateString("pt-BR") + ", " + new Date(os.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    return (
      <div className="w-full bg-[#0a0e19] print:bg-white text-slate-200 print:text-black border border-slate-800 print:border-black rounded-2xl print:rounded-none p-6 print:p-2 space-y-4 print:space-y-2 text-xs">
        
        {/* Header Block */}
        <div className="flex justify-between items-start border-b border-slate-800 print:border-black pb-3">
          <div>
            <h1 className="text-xl print:text-lg font-black uppercase text-white print:text-black leading-none tracking-tight">
              {os.company.name}
            </h1>
            <p className="text-[10px] text-slate-400 print:text-black mt-1 leading-tight font-semibold">
              {isFull ? "Ordem de Serviço Completa" : isIntake ? "Protocolo de Entrada" : "Protocolo de Saída"}
            </p>
            {os.unit.address && (
              <p className="text-[9px] text-slate-500 print:text-black mt-0.5 leading-none">
                {os.unit.address}
              </p>
            )}
            {os.unit.contact && (
              <p className="text-[9px] text-slate-500 print:text-black leading-none mt-0.5">
                Contato: {os.unit.contact}
              </p>
            )}
          </div>
          
          <div className="text-right flex flex-col items-end justify-between h-full">
            <div>
              <span className="font-mono text-xl print:text-lg font-black text-indigo-400 print:text-black">
                O.S. Nº {String(os.osNumber).padStart(4, "0")}
              </span>
              {copyType && (
                <div className="border border-slate-700 print:border-black px-2 py-0.5 mt-1 rounded text-[9px] font-black text-center uppercase tracking-wider text-slate-300 print:text-black">
                  {copyType}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Box 1: Client Info Block */}
        <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/40 print:bg-white grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <span className="font-bold text-white print:text-black block text-[10px] uppercase tracking-wider mb-1 opacity-70">Dados do Cliente</span>
            <p className="font-black text-white print:text-black text-sm">{os.client.name}</p>
            <p className="mt-0.5 font-semibold">Contato: <strong className="font-bold text-slate-100 print:text-black">{os.client.phone}</strong></p>
          </div>
          <div className="md:text-right flex flex-col justify-end">
            <p className="font-semibold">Abertura: {dateStr}</p>
            {os.client.document && <p className="font-mono text-[10px]">CPF/CNPJ: {os.client.document}</p>}
            <p className="font-semibold">Técnico: <strong className="font-bold text-slate-100 print:text-black">{technicianName}</strong></p>
          </div>
        </div>

        {/* Box 2: Device Specs Block */}
        <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white grid grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider">Marca / Modelo</span>
            <span className="font-black text-white print:text-black">{os.equipmentBrand} {os.equipmentModel}</span>
          </div>
          <div>
            <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider">Cor</span>
            <span className="font-bold text-white print:text-black">{os.equipmentColor || "Não informada"}</span>
          </div>
          <div>
            <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider">IMEI / Serial / Senha</span>
            <span className="font-mono text-white print:text-black font-semibold">
              {os.equipmentSerial || "SEM SERIAL"}{os.equipmentPassword ? ` (Senha: ${os.equipmentPassword})` : ""}
            </span>
          </div>
        </div>

        {/* Conditional Layout Body (Intake vs Delivery vs Full) */}
        {isIntake && (
          <>
            {/* Box 3: Checklist (Intake Only) */}
            <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider mb-1">Checklist de Entrada</span>
              <p className="text-white print:text-black font-bold font-mono tracking-wide leading-relaxed text-[10px]">
                {checklistStr}
              </p>
            </div>

            {/* Box 4: Defect and Obs (Intake Only) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-3 border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white">
                <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider mb-1">Defeito Relatado</span>
                <p className="text-white print:text-black font-semibold leading-relaxed">{os.reportedDefect}</p>
              </div>
              <div className="md:col-span-2 border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white">
                <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider mb-1">Observações / Acessórios / Estado</span>
                <p className="text-slate-300 print:text-black leading-relaxed">
                  {os.physicalState ? `Estado: ${os.physicalState}` : "Sem observações estéticas."}
                  {os.accessories ? ` | Acessórios: ${os.accessories}` : ""}
                </p>
              </div>
            </div>

            {/* Box 5: Terms (Intake Only) */}
            <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/40 print:bg-white space-y-1.5">
              <h4 className="text-[10px] font-black text-white print:text-black uppercase tracking-wider text-center">Termos de Recebimento e Abertura de Ordem de Serviço</h4>
              <div className="text-[8px] text-slate-400 print:text-black leading-tight whitespace-pre-line font-medium text-justify">
                {intakeTerms}
              </div>
            </div>
          </>
        )}

        {isDelivery && (
          <>
            {/* Box 3: Technical Diagnosis (Delivery Only) */}
            <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider mb-1">Laudo Técnico / Diagnóstico de Reparo</span>
              <p className="text-white print:text-black font-semibold leading-relaxed text-[11px] whitespace-pre-line">
                {os.technicalReport || "Nenhum laudo técnico preenchido."}
              </p>
            </div>

            {/* Box 4: Parts and Financials (Delivery Only) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Parts */}
              <div className="md:col-span-3 border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white space-y-2">
                <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider border-b border-slate-800 print:border-black pb-1">Peças Substituídas</span>
                {os.items.length === 0 ? (
                  <p className="text-slate-400 print:text-black italic">Nenhuma peça aplicada.</p>
                ) : (
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-800/40 print:border-black/20 text-slate-500 print:text-black font-bold">
                        <th className="pb-1">Item</th>
                        <th className="pb-1 text-center">Qtd</th>
                        <th className="pb-1 text-right">Preço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/20 print:divide-black/10">
                      {os.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1 font-semibold text-white print:text-black">{item.product.name}</td>
                          <td className="py-1 text-center font-bold">{item.quantity}</td>
                          <td className="py-1 text-right font-mono">
                            {item.unitPrice > 0 ? `R$ ${item.unitPrice.toFixed(2)}` : "R$ 0,00"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Financial calculations */}
              <div className="md:col-span-2 border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/40 print:bg-white space-y-1 font-mono text-[10px]">
                <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider border-b border-slate-800 print:border-black pb-1 mb-1 font-sans">Resumo Financeiro</span>
                <div className="flex justify-between">
                  <span>Mão de Obra:</span>
                  <span className="font-bold text-white print:text-black">R$ {os.servicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Peças:</span>
                  <span className="font-bold text-white print:text-black">R$ {os.partsPrice.toFixed(2)}</span>
                </div>
                {os.prepayment > 0 && (
                  <div className="flex justify-between text-emerald-400 print:text-black">
                    <span>Adiantamento:</span>
                    <span>-R$ {os.prepayment.toFixed(2)}</span>
                  </div>
                )}
                {os.discount > 0 && (
                  <div className="flex justify-between text-indigo-400 print:text-black">
                    <span>Desconto:</span>
                    <span>-R$ {os.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-800 print:border-black pt-1 font-black text-white print:text-black text-[11px] mt-1">
                  <span>VALOR FINAL:</span>
                  <span>R$ {os.totalAmount.toFixed(2)}</span>
                </div>
                {os.paymentMethod && (
                  <div className="flex justify-between text-[9px] font-sans text-slate-400 print:text-black pt-1">
                    <span>Forma de Pago:</span>
                    <span className="font-bold">{os.paymentMethod === "CASH" ? "Dinheiro" : os.paymentMethod === "PIX" ? "PIX" : "Cartão"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Box 5: Warranty terms (Delivery Only) */}
            <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/40 print:bg-white space-y-1.5">
              <h4 className="text-[10px] font-black text-indigo-400 print:text-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Certificado de Garantia do Serviço (Garantia: {os.warrantyPeriod} dias)</span>
              </h4>
              <div className="text-[8px] text-slate-400 print:text-black leading-tight whitespace-pre-line font-medium text-justify">
                {deliveryTerms}
                {os.warrantyTerms && (
                  <p className="mt-1 font-bold italic border-t border-slate-800/40 print:border-black/20 pt-1">
                    Condições Específicas: {os.warrantyTerms}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {isFull && (
          /* Default Standard Complete layout for fallback */
          <div className="space-y-4">
            <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider mb-1">Diagnóstico e Laudo</span>
              <p className="text-white print:text-black font-semibold leading-relaxed whitespace-pre-line">
                {os.technicalReport || "Nenhum laudo cadastrado."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white">
                <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider border-b border-slate-800 print:border-black pb-1 mb-1">Peças e Mão de Obra</span>
                <p>Mão de Obra: <strong>R$ {os.servicePrice.toFixed(2)}</strong></p>
                <p>Peças Aplicadas: <strong>R$ {os.partsPrice.toFixed(2)}</strong></p>
                <p className="text-xs font-bold mt-2">Valor Total O.S.: <strong>R$ {os.totalAmount.toFixed(2)}</strong></p>
              </div>

              {os.warrantyPeriod > 0 && (
                <div className="border border-slate-800 print:border-black rounded-xl p-3 bg-slate-950/20 print:bg-white">
                  <span className="text-slate-500 print:text-black block font-bold text-[9px] uppercase tracking-wider border-b border-slate-800 print:border-black pb-1 mb-1">Dados de Garantia</span>
                  <p>Período de Garantia: <strong>{os.warrantyPeriod} dias</strong></p>
                  {os.warrantyExpiresAt && <p>Expiração: <strong>{new Date(os.warrantyExpiresAt).toLocaleDateString("pt-BR")}</strong></p>}
                  <p className="text-[10px] mt-1 italic">{os.warrantyTerms}</p>
                </div>
              )}
            </div>

            <div className="text-[9px] text-slate-500 print:text-black text-center pt-4">
              {os.company.receiptFooter || "Agradecemos a preferência!"}
            </div>
          </div>
        )}

        {/* Signature lines */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-[9px] text-center">
          <div className="space-y-1">
            <div className="border-t border-slate-700 print:border-black w-40 mx-auto pt-1 mt-4" />
            <p className="font-bold text-white print:text-black">{os.client.name}</p>
            <p className="text-[8px] text-slate-500 print:text-black uppercase">Assinatura do Proprietário</p>
          </div>
          
          <div className="space-y-1">
            <div className="border-t border-slate-700 print:border-black w-40 mx-auto pt-1 mt-4" />
            <p className="font-bold text-white print:text-black">{technicianName}</p>
            <p className="text-[8px] text-slate-500 print:text-black uppercase">Responsável Zionix</p>
          </div>
        </div>

      </div>
    );
  };

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
      <div className="print-hidden max-w-4xl mx-auto mb-6 bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para O.S.</span>
          </button>

          {/* Toggle Type Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => setDocType("abertura")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                docType === "abertura" 
                  ? "bg-indigo-600 text-white font-extrabold" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Entrada (Abertura)</span>
            </button>
            <button
              onClick={() => setDocType("encerramento")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                docType === "encerramento" 
                  ? "bg-indigo-600 text-white font-extrabold" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Saída (Entrega)</span>
            </button>
            <button
              onClick={() => setDocType("completo")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                docType === "completo" 
                  ? "bg-indigo-600 text-white font-extrabold" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Completo (Padrão)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingTerms(!isEditingTerms)}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border transition-all ${
                isEditingTerms 
                  ? "bg-amber-600/20 border-amber-500/30 text-amber-400 hover:bg-amber-600/30" 
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditingTerms ? "Fechar Editor" : "Editar Termos"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Via</span>
            </button>
          </div>
        </div>

        {/* Format Selector A4/Thermal */}
        <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-800/60 px-4 py-2 rounded-xl text-xs font-semibold self-start">
          <span className="text-slate-500">Impressora:</span>
          <button
            onClick={() => setPrintFormat("a4")}
            className={`px-2 py-0.5 rounded transition-all ${
              printFormat === "a4" 
                ? "bg-indigo-950 text-indigo-400 font-bold border border-indigo-500/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Folha A4 (Duas Vias)
          </button>
          <button
            onClick={() => setPrintFormat("thermal")}
            className={`px-2 py-0.5 rounded transition-all ${
              printFormat === "thermal" 
                ? "bg-indigo-950 text-indigo-400 font-bold border border-indigo-500/20" 
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Térmica 80mm
          </button>
        </div>

        {/* Terms Editor Panel */}
        {isEditingTerms && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-3 duration-250">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>Personalizar Termos Legais Fixos do Sistema</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Termos de Entrada (Protocolo de Entrada / Abertura)</label>
                <textarea
                  value={intakeTerms}
                  onChange={(e) => setIntakeTerms(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Termos de Garantia / Aceite (Protocolo de Saída / Encerramento)</label>
                <textarea
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
              <button
                onClick={() => setIsEditingTerms(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTerms}
                disabled={isPending}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2 rounded-xl text-xs active:scale-95 transition-all shadow-lg shadow-amber-500/10"
              >
                {isPending ? <span className="animate-spin">⌛</span> : <Save className="w-3.5 h-3.5" />}
                <span>Salvar Termos no Sistema</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Printable Sheet */}
      {printFormat === "a4" ? (
        
        // --- 1. A4 Sheet Layout (Dual-Copy if not full standard) ---
        <div className="print-container max-w-4xl mx-auto space-y-6 print:space-y-6">
          {docType === "completo" ? (
            renderA4Sheet(null)
          ) : (
            <>
              {/* Copy 1: VIA EMPRESA */}
              {renderA4Sheet("VIA EMPRESA")}

              {/* Dashed Separator Line */}
              <div className="relative py-2 flex items-center justify-center print-hidden">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-dashed border-slate-700 print:border-black" />
                </div>
                <span className="relative px-3 bg-slate-950 print:bg-white text-[10px] font-bold text-slate-500 print:text-black uppercase tracking-wider font-mono">
                  Recorte Aqui -------------------------------------
                </span>
              </div>
              
              <div className="hidden print:block border-b border-dashed border-black py-1 my-2 text-center text-[7px] text-black font-mono">
                CORTAR AQUI E ENTREGAR VIA CLIENTE ABAIXO
              </div>

              {/* Copy 2: VIA CLIENTE */}
              {renderA4Sheet("VIA CLIENTE")}
            </>
          )}
        </div>

      ) : (

        // --- 2. 80mm Thermal Bobbin Ticket Layout ---
        <div className="print-container max-w-[320px] mx-auto bg-white text-black p-4 border border-dashed border-black shadow-xl space-y-4 text-xs font-mono">
          
          <div className="text-center space-y-1 border-b border-dashed border-black pb-3">
            <h2 className="font-bold text-sm uppercase">{os.company.name}</h2>
            <p className="text-[9px]">{os.unit.address}</p>
            {os.unit.contact && <p className="text-[9px] font-bold">Contato: {os.unit.contact}</p>}
          </div>

          <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[10px]">
            <div><strong>O.S. #{String(os.osNumber).padStart(4, "0")}</strong></div>
            <div>{docType === "abertura" ? "Protocolo de Entrada" : docType === "encerramento" ? "Protocolo de Saída" : "Ficha Completa"}</div>
            <div>Data: {new Date(os.createdAt).toLocaleDateString("pt-BR")} às {new Date(os.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
            <div>Técnico: <strong>{technicianName}</strong></div>
          </div>

          <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
            <div className="font-bold uppercase text-[10px]">Cliente:</div>
            <div>{os.client.name}</div>
            <div>Celular: {os.client.phone}</div>
          </div>

          <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
            <div className="font-bold uppercase text-[10px]">Equipamento:</div>
            <div>{os.equipmentBrand} {os.equipmentModel} ({os.equipmentColor || "N/A"})</div>
            {os.equipmentSerial && <div>S/N: {os.equipmentSerial}</div>}
            {os.equipmentPassword && <div>Senha: {os.equipmentPassword}</div>}
          </div>

          {docType === "abertura" ? (
            <>
              <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
                <div className="font-bold uppercase text-[10px]">Defeito Relatado:</div>
                <div className="italic leading-normal">{os.reportedDefect}</div>
              </div>
              <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
                <div className="font-bold uppercase text-[10px]">Checklist Entrada:</div>
                <div className="leading-normal">{checklistStr}</div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
                <div className="font-bold uppercase text-[10px]">Laudo Técnico:</div>
                <div className="italic leading-normal">{os.technicalReport || "Serviço efetuado."}</div>
              </div>

              {os.items.length > 0 && (
                <div className="space-y-1 border-b border-dashed border-black pb-2 text-[9px]">
                  <div className="font-bold uppercase text-[10px]">Peças:</div>
                  {os.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-1">
                      <span className="truncate max-w-[150px]">{item.product.name}</span>
                      <span>{item.unitPrice > 0 ? `R$ ${(item.quantity * item.unitPrice).toFixed(2)}` : "Cortesia"}</span>
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
              </div>
            </>
          )}

          {/* Warranty certificate in bobbin if Saída */}
          {docType === "encerramento" && os.warrantyPeriod > 0 && (
            <div className="text-[8px] border-b border-dashed border-black pb-2 leading-normal">
              <div className="font-bold text-[9px] uppercase">Garantia: {os.warrantyPeriod} Dias</div>
              {os.warrantyExpiresAt && <div>Validade: {new Date(os.warrantyExpiresAt).toLocaleDateString("pt-BR")}</div>}
              <div className="text-justify">{deliveryTerms.substring(0, 150)}...</div>
            </div>
          )}

          {/* Signatures Bobbin */}
          <div className="space-y-4 pt-4 text-[9px] text-center">
            <div>
              <div className="border-t border-dashed border-black w-32 mx-auto pt-1" />
              <p>{os.client.name}</p>
              <p className="text-[8px] text-slate-500">Assinatura do Cliente</p>
            </div>
            <div>
              <div className="border-t border-dashed border-black w-32 mx-auto pt-1" />
              <p>{technicianName}</p>
              <p className="text-[8px] text-slate-500 font-bold">Zionix Técnico</p>
            </div>
            <p className="text-[8px] pt-4 italic">Obrigado pela preferência!</p>
          </div>

        </div>

      )}
      
    </div>
  );
}

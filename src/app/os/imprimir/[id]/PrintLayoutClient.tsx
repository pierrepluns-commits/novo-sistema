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

  React.useEffect(() => {
    const savedFormat = localStorage.getItem("preferred_print_format");
    if (savedFormat === "a4" || savedFormat === "thermal") {
      setPrintFormat(savedFormat);
    }
  }, []);

  const handleSetFormat = (format: "a4" | "thermal") => {
    setPrintFormat(format);
    localStorage.setItem("preferred_print_format", format);
  };

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
    companyConfig.deliveryTerms || os.company.receiptFooter || defaultDeliveryTerms
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
  const partName = checklistObj.partName || "";

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

  // Render checklist string matching the format: "TELA DISPLAY: SIM | TECLAS: SIM"
  const checklistStr = Object.entries(checklistObj)
    .filter(([key, val]) => val !== "NONE" && key !== "technicianName" && key !== "partName" && key !== "cardServicePrice")
    .map(([key, val]) => `${key.toUpperCase()}: ${val === "OK" ? "SIM" : "NÃO"}`)
    .join(" | ") || "NADA CONSTATADO";

  const renderA4Sheet = (copyType: "VIA EMPRESA" | "VIA CLIENTE" | null) => {
    const isIntake = docType === "abertura";
    const isDelivery = docType === "encerramento";
    const isFull = docType === "completo";

    const billingDateStr = checklistObj.billingDate 
      ? new Date(checklistObj.billingDate).toLocaleDateString("pt-BR") + ", " + new Date(checklistObj.billingDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : null;

    // Format date nicely
    const dateStr = new Date(os.createdAt).toLocaleDateString("pt-BR") + ", " + new Date(os.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const docTitle = isIntake 
      ? "ORDEM DE SERVIÇO - ENTRADA" 
      : isDelivery 
        ? "ORDEM DE SERVIÇO - SAÍDA" 
        : "ORDEM DE SERVIÇO - COMPLETO";

    return (
      <div className="w-full bg-[#0a0e19] print:bg-white text-slate-200 print:text-black border border-slate-800 print:border-black rounded-2xl print:rounded-none p-4 print:p-2 space-y-3 print:space-y-1 text-xs print:text-[9px] print:leading-none print:h-auto print:flex print:flex-col print:justify-between">
        
        {/* Header copy type indicator */}
        {copyType && (
          <div className="text-right font-black text-indigo-400 print:text-black text-[9px] print:text-[7.5px] border-b border-slate-800/40 print:border-black/10 pb-1 tracking-wider uppercase">
            {copyType}
          </div>
        )}

        {/* Section 0: Brand & O.S. Info */}
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="space-y-1">
            <h1 className="text-sm print:text-xs font-black text-white print:text-black leading-none">{os.company.name.toUpperCase()}</h1>
            <p className="text-[10px] print:text-[8px] text-slate-400 print:text-black font-semibold leading-tight">{os.unit.address}</p>
            {os.unit.contact && (
              <p className="text-[10px] print:text-[8px] text-slate-500 print:text-black font-mono">Contato: {os.unit.contact}</p>
            )}
          </div>
          <div className="text-right space-y-1 font-mono">
            <div className="text-xs print:text-xs font-black text-indigo-400 print:text-black leading-none">{docTitle}</div>
            <div className="text-xs print:text-[10px] font-bold text-white print:text-black">O.S. Nº {String(os.osNumber).padStart(4, "0")}</div>
            <div className="text-[9px] print:text-[7.5px] text-slate-500 print:text-black">
              {isDelivery && billingDateStr ? `Saída: ${billingDateStr}` : `Entrada: ${dateStr}`}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/60 print:border-black/15 my-1" />

        {/* Section 1: Customer & Equipment details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] print:text-[8.5px]">
          <div className="border border-slate-800 print:border-black rounded-lg p-2 print:p-1.5 space-y-0.5">
            <span className="text-slate-500 print:text-black block font-bold text-[9px] print:text-[7.5px] uppercase tracking-wider mb-0.5 border-b border-slate-850 print:border-black/10 pb-0.5">Cliente</span>
            <div className="font-bold text-white print:text-black text-[10.5px] print:text-[8.5px]">{os.client.name.toUpperCase()}</div>
            <div>Celular: <span className="font-semibold text-white print:text-black">{os.client.phone}</span></div>
            {os.client.document && <div>CPF/CNPJ: <span className="font-semibold text-white print:text-black">{os.client.document}</span></div>}
          </div>

          <div className="border border-slate-800 print:border-black rounded-lg p-2 print:p-1.5 space-y-0.5">
            <span className="text-slate-500 print:text-black block font-bold text-[9px] print:text-[7.5px] uppercase tracking-wider mb-0.5 border-b border-slate-850 print:border-black/10 pb-0.5">Equipamento</span>
            <div className="font-bold text-white print:text-black text-[10.5px] print:text-[8.5px]">{os.equipmentType.toUpperCase()}</div>
            <div>Marca/Modelo: <span className="font-semibold text-white print:text-black">{os.equipmentBrand.toUpperCase()} {os.equipmentModel.toUpperCase()}</span></div>
            {(os.equipmentColor || os.equipmentSerial) && (
              <div>
                {os.equipmentColor ? `Cor: ${os.equipmentColor.toUpperCase()}` : ""}
                {os.equipmentSerial ? ` | S/N: ${os.equipmentSerial.toUpperCase()}` : ""}
              </div>
            )}
            {os.equipmentPassword && <div>Senha: <span className="font-bold text-emerald-400 print:text-black font-mono">{os.equipmentPassword}</span></div>}
          </div>
        </div>

        {/* Row 2.5: Technical and checklist */}
        <div className="border border-slate-800 print:border-black rounded-lg p-2 print:p-1.5 text-[10px] print:text-[8.5px] space-y-1">
            {(isIntake || isFull) && (
              <div>
                <strong>CHECKLIST:</strong> <span className="font-bold text-indigo-400 print:text-black font-mono">{checklistStr.toUpperCase()}</span>
              </div>
            )}
            {(isDelivery || isFull) && (
              <div>
                <strong>LAUDO TÉCNICO:</strong> <span className="font-semibold text-white print:text-black">{os.technicalReport ? os.technicalReport.toUpperCase() : "NENHUM LAUDO TÉCNICO"}</span>
              </div>
            )}
        </div>

        {/* Section 2: Defect/Obs (Intake or Full) */}
        {(isIntake || isFull) && (
          <div className="grid grid-cols-5 gap-2 text-[10px] print:text-[8px]">
            <div className="col-span-3 border border-slate-800 print:border-black rounded-lg p-2 print:p-1.5">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] print:text-[7.5px] uppercase tracking-wider mb-0.5">Defeito Relatado</span>
              <p className="text-white print:text-black font-semibold leading-tight">{os.reportedDefect}</p>
            </div>
            <div className="col-span-2 border border-slate-800 print:border-black rounded-lg p-2 print:p-1.5">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] print:text-[7.5px] uppercase tracking-wider mb-0.5">Observações / Estado</span>
              <p className="text-slate-300 print:text-black leading-tight">
                {os.physicalState ? `Estado: ${os.physicalState}` : "Sem observações."}
                {os.accessories ? ` | Acessórios: ${os.accessories}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Section 2.5: Parts/Financials (Delivery or Full) */}
        {(isDelivery || isFull) && (
          <div className="grid grid-cols-5 gap-2 text-[10px] print:text-[8px]">
            {/* Parts table */}
            <div className="col-span-3 border border-slate-800 print:border-black rounded-lg p-2 print:p-1.5 space-y-1">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] print:text-[7.5px] uppercase tracking-wider mb-0.5 border-b border-slate-800/40 print:border-black/10 pb-0.5">Peças Aplicadas</span>
              {!partName && os.items.length === 0 ? (
                <p className="text-slate-400 print:text-black italic">Nenhuma peça aplicada.</p>
              ) : (
                <div className="max-h-[60px] overflow-hidden leading-snug space-y-0.5">
                  {partName && (
                    <div className="font-bold uppercase">• {partName.toUpperCase()}</div>
                  )}
                  {os.items.map((item) => {
                    const isCustom = item.product.sku.startsWith("OS-CUSTOM");
                    const displayName = isCustom ? item.product.name.replace(/ \(O\.S\. #\d+\)$/, "") : item.product.name;
                    return (
                      <div key={item.id}>
                        • {displayName} (x{item.quantity})
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Financial summary */}
            <div className="col-span-2 border border-slate-800 print:border-black rounded-lg p-2 print:p-1.5 space-y-0.5 font-mono text-[9px] print:text-[7.5px]">
              <span className="text-slate-500 print:text-black block font-bold text-[9px] print:text-[7.5px] uppercase tracking-wider mb-0.5 font-sans border-b border-slate-800/40 print:border-black/10 pb-0.5">Resumo Financeiro</span>
              <div className="flex justify-between">
                <span>Serviço:</span>
                <span>R$ {os.servicePrice.toFixed(2)}</span>
              </div>
              {os.prepayment > 0 && (
                <div className="flex justify-between text-emerald-400 print:text-black">
                  <span>Sinal:</span>
                  <span>-R$ {os.prepayment.toFixed(2)}</span>
                </div>
              )}
              {os.discount > 0 && (
                <div className="flex justify-between text-indigo-400 print:text-black">
                  <span>Desc:</span>
                  <span>-R$ {os.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 print:border-black pt-0.5 font-black text-white print:text-black mt-0.5">
                <span>TOTAL:</span>
                <span>R$ {os.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Legal Terms (Extremely compact text) */}
        <div className="border border-slate-800 print:border-black rounded-lg p-2 print:p-1 bg-slate-950/20 print:bg-white space-y-1">
          {(isIntake || isFull) && (
            <div className="space-y-0.5">
              <h4 className="text-[9px] print:text-[7px] font-black text-white print:text-black uppercase tracking-wider text-center leading-none">
                Termos de Recebimento e Condições de Serviço
              </h4>
              <div className="text-[7.5px] print:text-[5.5px] text-slate-400 print:text-black leading-tight text-justify whitespace-pre-line font-medium">
                {intakeTerms}
              </div>
            </div>
          )}
          {(isDelivery || isFull) && (
            <div className="space-y-0.5 pt-1 border-t border-slate-800/20 print:border-black/5">
              <h4 className="text-[9px] print:text-[7px] font-black text-white print:text-black uppercase tracking-wider text-center leading-none">
                Termos de Garantia e Aceite de Retirada
              </h4>
              <div className="text-[7.5px] print:text-[5.5px] text-slate-400 print:text-black leading-tight text-justify whitespace-pre-line font-medium">
                {deliveryTerms}
                {(isDelivery || isFull) && os.warrantyPeriod > 0 && (
                  <span className="font-bold block mt-0.5">
                    GARANTIA: {os.warrantyPeriod} DIAS {os.warrantyExpiresAt ? `(ATÉ ${new Date(os.warrantyExpiresAt).toLocaleDateString("pt-BR")})` : ""} {os.warrantyTerms ? `| CONDIÇÕES: ${os.warrantyTerms}` : ""}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Signatures */}
        <div className="grid grid-cols-2 gap-12 pt-3 print:pt-1 text-[9px] print:text-[7px] text-center">
          <div className="space-y-0.5">
            <div className="border-t border-slate-700 print:border-black w-32 mx-auto" />
            <p className="font-bold text-white print:text-black">{os.client.name.toUpperCase()}</p>
            <p className="text-[7px] print:text-[5.5px] text-slate-500 print:text-black uppercase">Assinatura do Proprietário</p>
          </div>
          <div className="space-y-0.5">
            <div className="border-t border-slate-700 print:border-black w-32 mx-auto" />
            <p className="font-bold text-white print:text-black">{technicianName.toUpperCase()}</p>
            <p className="text-[7px] print:text-[5.5px] text-slate-500 print:text-black uppercase">Responsável {os.company.name.toUpperCase()}</p>
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
          html, body {
            background-color: white !important;
            color: black !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-hidden {
            display: none !important;
          }
          .print-border-black {
            border-color: black !important;
          }
          .print-text-black {
            color: black !important;
          }
          
          ${printFormat === "thermal" ? `
            /* Specific styles for continuous 80mm thermal receipt printing */
            @page {
              size: auto;
              margin: 0 !important;
            }
            html, body {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              color: black !important;
            }
            .print-container {
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              padding: 3mm !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              box-sizing: border-box !important;
              height: auto !important;
              min-height: auto !important;
              overflow: visible !important;
            }
          ` : `
            /* Specific styles for A4 sheet printing */
            @page {
              size: A4;
              margin: 5mm !important;
            }
            .print-container {
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
            }
            .print-copy-container {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
            }
          `}
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

          {/* Format Selector A4/Thermal (Integrated inside top bar!) */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs font-bold">
            <button
              onClick={() => handleSetFormat("a4")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                printFormat === "a4" 
                  ? "bg-indigo-600 text-white font-extrabold" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Folha A4</span>
            </button>
            <button
              onClick={() => handleSetFormat("thermal")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                printFormat === "thermal" 
                  ? "bg-indigo-600 text-white font-extrabold" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Térmica 80mm</span>
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
              <span>Imprimir</span>
            </button>
          </div>
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
        docType === "completo" ? (
          <div className="print-container max-w-4xl mx-auto">
            {renderA4Sheet(null)}
          </div>
        ) : (
          <div className="print-container max-w-4xl mx-auto print:h-auto print:max-h-none print:overflow-visible print:block print:gap-4">
            {/* Copy 1: VIA EMPRESA */}
            <div className="print-copy-container print:h-auto print:max-h-none print:overflow-visible print:box-border">
              {renderA4Sheet("VIA EMPRESA")}
            </div>

            {/* Separator */}
            <div className="relative py-1 flex items-center justify-center print-hidden">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-dashed border-slate-700 print:border-black" />
              </div>
              <span className="relative px-3 bg-slate-950 print:bg-white text-[10px] font-bold text-slate-500 print:text-black uppercase tracking-wider font-mono">
                Recorte Aqui -------------------------------------
              </span>
            </div>
            
            <div className="hidden print:block border-b border-dashed border-black py-1 text-center text-[7px] text-black font-mono leading-none">
              CORTAR AQUI E ENTREGAR VIA CLIENTE ABAIXO
            </div>

            {/* Copy 2: VIA CLIENTE */}
            <div className="print-copy-container print:h-auto print:max-h-none print:overflow-visible print:box-border print:mt-4">
              {renderA4Sheet("VIA CLIENTE")}
            </div>
          </div>
        )
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
            <div>Data {docType === "encerramento" ? "Saída" : "Entrada"}: {
              docType === "encerramento" && checklistObj.billingDate
                ? new Date(checklistObj.billingDate).toLocaleDateString("pt-BR") + " às " + new Date(checklistObj.billingDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : new Date(os.createdAt).toLocaleDateString("pt-BR") + " às " + new Date(os.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            }</div>
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

          {/* Defeito Relatado / Checklist (If Abertura or Completo) */}
          {(docType === "abertura" || docType === "completo") && (
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
          )}

          {/* Laudo Técnico / Peças / Resumo Financeiro (If Encerramento or Completo) */}
          {(docType === "encerramento" || docType === "completo") && (
            <>
              <div className="space-y-0.5 border-b border-dashed border-black pb-2 text-[9px]">
                <div className="font-bold uppercase text-[10px]">Laudo Técnico:</div>
                <div className="italic leading-normal">{os.technicalReport || "Serviço efetuado."}</div>
              </div>

              {(partName || os.items.length > 0) && (
                <div className="space-y-1 border-b border-dashed border-black pb-2 text-[9px]">
                  <div className="font-bold uppercase text-[10px]">Peças:</div>
                  {partName && (
                    <div className="leading-snug font-bold uppercase">
                      • {partName}
                    </div>
                  )}
                  {os.items.map((item) => {
                    const isCustom = item.product.sku.startsWith("OS-CUSTOM");
                    const displayName = isCustom ? item.product.name.replace(/ \(O\.S\. #\d+\)$/, "") : item.product.name;
                    return (
                      <div key={item.id} className="leading-snug">
                        • {displayName} (x{item.quantity})
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Financial Ticket Summary */}
              <div className="space-y-1 border-b border-dashed border-black pb-2 text-[10px]">
                <div className="flex justify-between">
                  <span>Mão de Obra:</span>
                  <span>R$ {os.servicePrice.toFixed(2)}</span>
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

          {/* Termos de Entrada (Abertura ou Completo) */}
          {(docType === "abertura" || docType === "completo") && (
            <div className="text-[9px] border-b border-dashed border-black pb-2 leading-normal space-y-1 text-black">
              <div className="font-bold text-[10px] uppercase text-center">Termos de Recebimento e Condições de Serviço</div>
              <div className="text-justify whitespace-pre-line font-medium">{intakeTerms}</div>
            </div>
          )}

          {/* Termos de Garantia / Encerramento (Encerramento ou Completo) */}
          {(docType === "encerramento" || docType === "completo") && (
            <div className="text-[9px] border-b border-dashed border-black pb-2 leading-normal space-y-1 text-black">
              <div className="font-bold text-[10px] uppercase text-center">Termos de Garantia e Aceite de Retirada</div>
              
              {os.warrantyPeriod > 0 && (
                <div className="bg-slate-100 p-1 rounded font-bold text-[8.5px] space-y-0.5 mb-1 text-black">
                  <div>GARANTIA: {os.warrantyPeriod} DIAS</div>
                  {os.warrantyExpiresAt && <div>VALIDADE: {new Date(os.warrantyExpiresAt).toLocaleDateString("pt-BR")}</div>}
                  {os.warrantyTerms && <div>CONDIÇÕES ESPECÍFICAS: {os.warrantyTerms.toUpperCase()}</div>}
                </div>
              )}

              <div className="text-justify whitespace-pre-line font-medium">{deliveryTerms}</div>
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

"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  Smartphone, Clipboard, CheckSquare, Wrench, Shield, 
  DollarSign, Loader2, Save, Printer, Plus, Trash2, X, 
  Check, CreditCard, ChevronRight, Info, AlertTriangle 
} from "lucide-react";
import { 
  updateServiceOrderAction, 
  updateServiceOrderTechnicalAction,
  updateServiceOrderCostAction,
  finishAndBillServiceOrderAction,
  cancelServiceOrderAction,
  updateServiceOrderPartAction,
  reopenServiceOrderAction
} from "../../../actions/os";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  phone: string;
  document: string | null;
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

interface ServiceOrder {
  id: string;
  osNumber: number;
  clientId: string;
  userId: string | null;
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
  cost: number; // Custo terceirizado / insumos adicionais
  paymentMethod: string | null;
  installments: number;
  cardFee: number;
  warrantyPeriod: number;
  warrantyTerms: string | null;
  warrantyStatus: string;
  warrantyExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client: Client;
  items: ServiceOrderItem[];
  user: { name: string } | null;
}

interface AvailablePart {
  productId: string;
  name: string;
  sku: string;
  price: number;
  cost?: number;
  quantity: number;
}

interface User {
  id: string;
  name: string;
}

interface OSEditorClientProps {
  os: ServiceOrder;
  clients: Client[];
  availableParts: AvailablePart[];
  users?: User[];
}

const statusMap: Record<string, { label: string; color: string }> = {
  BUDGET: { label: "Orçamento", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  WAITING_APPROVAL: { label: "Aguardando Aprovação", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  WAITING_PARTS: { label: "Aguardando Peças", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  IN_PROGRESS: { label: "Em Execução", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  COMPLETED: { label: "Pronta / Testada", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  DELIVERED: { label: "Entregue e Finalizada", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  UNREPAIRABLE: { label: "Sem Conserto", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const CHECKLIST_ITEMS = [
  "Touch / Tela", "Carregamento", "Alto-falante Principal", "Alto-falante Auricular",
  "Microfone", "Câmera Frontal", "Câmera Traseira", "Botão Power",
  "Botões Volume", "Wi-Fi", "Bluetooth / Rede", "Sensor Biométrico"
];

export default function OSEditorClient({ os, clients, availableParts, users }: OSEditorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"general" | "technical" | "parts" | "billing">("general");
  const [globalMessage, setGlobalMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- TAB 1: General & Checklist State ---
  const [generalForm, setGeneralForm] = useState({
    clientId: os.clientId,
    equipmentType: os.equipmentType,
    equipmentBrand: os.equipmentBrand,
    equipmentModel: os.equipmentModel,
    equipmentSerial: os.equipmentSerial || "",
    equipmentColor: os.equipmentColor || "",
    equipmentPassword: os.equipmentPassword || "",
    reportedDefect: os.reportedDefect,
    physicalState: os.physicalState || "",
    accessories: os.accessories || "",
  });
  
  const [checklist, setChecklist] = useState<Record<string, "OK" | "BAD" | "NONE">>(() => {
    try {
      const parsed = JSON.parse(os.checklist);
      const initial: Record<string, "OK" | "BAD" | "NONE"> = {};
      CHECKLIST_ITEMS.forEach((item) => {
        initial[item] = parsed[item] || "NONE";
      });
      return initial;
    } catch {
      const initial: Record<string, "OK" | "BAD" | "NONE"> = {};
      CHECKLIST_ITEMS.forEach((item) => {
        initial[item] = "NONE";
      });
      return initial;
    }
  });

  const toggleChecklist = (item: string) => {
    if (os.status === "DELIVERED") return;
    setChecklist((prev) => {
      const current = prev[item];
      let next: "OK" | "BAD" | "NONE" = "NONE";
      if (current === "NONE") next = "OK";
      else if (current === "OK") next = "BAD";
      return { ...prev, [item]: next };
    });
  };

  const handleUpdateGeneral = async () => {
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await updateServiceOrderAction(os.id, {
        ...generalForm,
        checklistJson: JSON.stringify(checklist),
      });

      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Dados gerais da O.S. atualizados com sucesso!", type: "success" });
        router.refresh();
      }
    });
  };

  // Parse checklist to get custom technicianName if present
  let initialChecklistObj: Record<string, any> = {};
  try {
    initialChecklistObj = JSON.parse(os.checklist || "{}");
  } catch {
    initialChecklistObj = {};
  }
  const savedTechName = initialChecklistObj.technicianName || os.user?.name || "";
  const savedCardPrice = initialChecklistObj.cardServicePrice !== undefined && initialChecklistObj.cardServicePrice !== null 
    ? String(initialChecklistObj.cardServicePrice) 
    : String(os.servicePrice);

  // --- TAB 2: Technical Report State ---
  const [techForm, setTechForm] = useState({
    technicalReport: os.technicalReport || "",
    servicePrice: String(os.servicePrice),
    cardServicePrice: savedCardPrice,
    status: os.status,
    warrantyPeriod: String(os.warrantyPeriod),
    warrantyTerms: os.warrantyTerms || "Garantia legal de 90 dias cobrindo defeitos das peças substituídas sob uso normal. Não cobre danos por queda, mau uso ou contato com líquidos.",
    userId: os.userId || "",
    technicianName: savedTechName,
  });

  const handleUpdateTechnical = async () => {
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await updateServiceOrderTechnicalAction(
        os.id,
        techForm.technicalReport,
        parseFloat(techForm.servicePrice) || 0,
        techForm.status,
        parseInt(techForm.warrantyPeriod, 10) || 0,
        techForm.warrantyTerms,
        techForm.userId || undefined,
        techForm.technicianName,
        parseFloat(techForm.cardServicePrice) || 0
      );

      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Laudo técnico e valores atualizados!", type: "success" });
        router.refresh();
      }
    });
  };

  // --- O.S. Cost Launcher State & Action ---
  const [osCost, setOsCost] = useState(String(os.cost || 0));
  const handleUpdateCost = async () => {
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await updateServiceOrderCostAction(os.id, parseFloat(osCost) || 0);
      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Custo da O.S. atualizado com sucesso!", type: "success" });
        router.refresh();
      }
    });
  };

  // --- TAB 3: Simple Part Name & Cost State ---
  const [partNameInput, setPartNameInput] = useState(initialChecklistObj.partName || "");
  const [partCostInput, setPartCostInput] = useState(String(os.partsPrice || 0));

  const handleUpdatePart = async () => {
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await updateServiceOrderPartAction(
        os.id,
        partNameInput,
        parseFloat(partCostInput) || 0
      );
      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Dados da peça e custo atualizados!", type: "success" });
        router.refresh();
      }
    });
  };

  // --- TAB 4: Billing & Checkout State ---
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [billDiscount, setBillDiscount] = useState(String(os.discount));
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [installments, setInstallments] = useState("1");
  const [cardFee, setCardFee] = useState("0");

  const isCardPayment = paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD";
  const activeLaborPrice = os.status === "DELIVERED"
    ? os.servicePrice
    : (isCardPayment
        ? (parseFloat(techForm.cardServicePrice) || os.servicePrice)
        : (parseFloat(techForm.servicePrice) || os.servicePrice));

  const partsPriceNum = os.partsPrice;
  const discountNum = parseFloat(billDiscount) || 0;
  const prepaymentNum = os.prepayment;
  
  const finalTotalAmount = os.status === "DELIVERED"
    ? os.totalAmount
    : (activeLaborPrice - discountNum);
  const remainderToPay = os.status === "DELIVERED"
    ? Math.max(0, os.totalAmount - os.prepayment)
    : Math.max(0, finalTotalAmount - prepaymentNum);

  const totalPartsCost = os.partsPrice || 0;
  const outsourcedCost = parseFloat(osCost) || 0;
  const consolidatedCost = totalPartsCost + outsourcedCost;
  const netProfit = finalTotalAmount - consolidatedCost;
  const margin = finalTotalAmount > 0 ? (netProfit / finalTotalAmount) * 100 : 0;

  const handleBillCheckout = async () => {
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await finishAndBillServiceOrderAction(
        os.id,
        paymentMethod,
        parseFloat(cardFee) || 0,
        parseInt(installments, 10) || 1,
        discountNum,
        parseFloat(techForm.servicePrice) || 0,
        parseFloat(techForm.cardServicePrice) || 0
      );

      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
        setCheckoutModalOpen(false);
      } else {
        setCheckoutModalOpen(false);
        router.push(`/os/imprimir/${os.id}`);
      }
    });
  };

  const handleCancelOS = async () => {
    if (!confirm("Deseja marcar esta O.S. como sem conserto/cancelada?")) return;
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await cancelServiceOrderAction(os.id);
      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Status alterado para Sem Conserto.", type: "success" });
        router.refresh();
      }
    });
  };

  const handleReopenOS = async () => {
    if (!confirm("Tem certeza que deseja reabrir esta Ordem de Serviço? Os lançamentos de faturamento no caixa atual e as baixas de estoque físico correspondentes serão estornados/excluídos.")) return;
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await reopenServiceOrderAction(os.id);
      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Ordem de Serviço reaberta com sucesso! Agora você pode editar os dados e faturar novamente.", type: "success" });
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with quick stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#090e1a] border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-extrabold text-indigo-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
              O.S. #{String(os.osNumber).padStart(4, "0")}
            </span>
            <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold border rounded-md ${statusMap[os.status]?.color || "bg-slate-800 text-slate-300"}`}>
              {statusMap[os.status]?.label || os.status}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Cliente: <span className="text-white font-bold">{os.client.name}</span> | Aparelho: <span className="text-white font-bold">{os.equipmentBrand} {os.equipmentModel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/os/imprimir/${os.id}`}>
            <Button variant="secondary" className="border border-slate-800 bg-[#0f172a] text-slate-300 hover:text-white" icon={Printer}>
              Imprimir Via
            </Button>
          </Link>
          {os.status === "DELIVERED" && (
            <Button 
              onClick={handleReopenOS} 
              variant="ghost" 
              className="text-amber-400 hover:bg-amber-500/10 border border-amber-500/10 font-bold"
              disabled={isPending}
            >
              {isPending ? "Reabrindo..." : "Reabrir O.S."}
            </Button>
          )}
          {os.status !== "DELIVERED" && (
            <Button 
              onClick={handleCancelOS} 
              variant="ghost" 
              className="text-rose-400 hover:bg-rose-500/10 border border-rose-500/10"
              disabled={isPending}
            >
              Sem Conserto
            </Button>
          )}
        </div>
      </div>

      {globalMessage && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
          globalMessage.type === "success" 
            ? "bg-green-500/10 border-green-500/20 text-green-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {globalMessage.type === "success" ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{globalMessage.text}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "general" ? "border-indigo-500 text-indigo-400 bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Dados & Checklist</span>
        </button>

        <button
          onClick={() => setActiveTab("technical")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "technical" ? "border-indigo-500 text-indigo-400 bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Laudo & Diagnóstico</span>
        </button>

        <button
          onClick={() => setActiveTab("parts")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "parts" ? "border-indigo-500 text-indigo-400 bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>Peça Aplicada</span>
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "billing" ? "border-indigo-500 text-indigo-400 bg-indigo-500/5" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Faturamento & Caixa</span>
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl">

        {/* Tab 1: General Info & Checklist */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Dados Gerais & Aparelho</span>
            </h3>

            {/* Client retro-update selector */}
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Vincular a Outro Cliente
              </label>
              <select
                value={generalForm.clientId}
                disabled={os.status === "DELIVERED"}
                onChange={(e) => setGeneralForm((prev) => ({ ...prev, clientId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Device specs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo Aparelho</label>
                <select
                  value={generalForm.equipmentType}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, equipmentType: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="Smartphone">Celular / Smartphone</option>
                  <option value="Console">Console de Games</option>
                  <option value="Notebook">Notebook / Desktop</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Smartwatch">Smartwatch</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                <input
                  type="text"
                  value={generalForm.equipmentBrand}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, equipmentBrand: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modelo</label>
                <input
                  type="text"
                  value={generalForm.equipmentModel}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, equipmentModel: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Série / IMEI</label>
                <input
                  type="text"
                  value={generalForm.equipmentSerial}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, equipmentSerial: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cor</label>
                <input
                  type="text"
                  value={generalForm.equipmentColor}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, equipmentColor: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Senha Desbloqueio</label>
                <input
                  type="text"
                  value={generalForm.equipmentPassword}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, equipmentPassword: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Defects & States */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Defeito Relatado</label>
                <textarea
                  value={generalForm.reportedDefect}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, reportedDefect: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Físico / Detalhes Visuais</label>
                <textarea
                  value={generalForm.physicalState}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, physicalState: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acessórios Deixados</label>
                <input
                  type="text"
                  value={generalForm.accessories}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setGeneralForm((prev) => ({ ...prev, accessories: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Checklist Visual */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Check-up Técnico de Recebimento</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Clique nos botões para mudar o status de teste (Não Testado / OK / Com Defeito).</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CHECKLIST_ITEMS.map((item) => {
                  const state = checklist[item];
                  let btnClass = "border-slate-800 bg-[#0f172a] text-slate-400 hover:bg-slate-800/40";
                  if (state === "OK") {
                    btnClass = "border-green-500/30 bg-green-500/10 text-green-400 shadow-sm";
                  } else if (state === "BAD") {
                    btnClass = "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-sm";
                  }

                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={os.status === "DELIVERED"}
                      onClick={() => toggleChecklist(item)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 text-left disabled:opacity-75 disabled:pointer-events-none ${btnClass}`}
                    >
                      <span>{item}</span>
                      <span className="text-[9px] font-extrabold uppercase font-mono tracking-wider ml-1">
                        {state === "NONE" ? "N/T" : state}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save general updates */}
            {os.status !== "DELIVERED" && (
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button
                  onClick={handleUpdateGeneral}
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  icon={Save}
                >
                  {isPending ? "Salvando..." : "Atualizar Aparelho & Checklist"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Technical Report & Status */}
        {activeTab === "technical" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Wrench className="w-4 h-4 text-indigo-400" />
              <span>Laudo Técnico & Mão de Obra</span>
            </h3>

            {/* Status Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Status da Ordem de Serviço
                </label>
                <select
                  value={techForm.status}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setTechForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-bold text-white"
                >
                  <option value="BUDGET">Orçamento</option>
                  <option value="WAITING_APPROVAL">Aguardando Aprovação do Cliente</option>
                  <option value="WAITING_PARTS">Aguardando Peças de Reposição</option>
                  <option value="IN_PROGRESS">Em Execução</option>
                  <option value="COMPLETED">Pronta / Testada</option>
                  <option value="UNREPAIRABLE">Sem Conserto / Cancelada</option>
                  {os.status === "DELIVERED" && <option value="DELIVERED">Entregue e Finalizada</option>}
                </select>
              </div>

              {/* Service Labor price - Cash */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Mão de Obra à Vista (Dinheiro/PIX)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={techForm.servicePrice}
                    disabled={os.status === "DELIVERED"}
                    onChange={(e) => setTechForm((prev) => ({ ...prev, servicePrice: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono font-bold text-white"
                  />
                </div>
              </div>

              {/* Service Labor price - Card */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Mão de Obra no Cartão (Crédito/Débito)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={techForm.cardServicePrice}
                    disabled={os.status === "DELIVERED"}
                    onChange={(e) => setTechForm((prev) => ({ ...prev, cardServicePrice: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono font-bold text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Técnico Responsável */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Técnico Responsável
                </label>
                <input
                  type="text"
                  placeholder="Nome do técnico responsável..."
                  value={techForm.technicianName}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setTechForm((prev) => ({ ...prev, technicianName: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-bold text-white"
                />
              </div>
            </div>

            {/* O.S. Cost section (Sempre editável!) */}
            <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Custos Terceirizados / Insumos da O.S. (Lançável Depois)</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Preencha aqui o custo de serviços terceirizados, laboratórios de apoio ou insumos adicionais aplicados nesta assistência. Este valor é somado ao custo das peças e deduzido do faturamento no painel financeiro para calcular o lucro líquido real.
              </p>
              <div className="flex flex-col md:flex-row gap-4 items-end max-w-md">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Custo Terceirizado / Adicional (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={osCost}
                      onChange={(e) => setOsCost(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdateCost}
                  disabled={isPending}
                  className="bg-amber-600 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/20 text-white font-bold px-5 py-2.5 rounded-xl text-xs shrink-0 cursor-pointer active:scale-95 transition-all"
                >
                  {isPending ? "Salvando..." : "Salvar Custo"}
                </Button>
              </div>
            </div>

            {/* Technical Diagnostic Report */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Laudo Técnico / Diagnóstico de Reparo
              </label>
              <textarea
                value={techForm.technicalReport}
                disabled={os.status === "DELIVERED"}
                onChange={(e) => setTechForm((prev) => ({ ...prev, technicalReport: e.target.value }))}
                placeholder="Descreva o que foi analisado, peças danificadas, serviço efetuado..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-medium leading-relaxed"
              />
            </div>

            {/* Warranty Setup */}
            <div className="border-t border-slate-800/80 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Configuração de Garantia da Assistência</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Prazo (Dias)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 90"
                    value={techForm.warrantyPeriod}
                    disabled={os.status === "DELIVERED"}
                    onChange={(e) => setTechForm((prev) => ({ ...prev, warrantyPeriod: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono"
                  />
                </div>
                
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Termos e Condições da Garantia</label>
                  <input
                    type="text"
                    value={techForm.warrantyTerms}
                    disabled={os.status === "DELIVERED"}
                    onChange={(e) => setTechForm((prev) => ({ ...prev, warrantyTerms: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              {os.status === "DELIVERED" && os.warrantyExpiresAt && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>
                    Garantia válida até <strong>{new Date(os.warrantyExpiresAt).toLocaleDateString("pt-BR")}</strong> ({os.warrantyStatus})
                  </span>
                </div>
              )}
            </div>

            {/* Save Tech updates */}
            {os.status !== "DELIVERED" && (
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <Button
                  onClick={handleUpdateTechnical}
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  icon={Save}
                >
                  {isPending ? "Salvando..." : "Salvar Laudo & Status"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Peça Aplicada & Custo */}
        {activeTab === "parts" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clipboard className="w-4 h-4 text-indigo-400" />
              <span>Peça Aplicada & Custo de Aquisição</span>
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Informe o nome da peça substituída e o respectivo preço de custo de aquisição. 
              Este valor <strong>não é cobrado do cliente</strong> (pois já está embutido no valor da mão de obra), 
              mas é <strong>debitado automaticamente do seu faturamento</strong> no fechamento do caixa para calcular o lucro líquido real.
            </p>

            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-4 items-end">
              {/* Part Name */}
              <div className="space-y-1.5 flex-[2] w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nome da Peça Trocada</label>
                <input
                  type="text"
                  placeholder="Ex: Tela Frontal iPhone 11 OEM..."
                  value={partNameInput}
                  disabled={os.status === "DELIVERED"}
                  onChange={(e) => setPartNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-bold text-white"
                />
              </div>

              {/* Part Cost */}
              <div className="space-y-1.5 flex-1 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Preço de Custo da Peça (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={partCostInput}
                    disabled={os.status === "DELIVERED"}
                    onChange={(e) => setPartCostInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono font-bold text-white"
                  />
                </div>
              </div>

              {/* Save Button */}
              {os.status !== "DELIVERED" && (
                <Button
                  onClick={handleUpdatePart}
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-[42px] px-5 py-2.5 rounded-xl shrink-0 cursor-pointer active:scale-95 transition-all w-full md:w-auto"
                  icon={Save}
                >
                  {isPending ? "Salvando..." : "Salvar Peça"}
                </Button>
              )}
            </div>

            {/* Visual Feedback Box */}
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-2 text-xs">
              <h4 className="font-bold text-indigo-400 uppercase tracking-wider text-[10px]">Informações Atuais da O.S.</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400">Peça Registrada: </span>
                  <span className="font-semibold text-white">{initialChecklistObj.partName ? initialChecklistObj.partName : "Nenhuma registrada"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Custo Registrado: </span>
                  <span className="font-mono font-bold text-amber-500">R$ {(os.partsPrice || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Checkout, Billing and Cashier integration */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              <span>Resumo do Orçamento & Fechamento Financeiro</span>
            </h3>

            {/* Breakdown board */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Receipt / Invoice calculations */}
              <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-800/80 pb-2">Resumo Financeiro (Valor Final)</h4>
                  
                  <div className="space-y-2.5 text-xs mt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mão de Obra (Serviço):</span>
                      <span className="font-mono text-slate-200 font-semibold">R$ {activeLaborPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Peças Aplicadas:</span>
                      <span className="font-mono text-slate-200 font-semibold">R$ 0,00 <span className="text-[10px] text-slate-500 font-bold">(Inclusas no serviço)</span></span>
                    </div>

                    {prepaymentNum > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Sinal / Adiantamento:</span>
                        <span className="font-mono">- R$ {prepaymentNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {/* Discount option */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                      <span className="text-slate-400">Desconto Concedido:</span>
                      <div className="relative max-w-[120px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[10px]">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={billDiscount}
                          disabled={os.status === "DELIVERED"}
                          onChange={(e) => setBillDiscount(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between border-t border-slate-800 pt-3 text-sm">
                      <span className="text-slate-300 font-bold uppercase tracking-wider">Total Cobrado (Valor Final):</span>
                      <span className="font-mono text-white font-extrabold text-sm">R$ {finalTotalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between border-t border-slate-800 pt-3 text-base">
                      <span className="text-indigo-400 font-extrabold uppercase tracking-wider">Saldo a Receber:</span>
                      <span className="font-mono text-indigo-400 font-black">R$ {remainderToPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Detalhamento Contábil (Custo & Lucro) */}
                <div className="border-t border-slate-800 pt-4 mt-4 space-y-2.5 text-xs">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px] pb-1 flex items-center gap-1.5 text-indigo-400">
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Detalhamento Contábil (Custo & Lucro)</span>
                  </h4>
                  
                  <div className="flex justify-between">
                    <span className="text-slate-400">Custo das Peças (Estoque):</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      R$ {totalPartsCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Custo Terceirizado / Adicional:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      R$ {outsourcedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-800/60 pt-1.5">
                    <span className="text-slate-400 font-bold">Custo Total Consolidado:</span>
                    <span className="font-mono text-slate-200 font-bold">
                      R$ {consolidatedCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-800 pt-2 text-xs">
                    <span className="text-indigo-400 font-bold uppercase tracking-wider">Lucro Líquido Real da O.S.:</span>
                    <span className="font-mono text-indigo-400 font-black text-sm">
                      R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Margem de Lucro:</span>
                    <span className="font-mono text-slate-400 font-semibold">
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Checkout billing state info */}
              <div className="bg-slate-950/30 border border-slate-800/50 rounded-2xl p-6 flex flex-col justify-between">
                
                {os.status === "DELIVERED" ? (
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg">
                      <Check className="w-4 h-4" />
                      <span>Faturada e Entregue</span>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-300">
                      <p>
                        Esta Ordem de Serviço foi finalizada e entregue. As baixas de estoque físico e os lançamentos de fluxo de caixa foram efetuados.
                      </p>
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-[11px] font-mono space-y-1.5">
                        <div>Método: <strong>{os.paymentMethod === "CASH" ? "Dinheiro" : os.paymentMethod === "PIX" ? "PIX" : os.paymentMethod === "CREDIT_CARD" ? "Crédito" : "Débito"}</strong></div>
                        <div>Parcelas: <strong>{os.installments}x</strong></div>
                        {os.cardFee > 0 && <div>Taxas Cartão: <strong>R$ {os.cardFee.toFixed(2)}</strong></div>}
                        <div>Data Faturam: <strong>{new Date(os.updatedAt).toLocaleDateString("pt-BR")}</strong></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1">
                        <Info className="w-4 h-4 text-indigo-400" />
                        <span>Instruções de Faturamento</span>
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Ao clicar em faturar, o sistema deduzirá automaticamente as peças do estoque físico, registrará as movimentações e criará os lançamentos de receita e custos CMV correspondentes no caixa aberto.
                      </p>
                    </div>

                    <Button
                      onClick={() => setCheckoutModalOpen(true)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center gap-2"
                      icon={CreditCard}
                    >
                      Faturar & Entregar O.S.
                    </Button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Checkout Dialog Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090e1a] border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#030712] border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Confirmar Pagamento & Saída
              </h3>
              <button 
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-4">
              
              {/* Balance due summary banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Restante a Cobrar</span>
                  <span className="text-2xl font-black text-indigo-400 font-mono">
                    R$ {remainderToPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {prepaymentNum > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Sinal Já Pago:</span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">R$ {prepaymentNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Payment Method Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="CASH">Dinheiro (Espécie)</option>
                  <option value="PIX">Pix Transferência</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="DEBIT_CARD">Cartão de Débito</option>
                </select>
              </div>

              {/* Installments & Fees for Cards */}
              {(paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD") && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Qty of installments */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Parcelas</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                    >
                      <option value="1">1x à vista</option>
                      <option value="2">2x</option>
                      <option value="3">3x</option>
                      <option value="4">4x</option>
                      <option value="6">6x</option>
                      <option value="12">12x</option>
                    </select>
                  </div>

                  {/* Card fee */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Taxa da Maquininha (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={cardFee}
                      onChange={(e) => setCardFee(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Warning about stock / physical dispatch */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-[10px] leading-relaxed flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Ao confirmar, o caixa registrará a receita de R$ {remainderToPay.toFixed(2)}, baixará o estoque de todas as peças e ativará o certificado de garantia por {techForm.warrantyPeriod} dias.
                </span>
              </div>

              {/* Checkout actions */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-6 mt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setCheckoutModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleBillCheckout}
                  disabled={isPending}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold"
                >
                  {isPending ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Faturando...</span>
                    </div>
                  ) : (
                    <span>Confirmar Faturamento</span>
                  )}
                </Button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

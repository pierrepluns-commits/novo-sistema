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
  addPartToServiceOrderAction,
  removePartFromServiceOrderAction,
  finishAndBillServiceOrderAction,
  cancelServiceOrderAction
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
  product: {
    name: string;
    sku: string;
  };
}

interface ServiceOrder {
  id: string;
  osNumber: number;
  clientId: string;
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
  warrantyExpiresAt: Date | null;
  createdAt: Date;
  client: Client;
  items: ServiceOrderItem[];
}

interface AvailablePart {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface OSEditorClientProps {
  os: ServiceOrder;
  clients: Client[];
  availableParts: AvailablePart[];
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

export default function OSEditorClient({ os, clients, availableParts }: OSEditorClientProps) {
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

  // --- TAB 2: Technical Report State ---
  const [techForm, setTechForm] = useState({
    technicalReport: os.technicalReport || "",
    servicePrice: String(os.servicePrice),
    status: os.status,
    warrantyPeriod: String(os.warrantyPeriod),
    warrantyTerms: os.warrantyTerms || "Garantia legal de 90 dias cobrindo defeitos das peças substituídas sob uso normal. Não cobre danos por queda, mau uso ou contato com líquidos.",
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
        techForm.warrantyTerms
      );

      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Laudo técnico e valores atualizados!", type: "success" });
        router.refresh();
      }
    });
  };

  // --- TAB 3: Parts Budgeting State ---
  const [partSearch, setPartSearch] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partPrice, setPartPrice] = useState("");
  const [selectedPart, setSelectedPart] = useState<AvailablePart | null>(null);
  const [filteredParts, setFilteredParts] = useState<AvailablePart[]>([]);

  const handlePartSearch = (query: string) => {
    setPartSearch(query);
    if (!query.trim()) {
      setFilteredParts([]);
      return;
    }
    const matches = availableParts.filter(
      (p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredParts(matches);
  };

  const selectPart = (part: AvailablePart) => {
    setSelectedPart(part);
    setPartSearch(part.name);
    setPartPrice(String(part.price));
    setFilteredParts([]);
  };

  const handleAddPart = async () => {
    setGlobalMessage(null);
    if (!selectedPart) {
      setGlobalMessage({ text: "Selecione uma peça em estoque.", type: "error" });
      return;
    }

    const qty = parseInt(partQty, 10);
    const price = parseFloat(partPrice);
    if (isNaN(qty) || qty <= 0) {
      setGlobalMessage({ text: "Quantidade inválida.", type: "error" });
      return;
    }
    if (isNaN(price) || price < 0) {
      setGlobalMessage({ text: "Preço inválido.", type: "error" });
      return;
    }

    startTransition(async () => {
      const res = await addPartToServiceOrderAction(os.id, selectedPart.productId, qty, price);
      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Peça adicionada ao orçamento!", type: "success" });
        setSelectedPart(null);
        setPartSearch("");
        setPartPrice("");
        setPartQty("1");
        router.refresh();
      }
    });
  };

  const handleRemovePart = async (itemId: string) => {
    if (!confirm("Remover esta peça do orçamento?")) return;
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await removePartFromServiceOrderAction(itemId);
      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
      } else {
        setGlobalMessage({ text: "Peça removida com sucesso.", type: "success" });
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

  const servicePriceNum = parseFloat(techForm.servicePrice) || os.servicePrice;
  const partsPriceNum = os.partsPrice;
  const discountNum = parseFloat(billDiscount) || 0;
  const prepaymentNum = os.prepayment;
  
  const finalTotalAmount = servicePriceNum + partsPriceNum - discountNum;
  const remainderToPay = Math.max(0, finalTotalAmount - prepaymentNum);

  const handleBillCheckout = async () => {
    setGlobalMessage(null);
    startTransition(async () => {
      const res = await finishAndBillServiceOrderAction(
        os.id,
        paymentMethod,
        parseFloat(cardFee) || 0,
        parseInt(installments, 10) || 1,
        discountNum
      );

      if (res.error) {
        setGlobalMessage({ text: res.error, type: "error" });
        setCheckoutModalOpen(false);
      } else {
        setGlobalMessage({ text: "O.S. faturada, baixada no estoque e finalizada com sucesso!", type: "success" });
        setCheckoutModalOpen(false);
        setActiveTab("billing");
        router.refresh();
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
          <span>Orçamento Peças ({os.items.length})</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Service Labor price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Preço da Mão de Obra (Serviço)
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

        {/* Tab 3: Parts Budgeting & Stock */}
        {activeTab === "parts" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clipboard className="w-4 h-4 text-indigo-400" />
              <span>Orçamento & Aplicação de Peças</span>
            </h3>

            {/* Stock addition form */}
            {os.status !== "DELIVERED" && (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative">
                
                {/* Search piece */}
                <div className="md:col-span-2 space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Buscar Peça no Estoque</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquise por nome ou SKU..."
                      value={partSearch}
                      onChange={(e) => handlePartSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                    {selectedPart && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                        <span>Qtd Disp: {selectedPart.quantity}</span>
                      </div>
                    )}
                  </div>

                  {/* Dropdown list */}
                  {filteredParts.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#090e1a] border border-slate-800 rounded-xl max-h-52 overflow-y-auto z-40 shadow-2xl divide-y divide-slate-800/60 text-xs">
                      {filteredParts.map((p) => (
                        <div
                          key={p.productId}
                          onClick={() => selectPart(p)}
                          className="px-4 py-2.5 hover:bg-slate-800/40 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-white block">{p.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">SKU: {p.sku}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold block">R$ {p.price.toFixed(2)}</span>
                            <span className="text-slate-500 text-[10px] font-semibold">Estoque: {p.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Qty */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={partQty}
                    onChange={(e) => setPartQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none font-mono"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Preço Unitário (R$)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={partPrice}
                        onChange={(e) => setPartPrice(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none font-mono font-semibold"
                      />
                    </div>
                    <Button
                      onClick={handleAddPart}
                      disabled={isPending}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2.5 rounded-xl shrink-0"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

              </div>
            )}

            {/* List of applied parts */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#030712] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Item / Peça</th>
                    <th className="px-6 py-3">Quantidade</th>
                    <th className="px-6 py-3">Valor Unitário</th>
                    <th className="px-6 py-3">Valor Total</th>
                    {os.status !== "DELIVERED" && <th className="px-6 py-3 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {os.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-slate-500 italic">
                        Nenhuma peça aplicada a esta Ordem de Serviço ainda.
                      </td>
                    </tr>
                  ) : (
                    os.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/10">
                        <td className="px-6 py-3.5">
                          <span className="font-bold text-white block">{item.product.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">SKU: {item.product.sku}</span>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-sm font-bold text-white">{item.quantity}</td>
                        <td className="px-6 py-3.5 font-mono text-white">R$ {item.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-3.5 font-mono font-extrabold text-white">
                          R$ {(item.quantity * item.unitPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        {os.status !== "DELIVERED" && (
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleRemovePart(item.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="font-bold text-white uppercase tracking-wider text-xs border-b border-slate-800 pb-2">Valores</h4>
                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mão de Obra (Serviço):</span>
                    <span className="font-mono text-white font-semibold">R$ {servicePriceNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Peças Aplicadas:</span>
                    <span className="font-mono text-white font-semibold">R$ {partsPriceNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>

                  {prepaymentNum > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Sinal / Adiantamento:</span>
                      <span className="font-mono">- R$ {prepaymentNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  {/* Discount option */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                    <span className="text-slate-500">Desconto Concedido:</span>
                    <div className="relative max-w-[120px]">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-[10px]">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={billDiscount}
                        disabled={os.status === "DELIVERED"}
                        onChange={(e) => setBillDiscount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between border-t border-slate-800 pt-3 text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Total Final:</span>
                    <span className="font-mono text-white font-extrabold text-sm">R$ {finalTotalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between border-t border-slate-800 pt-3 text-base">
                    <span className="text-indigo-400 font-extrabold uppercase tracking-wider">Saldo a Receber:</span>
                    <span className="font-mono text-indigo-400 font-black">R$ {remainderToPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
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

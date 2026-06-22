"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  User, Search, Plus, Smartphone, CheckSquare, 
  DollarSign, Wrench, Shield, Clipboard, ArrowRight, Loader2, X, Check 
} from "lucide-react";
import { createServiceOrderAction } from "../../actions/os";
import { searchClientsAction, createClientAction } from "../../actions/client";

interface Client {
  id: string;
  name: string;
  phone: string;
  document: string | null;
}

const CHECKLIST_ITEMS = [
  "Touch / Tela",
  "Carregamento",
  "Alto-falante Principal",
  "Alto-falante Auricular",
  "Microfone",
  "Câmera Frontal",
  "Câmera Traseira",
  "Botão Power",
  "Botões Volume",
  "Wi-Fi",
  "Bluetooth / Rede",
  "Sensor Biométrico"
];

type ChecklistState = Record<string, "OK" | "BAD" | "NONE">;

export default function NovaOSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams?.get("clientId") || "";

  const [activeTab, setActiveTab] = useState<"equipment" | "defect" | "checkup" | "budget">("equipment");

  // Client Search & Selection
  const [clientQuery, setClientQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchingClients, setSearchingClients] = useState(false);

  // Quick Create Client Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isLojista, setIsLojista] = useState(false);
  const [clientForm, setClientForm] = useState({ name: "", phone: "", document: "", cep: "", street: "", number: "", complement: "" });
  const [clientFormError, setClientFormError] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  // Equipment Form
  const [equipment, setEquipment] = useState({
    type: "Smartphone", // Default
    brand: "",
    model: "",
    serial: "",
    color: "",
    password: "",
  });

  // Defect & State Form
  const [defect, setDefect] = useState({
    reportedDefect: "",
    physicalState: "",
    accessories: "",
  });

  // Checklist Grid
  const [checklist, setChecklist] = useState<ChecklistState>(() => {
    const initial: ChecklistState = {};
    CHECKLIST_ITEMS.forEach((item) => {
      initial[item] = "NONE";
    });
    return initial;
  });

  // Budget
  const [prepayment, setPrepayment] = useState("0");
  const [prepaymentMethod, setPrepaymentMethod] = useState("CASH");
  const [prepaymentCardFee, setPrepaymentCardFee] = useState("0");
  const [prepaymentInstallments, setPrepaymentInstallments] = useState("1");

  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Search client logic
  useEffect(() => {
    if (initialClientId) {
      // If client ID is preselected in the URL, fetch them
      fetchSingleClient(initialClientId);
    }
  }, [initialClientId]);

  const fetchSingleClient = async (id: string) => {
    // Standard query for client ID
    try {
      const res = await searchClientsAction(" "); // Fetch some clients
      const found = res.find((c: any) => c.id === id);
      if (found) {
        setSelectedClient(found as any);
        setClientQuery(found.name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClientSearch = async (query: string) => {
    setClientQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingClients(true);
    try {
      const res = await searchClientsAction(query);
      setSearchResults(res as any);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingClients(false);
    }
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setClientQuery(client.name);
    setSearchResults([]);
  };

  const handleClientCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const clean = val.replace(/\D/g, "");
    
    let formatted = val;
    if (clean.length > 5) {
      formatted = `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
    } else {
      formatted = clean;
    }

    setClientForm((prev) => ({ ...prev, cep: formatted }));

    if (clean.length === 8) {
      const fetchAddress = async () => {
        try {
          const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
          const data = await res.json();
          if (!data.erro) {
            setClientForm((prev) => ({
              ...prev,
              street: `${data.logradouro}${data.bairro ? ` - ${data.bairro}` : ""}${data.localidade ? `, ${data.localidade}` : ""}${data.uf ? ` - ${data.uf}` : ""}`,
            }));
          }
        } catch (err) {
          console.error("Erro ao buscar CEP:", err);
        }
      };
      fetchAddress();
    }
  };

  // Quick Client Creation
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientFormError("");

    if (!clientForm.name.trim() || !clientForm.phone.trim()) {
      setClientFormError("Nome e Celular são obrigatórios.");
      return;
    }

    setSavingClient(true);
    try {
      // Build full address string
      const street = clientForm.street.trim();
      const number = clientForm.number.trim() || "S/N";
      const complement = clientForm.complement.trim();
      const fullAddress = street ? `${street}, ${number}${complement ? ` - ${complement}` : ""}` : "";

      let finalName = clientForm.name.trim();
      if (isLojista) {
        finalName = `${finalName} (Lojista)`;
      }

      const data = new FormData();
      data.append("name", finalName);
      data.append("phone", clientForm.phone);
      data.append("document", clientForm.document);
      data.append("cep", clientForm.cep);
      data.append("address", fullAddress);

      const res = await createClientAction(data);
      if (res.error) {
        setClientFormError(res.error);
      } else if (res.client) {
        setSelectedClient(res.client as any);
        setClientQuery(res.client.name);
        setIsClientModalOpen(false);
        setIsLojista(false);
        setClientForm({ name: "", phone: "", document: "", cep: "", street: "", number: "", complement: "" });
      }
    } catch (err: any) {
      setClientFormError(err.message);
    } finally {
      setSavingClient(false);
    }
  };

  // Checklist toggle helper: NONE -> OK -> BAD -> NONE
  const toggleChecklist = (item: string) => {
    setChecklist((prev) => {
      const current = prev[item];
      let next: "OK" | "BAD" | "NONE" = "NONE";
      if (current === "NONE") next = "OK";
      else if (current === "OK") next = "BAD";
      return { ...prev, [item]: next };
    });
  };

  // Save the complete OS
  const handleSaveOS = async () => {
    setGlobalError("");
    if (!selectedClient) {
      setGlobalError("Por favor, selecione ou cadastre um cliente.");
      setActiveTab("equipment");
      return;
    }
    if (!equipment.type || !equipment.brand || !equipment.model) {
      setGlobalError("Tipo, Marca e Modelo do aparelho são obrigatórios.");
      setActiveTab("equipment");
      return;
    }
    if (!defect.reportedDefect.trim()) {
      setGlobalError("O defeito relatado é obrigatório.");
      setActiveTab("defect");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        clientId: selectedClient.id,
        equipmentType: equipment.type,
        equipmentBrand: equipment.brand,
        equipmentModel: equipment.model,
        equipmentSerial: equipment.serial || undefined,
        equipmentColor: equipment.color || undefined,
        equipmentPassword: equipment.password || undefined,
        reportedDefect: defect.reportedDefect,
        physicalState: defect.physicalState || undefined,
        accessories: defect.accessories || undefined,
        checklistJson: JSON.stringify(checklist),
        prepayment: parseFloat(prepayment) || 0,
        prepaymentMethod: prepaymentMethod,
        prepaymentCardFee: prepaymentMethod === "CREDIT_CARD" || prepaymentMethod === "DEBIT_CARD" ? parseFloat(prepaymentCardFee) || 0 : 0,
        prepaymentInstallments: prepaymentMethod === "CREDIT_CARD" ? parseInt(prepaymentInstallments, 10) || 1 : 1,
      };

      const res = await createServiceOrderAction(data);
      if (res.error) {
        if (res.error === "CAIXA_DIA_ANTERIOR_ABERTO") {
          setGlobalError("Atenção: Existe um caixa de dia anterior aberto! Você precisa fechar o caixa do dia anterior antes de abrir uma nova Ordem de Serviço.");
        } else {
          setGlobalError(res.error);
        }
      } else {
        router.push(`/os/imprimir/${res.osId}`);
      }
    } catch (err: any) {
      setGlobalError("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Abertura & Triagem de O.S." showBack={true} />

      {globalError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-semibold flex items-center gap-2">
          <span>{globalError}</span>
        </div>
      )}

      {/* Tabs Wizards */}
      <div className="flex gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("equipment")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "equipment"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Cliente & Equipamento</span>
        </button>

        <button
          onClick={() => setActiveTab("defect")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "defect"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>Triagem & Defeito</span>
        </button>

        <button
          onClick={() => setActiveTab("checkup")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "checkup"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Check-up Técnico</span>
        </button>

        <button
          onClick={() => setActiveTab("budget")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 border-b-2 rounded-t-xl -mb-[2px] ${
            activeTab === "budget"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Entrada / Adiantamento</span>
        </button>
      </div>

      {/* Main Wizard Form Wrapper */}
      <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-4xl">
        
        {/* Tab 1: Equipment & Client */}
        {activeTab === "equipment" && (
          <div className="space-y-6">
            {/* Client Search/Select */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Vincular Cliente <span className="text-rose-500">*</span>
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    placeholder="Digite o nome, celular ou CPF do cliente..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  {selectedClient && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold px-2 py-0.5 rounded text-[10px]">
                      <Check className="w-3 h-3" />
                      <span>Selecionado</span>
                    </div>
                  )}
                </div>
                <Button 
                  type="button" 
                  onClick={() => setIsClientModalOpen(true)}
                  className="bg-[#1e293b] hover:bg-slate-800 text-white font-bold rounded-xl"
                  icon={Plus}
                >
                  Novo Cliente
                </Button>
              </div>

              {/* Client dropdown matches */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#090e1a] border border-slate-800 rounded-xl max-h-60 overflow-y-auto z-40 shadow-2xl divide-y divide-slate-800/60">
                  {searchResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectClient(c)}
                      className="px-4 py-2.5 hover:bg-slate-800/40 cursor-pointer flex justify-between items-center text-xs"
                    >
                      <div>
                        <div className="font-bold text-white text-sm">{c.name}</div>
                        {c.document && <div className="text-slate-500 font-mono mt-0.5">CPF: {c.document}</div>}
                      </div>
                      <div className="text-emerald-400 font-semibold">{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Device specs */}
            <div className="border-t border-slate-800/80 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Especificações do Equipamento</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Equipment Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Tipo de Aparelho <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={equipment.type}
                    onChange={(e) => setEquipment((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Smartphone">Celular / Smartphone</option>
                    <option value="Console">Console de Games</option>
                    <option value="Notebook">Notebook / Desktop</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Smartwatch">Smartwatch</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Marca do Fabricante <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Apple, Samsung, Sony..."
                    value={equipment.brand}
                    onChange={(e) => setEquipment((prev) => ({ ...prev, brand: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Modelo do Equipamento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: iPhone 13 Pro, PlayStation 5..."
                    value={equipment.model}
                    onChange={(e) => setEquipment((prev) => ({ ...prev, model: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Serial/IMEI */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nº de Série / IMEI
                  </label>
                  <input
                    type="text"
                    placeholder="S/N ou IMEI para garantia"
                    value={equipment.serial}
                    onChange={(e) => setEquipment((prev) => ({ ...prev, serial: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>

                {/* Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Cor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cinza Espacial, Branco..."
                    value={equipment.color}
                    onChange={(e) => setEquipment((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Password Lock */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha de Desbloqueio
                  </label>
                  <input
                    type="text"
                    placeholder="Caso necessário para testes"
                    value={equipment.password}
                    onChange={(e) => setEquipment((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setActiveTab("defect")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                icon={ArrowRight}
              >
                Continuar para Triagem
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Defect & Triagem */}
        {activeTab === "defect" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Clipboard className="w-4 h-4 text-indigo-400" />
              <span>Triagem no Balcão</span>
            </h3>

            {/* Reported Defect (Mandatory) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Defeito Relatado pelo Cliente <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={defect.reportedDefect}
                onChange={(e) => setDefect((prev) => ({ ...prev, reportedDefect: e.target.value }))}
                placeholder="Descreva detalhadamente o que o cliente relatou sobre o problema..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Physical State */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Estado Físico / Estético do Aparelho
              </label>
              <textarea
                value={defect.physicalState}
                onChange={(e) => setDefect((prev) => ({ ...prev, physicalState: e.target.value }))}
                placeholder="Ex: Trincados na tela, arranhões na tampa traseira, amassados..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Accessories Left */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Acessórios Deixados com o Aparelho
              </label>
              <input
                type="text"
                value={defect.accessories}
                onChange={(e) => setDefect((prev) => ({ ...prev, accessories: e.target.value }))}
                placeholder="Ex: Capinha protetora, carregador original, cabo USB, controle..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setActiveTab("equipment")}>
                Voltar
              </Button>
              <Button
                onClick={() => setActiveTab("checkup")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                icon={ArrowRight}
              >
                Ir para Check-up Técnico
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Checkup Grid */}
        {activeTab === "checkup" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>Check-up de Triagem Visual</span>
              </h3>
              <p className="text-xs text-slate-500">
                Toque nos itens para alternar o status dos testes rápidos efetuados no ato da entrega do aparelho.
              </p>
            </div>

            {/* Checklist items color buttons grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {CHECKLIST_ITEMS.map((item) => {
                const state = checklist[item];
                let btnClass = "border-slate-800 bg-[#0f172a] text-slate-400 hover:bg-slate-800/40";
                if (state === "OK") {
                  btnClass = "border-green-500/30 bg-green-500/10 text-green-400 shadow-md shadow-green-500/5";
                } else if (state === "BAD") {
                  btnClass = "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-md shadow-rose-500/5";
                }

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleChecklist(item)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 text-left ${btnClass}`}
                  >
                    <span>{item}</span>
                    <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider shrink-0 ml-1.5">
                      {state === "NONE" ? "Não testado" : state}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setActiveTab("defect")}>
                Voltar
              </Button>
              <Button
                onClick={() => setActiveTab("budget")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                icon={ArrowRight}
              >
                Informar Sinal / Entrada
              </Button>
            </div>
          </div>
        )}

        {/* Tab 4: Values and Save */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              <span>Sinal de Entrada (Opcional)</span>
            </h3>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl max-w-md space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Valor do Adiantamento / Sinal (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prepayment}
                    onChange={(e) => setPrepayment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {parseFloat(prepayment) > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Forma de Pagamento do Sinal
                    </label>
                    <select
                      value={prepaymentMethod}
                      onChange={(e) => setPrepaymentMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="CASH">Dinheiro (Espécie)</option>
                      <option value="PIX">Pix Transferência</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                      <option value="DEBIT_CARD">Cartão de Débito</option>
                    </select>
                  </div>

                  {(prepaymentMethod === "CREDIT_CARD" || prepaymentMethod === "DEBIT_CARD") && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Parcelas</label>
                        <select
                          value={prepaymentInstallments}
                          onChange={(e) => setPrepaymentInstallments(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-bold"
                        >
                          <option value="1">1x à vista</option>
                          <option value="2">2x</option>
                          <option value="3">3x</option>
                          <option value="4">4x</option>
                          <option value="6">6x</option>
                          <option value="12">12x</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Taxa da Maquininha (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={prepaymentCardFee}
                          onChange={(e) => setPrepaymentCardFee(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed">
                * Caso o cliente pague um sinal de entrada no balcão, o valor será contabilizado como receita de entrada no caixa atual e deduzido do fechamento final.
              </p>
            </div>

            {/* Summary */}
            <div className="border-t border-slate-800/80 pt-6 space-y-4 text-sm text-slate-300">
              <h4 className="font-bold text-white uppercase tracking-wider text-xs">Resumo da Triagem</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 border border-slate-800 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block">Cliente Selecionado:</span>
                  <span className="font-bold text-white">{selectedClient ? selectedClient.name : "Nenhum selecionado"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Equipamento:</span>
                  <span className="font-bold text-white">
                    {equipment.brand} {equipment.model} ({equipment.type})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-800 mt-6">
              <Button variant="secondary" onClick={() => setActiveTab("checkup")}>
                Voltar
              </Button>
              <Button
                onClick={handleSaveOS}
                disabled={isSaving}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20"
              >
                {isSaving ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Abrindo O.S...</span>
                  </div>
                ) : (
                  <span>Confirmar & Salvar O.S.</span>
                )}
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Quick Add Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090e1a] border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-[#030712] border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Cadastrar Novo Cliente
              </h3>
              <button 
                onClick={() => {
                  setIsClientModalOpen(false);
                  setIsLojista(false);
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
              {clientFormError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {clientFormError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={clientForm.name}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                  required
                />
              </div>

              {/* Lojista Checkbox */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="quickIsLojista"
                  checked={isLojista}
                  onChange={(e) => setIsLojista(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="quickIsLojista" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                  Este cliente é um Lojista (Parceiro comercial)
                </label>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Celular / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="(00) 90000-0000"
                  value={clientForm.phone}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono"
                  required
                />
              </div>

              {/* Document */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  CPF / CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Apenas números"
                  value={clientForm.document}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, document: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-mono"
                />
              </div>

              {/* CEP and Rua */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    CEP
                  </label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={clientForm.cep}
                    onChange={handleClientCepChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Rua / Logradouro
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da rua..."
                    value={clientForm.street}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, street: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Número and Complemento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Número
                    </label>
                    <button
                      type="button"
                      onClick={() => setClientForm((prev) => ({ ...prev, number: "S/N" }))}
                      className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider font-sans cursor-pointer"
                    >
                      Sem número
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: 123 ou S/N"
                    value={clientForm.number}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, number: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Complemento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Apto 12, Bloco C..."
                    value={clientForm.complement}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, complement: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-6 mt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsClientModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingClient}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold"
                >
                  {savingClient ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    <span>Cadastrar & Selecionar</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

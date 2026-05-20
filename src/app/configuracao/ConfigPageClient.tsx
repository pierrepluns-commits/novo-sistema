"use client";

import React, { useState } from "react";
import { 
  Settings, Printer, Building, ShieldCheck, Check, Save, 
  Plus, Edit2, Info, MapPin, Phone, FileText, AlertTriangle, X 
} from "lucide-react";
import toast from "react-hot-toast";
import { saveReceiptConfig, createStoreUnit, updateStoreUnit } from "@/app/actions/config";

interface ConfigPageClientProps {
  company: any;
  units: any[];
  license: any;
}

export function ConfigPageClient({ company, units: initialUnits, license }: ConfigPageClientProps) {
  const [activeTab, setActiveTab] = useState<"print" | "units">("print");
  const [units, setUnits] = useState(initialUnits);

  // Printing Configurations States
  const [header, setHeader] = useState(company.receiptHeader || "Obrigado pela preferência!");
  const [footer, setFooter] = useState(company.receiptFooter || "Volte sempre! Lumus ERP");
  
  const parsedConfig = (() => {
    try {
      return JSON.parse(company.receiptConfig || "{}");
    } catch (e) {
      return {};
    }
  })();

  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">(parsedConfig.paperWidth || "80mm");
  const [margins, setMargins] = useState<string>(parsedConfig.margins || "8px");
  const [showCashier, setShowCashier] = useState<boolean>(parsedConfig.showCashier ?? true);
  const [showDocument, setShowDocument] = useState<boolean>(parsedConfig.showDocument ?? true);
  const [showAddress, setShowAddress] = useState<boolean>(parsedConfig.showAddress ?? true);
  const [showContact, setShowContact] = useState<boolean>(parsedConfig.showContact ?? true);
  const [savingPrint, setSavingPrint] = useState(false);

  // Units Modal States
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [unitName, setUnitName] = useState("");
  const [unitDoc, setUnitDoc] = useState("");
  const [unitAddress, setUnitAddress] = useState("");
  const [unitContact, setUnitContact] = useState("");
  const [submittingUnit, setSubmittingUnit] = useState(false);

  const maxUnits = license?.maxUnits || 1;
  const currentUnitsCount = units.length;
  const usagePercentage = Math.min((currentUnitsCount / maxUnits) * 100, 100);

  // Save print styles
  const handleSavePrint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrint(true);
    try {
      const configJson = JSON.stringify({
        paperWidth,
        margins,
        showCashier,
        showDocument,
        showAddress,
        showContact
      });

      const res = await saveReceiptConfig(header, footer, configJson);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Estilo de impressão salvo com sucesso!");
      }
    } catch (err) {
      toast.error("Erro ao salvar preferências.");
    } finally {
      setSavingPrint(false);
    }
  };

  // Open Add Store Unit Modal
  const handleOpenAddUnit = () => {
    if (currentUnitsCount >= maxUnits) {
      toast.error("Limite de filiais atingido! Faça um upgrade de plano no painel Mestre.");
      return;
    }
    setEditingUnit(null);
    setUnitName("");
    setUnitDoc("");
    setUnitAddress("");
    setUnitContact("");
    setIsUnitModalOpen(true);
  };

  // Open Edit Store Unit Modal
  const handleOpenEditUnit = (unit: any) => {
    setEditingUnit(unit);
    setUnitName(unit.name);
    setUnitDoc(unit.document || "");
    setUnitAddress(unit.address || "");
    setUnitContact(unit.contact || "");
    setIsUnitModalOpen(true);
  };

  // Submit Store Unit Form
  const handleSubmitUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) {
      toast.error("Nome da unidade é obrigatório.");
      return;
    }

    setSubmittingUnit(true);
    try {
      if (editingUnit) {
        // Edit flow
        const res = await updateStoreUnit(editingUnit.id, unitName, unitDoc, unitAddress, unitContact);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        setUnits(prev => prev.map(u => u.id === editingUnit.id ? { 
          ...u, 
          name: unitName, 
          document: unitDoc || null, 
          address: unitAddress || null, 
          contact: unitContact || null 
        } : u));
        toast.success("Unidade comercial atualizada!");
      } else {
        // Create flow
        const res = await createStoreUnit(unitName, unitDoc, unitAddress, unitContact);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        if (res.unit) {
          setUnits(prev => [...prev, res.unit]);
          toast.success("Unidade cadastrada com sucesso!");
        }
      }
      setIsUnitModalOpen(false);
    } catch (err: any) {
      toast.error("Erro ao gerenciar unidade.");
    } finally {
      setSubmittingUnit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Settings className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          Configurações da Empresa
        </h1>
        <p className="text-slate-400 mt-1">Gerencie a identidade visual de recibos e as filiais comerciais da sua empresa</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800/80 gap-2">
        <button
          onClick={() => setActiveTab("print")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "print" 
              ? "border-cyan-500 text-white bg-slate-800/10 font-black" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Printer className={`w-4 h-4 ${activeTab === "print" ? "text-cyan-400" : "text-slate-500"}`} />
          Estilo de Impressão (Recibo)
        </button>
        <button
          onClick={() => setActiveTab("units")}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${
            activeTab === "units" 
              ? "border-cyan-500 text-white bg-slate-800/10 font-black" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building className={`w-4 h-4 ${activeTab === "units" ? "text-cyan-400" : "text-slate-500"}`} />
          Unidades Comerciais (Lojas)
        </button>
      </div>

      {/* -------------------- TAB 1: PRINT STYLING -------------------- */}
      {activeTab === "print" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-in fade-in duration-300">
          
          {/* Settings Column */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 pb-2 border-b border-slate-800">
                <Printer className="w-5 h-5 text-cyan-400" />
                Customização do Estilo da Nota
              </h3>

              <form onSubmit={handleSavePrint} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {/* Bobbin size */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Largura da Bobina (Papel)</label>
                    <select
                      value={paperWidth}
                      onChange={(e) => setPaperWidth(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white font-bold cursor-pointer"
                    >
                      <option value="80mm">80mm (Padrão Térmica Larga)</option>
                      <option value="58mm">58mm (Térmica Estreita / Mini-impressora)</option>
                    </select>
                  </div>

                  {/* Margins */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Espaçamento Interno (Margens)</label>
                    <select
                      value={margins}
                      onChange={(e) => setMargins(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white font-mono"
                    >
                      <option value="0px">Sem Margens (0px)</option>
                      <option value="4px">Compacta (4px)</option>
                      <option value="8px">Média (8px)</option>
                      <option value="12px">Espaçada (12px)</option>
                    </select>
                  </div>
                </div>

                {/* Header text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Texto do Cabeçalho (Header)</label>
                  <textarea
                    rows={2}
                    value={header}
                    onChange={(e) => setHeader(e.target.value)}
                    placeholder="Texto exibido no topo da nota"
                    className="w-full p-3 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Footer text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Texto do Rodapé (Termos / Agradecimento)</label>
                  <textarea
                    rows={2}
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="Texto exibido na base da nota"
                    className="w-full p-3 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Toggles Checklist */}
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <span className="block text-xs font-bold text-slate-400">Exibir os seguintes dados no recibo:</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { state: showCashier, set: setShowCashier, label: "Nome do Vendedor/Caixa" },
                      { state: showDocument, set: setShowDocument, label: "Documento (CNPJ/CPF) da Empresa" },
                      { state: showAddress, set: setShowAddress, label: "Endereço da Unidade" },
                      { state: showContact, set: setShowContact, label: "Telefone/Contato da Unidade" }
                    ].map((t, idx) => (
                      <label key={idx} className="flex items-center gap-2.5 text-xs text-slate-300 font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={t.state}
                          onChange={(e) => t.set(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-4 border-t border-slate-800/80">
                  <button
                    type="submit"
                    disabled={savingPrint}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    {savingPrint ? "Salvando..." : "Salvar Configurações"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Interactive Live Receipt Preview */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <span className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Preview Interativo do Recibo</span>
            
            {/* Paper Strip */}
            <div 
              style={{ 
                width: paperWidth === "58mm" ? "240px" : "330px",
                padding: margins,
                transition: "width 0.3s ease, padding 0.3s ease"
              }}
              className="bg-white text-black font-mono text-[10px] sm:text-xs shadow-[0_10px_35px_rgba(0,0,0,0.8)] border border-slate-300 relative rounded-sm p-4 overflow-hidden select-none"
            >
              {/* Receipt teeth top edge cut */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.3%,#060b14_33.3%,#060b14_66.6%,transparent_66.6%)] bg-[length:6px_6px]"></div>
              
              <div className="space-y-4 pt-3 pb-4">
                {/* Header */}
                <div className="text-center space-y-1">
                  <p className="font-extrabold text-sm uppercase tracking-tight leading-tight">{company.name.toUpperCase()}</p>
                  
                  {showDocument && (
                    <p className="text-[10px] text-slate-600 font-bold">CNPJ: {company.document || "12.345.678/0001-90"}</p>
                  )}

                  {showAddress && (
                    <p className="text-[9px] text-slate-500 leading-tight">Avenida Comercial, 100 - Centro, São Paulo/SP</p>
                  )}

                  {showContact && (
                    <p className="text-[9px] text-slate-500 font-bold">(11) 98888-8888</p>
                  )}

                  {header && (
                    <p className="text-[10px] italic border-t border-b border-dashed border-black/40 py-1.5 my-1 text-slate-800 break-words whitespace-pre-line">{header}</p>
                  )}
                </div>

                {/* Sell info */}
                <div className="space-y-0.5 text-[9px] border-b border-dashed border-black/40 pb-2">
                  <div className="flex justify-between">
                    <span>CUPOM: 000189</span>
                    <span>DATA: {new Date().toLocaleDateString("pt-BR")}</span>
                  </div>
                  {showCashier && (
                    <div className="flex justify-between">
                      <span>VENDEDOR: ZIONIX SILVA</span>
                      <span>OPER: CAIXA-01</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-2 py-1 text-[10px]">
                  <div className="font-bold border-b border-black/20 pb-0.5 flex justify-between">
                    <span>PRODUTOS</span>
                    <span>QTD x VALOR</span>
                  </div>
                  
                  <div className="space-y-1 text-[9px]">
                    <div className="flex justify-between">
                      <span className="truncate pr-2">2x Coca-Cola 2L</span>
                      <span className="shrink-0 font-bold">R$ 20,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="truncate pr-2">1x Coxinha de Frango</span>
                      <span className="shrink-0 font-bold">R$ 7,50</span>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-black/40 pt-2 space-y-1">
                  <div className="flex justify-between text-xs font-extrabold">
                    <span>VALOR TOTAL</span>
                    <span>R$ 27,50</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-700">
                    <span>PAGAMENTO (PIX)</span>
                    <span>R$ 27,50</span>
                  </div>
                </div>

                {/* Footer */}
                {footer && (
                  <div className="text-center text-[10px] italic border-t border-dashed border-black/40 pt-3 text-slate-700 whitespace-pre-line">
                    {footer}
                  </div>
                )}
              </div>

              {/* Bottom cut edge */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[linear-gradient(45deg,transparent_33.3%,#060b14_33.3%,#060b14_66.6%,transparent_66.6%)] bg-[length:6px_6px] rotate-180"></div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: STORE UNITS -------------------- */}
      {activeTab === "units" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Progress License Quota */}
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" />
                  Cota de Filiais Permitidas (Licença Ativa)
                </span>
                <span className="text-cyan-400 font-mono">{currentUnitsCount} de {maxUnits} {maxUnits === 1 ? "loja cadastrada" : "lojas cadastradas"}</span>
              </div>
              
              {/* Bar */}
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800/80 overflow-hidden">
                <div 
                  style={{ width: `${usagePercentage}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercentage >= 95 ? "bg-red-500" : usagePercentage >= 75 ? "bg-amber-500" : "bg-cyan-500"
                  }`}
                ></div>
              </div>
              
              <p className="text-[10px] text-slate-500 font-semibold">Suas filiais cadastradas são controladas de acordo com o plano contratado. Para abrir mais lojas, contate o administrador da plataforma.</p>
            </div>

            <button
              onClick={handleOpenAddUnit}
              disabled={currentUnitsCount >= maxUnits}
              className={`font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
                currentUnitsCount >= maxUnits 
                  ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed" 
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg"
              }`}
            >
              <Plus className="w-5 h-5" />
              Adicionar Nova Filial
            </button>
          </div>

          {/* Units Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((u) => (
              <div key={u.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-750 transition-colors">
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-white text-base line-clamp-1">{u.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {u.id.split("-")[0].toUpperCase()}</span>
                    </div>
                    {u.isHeadquarters ? (
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded">Matriz</span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Filial</span>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
                    <p className="flex items-center gap-2 line-clamp-1">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Doc: <strong className="text-slate-300 font-mono">{u.document || "Não cadastrado"}</strong></span>
                    </p>
                    <p className="flex items-center gap-2 line-clamp-1">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>End: <strong className="text-slate-300">{u.address || "Não informado"}</strong></span>
                    </p>
                    <p className="flex items-center gap-2 line-clamp-1">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Tel: <strong className="text-slate-300">{u.contact || "Não informado"}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/60 mt-6 flex justify-end">
                  <button
                    onClick={() => handleOpenEditUnit(u)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold border border-slate-800 hover:border-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar Unidade
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- ADD / EDIT STORE UNIT MODAL -------------------- */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsUnitModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <Building className="w-5 h-5 text-cyan-400" />
              {editingUnit ? "Editar Unidade Filial" : "Cadastrar Nova Filial"}
            </h3>
            <p className="text-xs text-slate-400 mb-6">Preencha as informações cadastrais desta loja.</p>

            <form onSubmit={handleSubmitUnit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Nome Fantasia da Unidade</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lumus Shopping Centro"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">CNPJ / CPF Especial</label>
                <input
                  type="text"
                  placeholder="Ex: 00.000.000/0001-00"
                  value={unitDoc}
                  onChange={(e) => setUnitDoc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Endereço Comercial</label>
                <input
                  type="text"
                  placeholder="Ex: Av das Nações, 500 - Loja 2"
                  value={unitAddress}
                  onChange={(e) => setUnitAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Telefone / Contato</label>
                <input
                  type="text"
                  placeholder="Ex: (11) 97777-7777"
                  value={unitContact}
                  onChange={(e) => setUnitContact(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0a0f1c] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  disabled={submittingUnit}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-750 text-white rounded-lg border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUnit}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2 px-6 rounded-lg text-xs flex items-center gap-1.5"
                >
                  {submittingUnit ? "Processando..." : editingUnit ? "Salvar Alterações" : "Criar Filial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

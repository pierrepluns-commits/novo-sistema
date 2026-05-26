"use client";

import React, { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { 
  Plus, Search, Edit, Trash2, Phone, Mail, MapPin, 
  History, X, Check, Loader2, ArrowUpRight, ClipboardList 
} from "lucide-react";
import { 
  createClientAction, 
  updateClientAction, 
  deleteClientAction, 
  searchClientsAction,
  getClientHistoryAction 
} from "../actions/client";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  document: string | null;
  phone: string;
  email: string | null;
  cep: string | null;
  address: string | null;
  createdAt: Date;
}

interface ServiceOrder {
  id: string;
  osNumber: number;
  equipmentType: string;
  equipmentBrand: string;
  equipmentModel: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
}

const statusMap: Record<string, { label: string; color: string }> = {
  BUDGET: { label: "Orçamento", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  WAITING_APPROVAL: { label: "Aguardando Aprov.", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  WAITING_PARTS: { label: "Aguardando Peças", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  IN_PROGRESS: { label: "Em Andamento", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  COMPLETED: { label: "Pronto", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  DELIVERED: { label: "Entregue", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  UNREPAIRABLE: { label: "Sem Conserto", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals and Slideover State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    cep: "",
    address: "",
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initial Load & Search
  useEffect(() => {
    fetchClients("");
  }, []);

  const fetchClients = async (query: string) => {
    startTransition(async () => {
      // searchClientsAction returns Client[] or similar
      // If query is empty, we still want to fetch clients. Let's make sure it returns all or matching.
      // Wait, let's see searchClientsAction implementation in client.ts. It returns [] if query is empty.
      // Ah! We can search for all clients if we use an empty query or just pass a blank space " ".
      // Let's pass query or blank space, or we can write a helper to list all clients or fallback.
      // Let's call searchClientsAction with the query.
      const res = await searchClientsAction(query || " ");
      setClients(res as any);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients(searchQuery);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openNewModal = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      document: "",
      phone: "",
      email: "",
      cep: "",
      address: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      document: client.document || "",
      phone: client.phone,
      email: client.email || "",
      cep: client.cep || "",
      address: client.address || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    
    if (!formData.name.trim()) {
      setFormError("Nome/Razão Social é obrigatório.");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("Celular (WhatsApp) é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        data.append(key, val);
      });

      let res;
      if (editingClient) {
        res = await updateClientAction(editingClient.id, data);
      } else {
        res = await createClientAction(data);
      }

      if (res.error) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        fetchClients(searchQuery);
      }
    } catch (err: any) {
      setFormError("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente? Todas as ordens de serviço vinculadas serão afetadas.")) {
      return;
    }

    try {
      const res = await deleteClientAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        fetchClients(searchQuery);
        if (selectedClient?.id === id) {
          setSelectedClient(null);
        }
      }
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleOpenHistory = async (client: Client) => {
    setSelectedClient(client);
    setIsLoadingHistory(true);
    try {
      const history = await getClientHistoryAction(client.id);
      setClientHistory(history);
    } catch (err) {
      console.error(err);
      setClientHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title="Módulo de Clientes" showBack={false} />
        
        <Button 
          onClick={openNewModal}
          className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-pink-500/20 rounded-xl"
          icon={Plus}
        >
          Novo Cliente
        </Button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou celular..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Live search as the user types
              if (e.target.value.trim().length === 0) {
                fetchClients("");
              } else if (e.target.value.trim().length >= 2) {
                fetchClients(e.target.value);
              }
            }}
            className="w-full bg-[#090e1a]/80 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
        </div>
        <Button type="submit" variant="secondary" className="px-4 py-2.5 rounded-xl border border-slate-800 bg-[#0f172a] text-slate-300 hover:text-white">
          Buscar
        </Button>
      </form>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Clients Table */}
        <div className="xl:col-span-2 bg-[#090e1a] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#030712] border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">CPF / CNPJ</th>
                  <th className="px-6 py-4">WhatsApp / Celular</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isPending && clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        <span>Carregando clientes...</span>
                      </div>
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr 
                      key={client.id} 
                      className={`hover:bg-slate-800/30 transition-colors group cursor-pointer ${selectedClient?.id === client.id ? 'bg-[#162032]/40 border-l-2 border-pink-500' : ''}`}
                      onClick={() => handleOpenHistory(client)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-white group-hover:text-pink-400 transition-colors flex items-center gap-1.5">
                          {client.name}
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {client.address && (
                          <div className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{client.address}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">{client.document || "Não cadastrado"}</td>
                      <td className="px-6 py-4">
                        <a 
                          href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{client.phone}</span>
                        </a>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs truncate max-w-[150px]">{client.email || "-"}</td>
                      <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/os/novo?clientId=${client.id}`}>
                          <button 
                            title="Nova Ordem de Serviço"
                            className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all active:scale-95"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => openEditModal(client)}
                          title="Editar cadastro"
                          className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all active:scale-95"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(client.id)}
                          title="Excluir cliente"
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Slideover/Panel for Client History Timeline */}
        <div className="bg-[#090e1a] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 min-h-[450px]">
          {selectedClient ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedClient.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedClient.id.substring(0, 8)}...</p>
                </div>
                <button 
                  onClick={() => setSelectedClient(null)} 
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-1 gap-4 text-xs text-slate-300">
                {selectedClient.document && (
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-500 font-medium w-16">CPF/CNPJ:</span>
                    <span className="font-mono text-white">{selectedClient.document}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 font-medium w-16">WhatsApp:</span>
                  <a 
                    href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, "")}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-400 hover:underline font-semibold"
                  >
                    {selectedClient.phone}
                  </a>
                </div>
                {selectedClient.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-white truncate">{selectedClient.email}</span>
                  </div>
                )}
                {selectedClient.cep && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-white">CEP: {selectedClient.cep}</span>
                  </div>
                )}
                {selectedClient.address && (
                  <div className="flex items-start gap-2.5 pl-6 -ml-6">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                    <span className="text-white text-[11px] leading-relaxed">{selectedClient.address}</span>
                  </div>
                )}
              </div>

              {/* Timeline Header */}
              <div className="border-t border-slate-800 pt-6">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-pink-400" />
                  <span>Histórico de Ordens de Serviço</span>
                </h4>

                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                    <span>Buscando histórico...</span>
                  </div>
                ) : clientHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Nenhuma ordem de serviço registrada para este cliente.
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-slate-800 space-y-6">
                    {clientHistory.map((os) => {
                      const badge = statusMap[os.status] || { label: os.status, color: "bg-slate-800 text-slate-400" };
                      return (
                        <div key={os.id} className="relative group/timeline">
                          {/* Circle marker */}
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-[#090e1a] group-hover/timeline:bg-pink-400 transition-colors" />
                          
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start">
                              <Link 
                                href={`/os/editar/${os.id}`}
                                className="font-bold text-white group-hover/timeline:text-pink-400 hover:underline text-xs flex items-center gap-1"
                              >
                                <span>O.S. #{String(os.osNumber).padStart(4, "0")}</span>
                                <ArrowUpRight className="w-3 h-3 text-slate-500 opacity-0 group-hover/timeline:opacity-100" />
                              </Link>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {new Date(os.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </div>

                            <p className="text-slate-300 text-xs font-semibold">
                              {os.equipmentType} {os.equipmentBrand} {os.equipmentModel}
                            </p>

                            <div className="flex justify-between items-center gap-2 mt-1">
                              <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold border rounded-md ${badge.color}`}>
                                {badge.label}
                              </span>
                              <span className="text-white font-bold text-xs">
                                R$ {os.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-500 text-center space-y-3">
              <div className="p-3 bg-slate-800/30 rounded-2xl border border-slate-800">
                <Contact className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <p className="font-bold text-slate-400 text-sm">Nenhum cliente selecionado</p>
                <p className="text-xs text-slate-600 max-w-[200px] mt-1 mx-auto">
                  Selecione um cliente da tabela para visualizar o histórico de ordens de serviço e dados completos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090e1a] border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#030712] border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
                {editingClient ? "Editar Cliente" : "Adicionar Novo Cliente"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              {/* Nome/Razão Social (Mandatory) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nome / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Nome completo do cliente"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              {/* Document and Phone Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    CPF / CNPJ
                  </label>
                  <input 
                    type="text"
                    name="document"
                    value={formData.document}
                    onChange={handleInputChange}
                    placeholder="Somente números"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>

                {/* Phone (WhatsApp - Mandatory) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Celular (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 90000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                    required
                  />
                </div>
              </div>

              {/* E-mail (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  E-mail
                </label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="exemplo@email.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* CEP and Address Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CEP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    CEP
                  </label>
                  <input 
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange}
                    placeholder="00000-000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Endereço Completo
                  </label>
                  <input 
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Rua, número, bairro..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-6 mt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-6 py-2 rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    <span>Salvar Cliente</span>
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

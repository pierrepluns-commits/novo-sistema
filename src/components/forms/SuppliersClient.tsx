"use client";

import React, { useState, useTransition } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Edit, Trash2, Phone, Mail, FileText, X, Check, Loader2 } from "lucide-react";
import { createSupplier, updateSupplier, deleteSupplier } from "@/app/actions/supplier";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Supplier {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
}

interface SuppliersClientProps {
  initialSuppliers: Supplier[];
}

export function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.document && s.document.includes(q))
    );
  });

  const openNewModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      document: "",
      phone: "",
      email: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      document: supplier.document || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) {
      return;
    }

    try {
      const res = await deleteSupplier(id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Fornecedor excluído com sucesso!");
        // Atualizar lista localmente
        setSuppliers(prev => prev.filter(s => s.id !== id));
        router.refresh();
      }
    } catch (e: any) {
      toast.error("Erro interno ao excluir fornecedor.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fData = new FormData();
    fData.append("name", formData.name);
    fData.append("document", formData.document);
    fData.append("phone", formData.phone);
    fData.append("email", formData.email);

    if (editingSupplier) {
      fData.append("id", editingSupplier.id);
    }

    try {
      let res;
      if (editingSupplier) {
        res = await updateSupplier(fData);
      } else {
        res = await createSupplier(fData);
      }

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(editingSupplier ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
        setIsModalOpen(false);
        
        // Recarregar os dados do servidor
        router.refresh();
        // Uma pequena gambiarra limpa para atualizar o estado local se o refresh demorar
        if (editingSupplier) {
          setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...formData } : s));
        } else if (res && 'supplier' in res && res.supplier) {
          setSuppliers(prev => [...prev, res.supplier as Supplier]);
        }
      }
    } catch (err: any) {
      toast.error("Ocorreu um erro no processamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <PageHeader title="Fornecedores do Estoque" showBack={true} />
          <p className="text-sm text-slate-400 mt-1">Gerencie fornecedores de insumos, peças e produtos</p>
        </div>
        <Button
          onClick={openNewModal}
          className="bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 py-2.5 px-4 shadow-[0_0_15px_rgba(37,99,235,0.3)] font-bold text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Barra de Busca */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar fornecedores por nome, email ou documento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1c] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-500 text-sm"
          />
        </div>
      </div>

      {/* Lista de Fornecedores */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0a0f1c]">
                <th className="p-4 text-sm font-semibold text-slate-400">Nome / Empresa</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Contato</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Documento</th>
                <th className="p-4 text-sm font-semibold text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="p-4">
                    <div className="font-semibold text-white">{supplier.name}</div>
                  </td>
                  <td className="p-4 space-y-1">
                    {supplier.phone && (
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {supplier.phone}
                      </div>
                    )}
                    {supplier.email && (
                      <div className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        {supplier.email}
                      </div>
                    )}
                    {!supplier.phone && !supplier.email && (
                      <span className="text-xs text-slate-500">Sem contato cadastrado</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-slate-300 font-mono flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-500" />
                      {supplier.document || "---"}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(supplier)}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(supplier.id, supplier.name)}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-500">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a0f1c]">
              <h3 className="text-lg font-bold text-white">
                {editingSupplier ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nome do Fornecedor / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Ex: Distribuidora Soluções Ltda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  CNPJ / CPF
                </label>
                <input
                  type="text"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Ex: 00.000.000/0001-00"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Telefone / Whatsapp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="Ex: (11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="Ex: contato@fornecedor.com"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 bg-[#0f172a]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-slate-700 text-slate-350 hover:bg-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : "Salvar Fornecedor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

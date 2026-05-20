"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { importProducts } from "@/app/actions/import";

interface Props {
  units: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CSVImportModal({ units, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [unitId, setUnitId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo CSV.");
      return;
    }
    if (!unitId) {
      toast.error("Por favor, selecione a unidade de destino.");
      return;
    }

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // Ignora a primeira linha se ela for o metadado do Excel 'sep=...'
      beforeFirstChunk: (chunk) => {
        if (chunk.startsWith("sep=")) {
          return chunk.substring(chunk.indexOf("\n") + 1);
        }
        return chunk;
      },
      complete: async (results) => {
        const data = results.data;
        if (data.length === 0) {
          toast.error("O arquivo CSV está vazio ou inválido.");
          setLoading(false);
          return;
        }

        const res = await importProducts(data, unitId);
        if (res?.error) {
          toast.error(res.error);
        } else if (res?.success) {
          toast.success(`Importação concluída! ${res.count} produtos processados.`);
          onSuccess();
          onClose();
        }
        setLoading(false);
      },
      error: (error) => {
        toast.error(`Erro ao ler CSV: ${error.message}`);
        setLoading(false);
      }
    });
  };

  const handleDownloadTemplate = () => {
    // Adicionado sep=; na primeira linha para forçar o Excel a reconhecer as colunas corretamente em qualquer versão.
    // E o BOM (\uFEFF) para reconhecer os acentos.
    const csvContent = "sep=;\nNome;SKU;CodigoBarras;Descricao;Custo;Preco;Quantidade\nProduto Exemplo;SKU-123;7891011;;10.50;25.00;10";
    const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Importar Estoque (CSV)</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Selecione a Unidade</label>
            <select 
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-[#0a0f1c] text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Selecione...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Arquivo CSV</label>
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer border border-slate-700 rounded-lg bg-[#0a0f1c] px-3 py-2"
            />
            <button type="button" onClick={handleDownloadTemplate} className="text-xs text-blue-400 mt-2 hover:underline">
              Baixar modelo de CSV
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" disabled={loading} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading || !file || !unitId} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            {loading ? "Importando..." : "Importar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

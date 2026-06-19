"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowDownToLine, ArrowRightLeft } from "lucide-react";
import { CSVImportModal } from "./forms/CSVImportModal";
import { StockTransferModal } from "./forms/StockTransferModal";

export function EstoqueClientWrapper({ units }: { units: any[] }) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Button 
        variant="outline" 
        onClick={() => setIsTransferOpen(true)}
        className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold shadow-[0_0_10px_rgba(16,185,129,0.05)] transition-all duration-300"
      >
        <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
        Transferir Estoque
      </Button>

      <Button 
        variant="outline" 
        onClick={() => setIsImportOpen(true)}
        className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/60 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold shadow-[0_0_10px_rgba(168,85,247,0.05)] transition-all duration-300"
      >
        <ArrowDownToLine className="w-4 h-4 text-purple-400" />
        Importar CSV
      </Button>

      {isImportOpen && (
        <CSVImportModal 
          units={units}
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => setIsImportOpen(false)}
        />
      )}

      {isTransferOpen && (
        <StockTransferModal 
          units={units}
          onClose={() => setIsTransferOpen(false)}
        />
      )}
    </div>
  );
}

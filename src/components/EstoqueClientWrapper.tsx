"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowDownToLine } from "lucide-react";
import { CSVImportModal } from "./forms/CSVImportModal";

export function EstoqueClientWrapper({ units }: { units: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsModalOpen(true)}
        className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/60 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold shadow-[0_0_10px_rgba(168,85,247,0.05)] transition-all duration-300"
      >
        <ArrowDownToLine className="w-4 h-4 text-purple-400" />
        Importar CSV
      </Button>

      {isModalOpen && (
        <CSVImportModal 
          units={units}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

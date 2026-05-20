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
        className="border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
      >
        <ArrowDownToLine className="w-4 h-4" />
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

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "./Button";

interface PageHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  showBack?: boolean;
}

export function PageHeader({ title, onAdd, addLabel = "Adicionar", showBack = true }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
      <div className="flex items-center gap-4">
        {showBack && (
          <Button variant="ghost" onClick={() => router.back()} icon={ArrowLeft} className="px-3 py-2 bg-[#0f172a] border border-slate-800 shadow-sm hover:shadow-md transition-all rounded-xl text-slate-300">
            Voltar
          </Button>
        )}
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
      </div>
      
      {onAdd && (
        <Button variant="primary" onClick={onAdd} icon={Plus}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}

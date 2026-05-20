"use client";

import React, { useState } from "react";
import { loginUser } from "@/app/actions/auth";
import toast from "react-hot-toast";
import { ShieldAlert } from "lucide-react";

export default function MasterLoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    // We add a hidden field to indicate this is master login
    formData.append("isMasterLogin", "true");

    const res = await loginUser(formData);
    
    if (res?.error) {
      toast.error(res.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#060b14] p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-xl p-8 shadow-xl relative overflow-hidden">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Network</h1>
          <p className="text-sm text-gray-500 mt-1">Acesso exclusivo para licenciamento SaaS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail do Administrador</label>
            <input 
              name="email" 
              type="email" 
              required
              className="w-full px-4 py-2 bg-gray-50 dark:bg-[#060b14] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white transition-all"
              placeholder="admin@network.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha de Acesso</label>
            <input 
              name="password" 
              type="password" 
              required
              className="w-full px-4 py-2 bg-gray-50 dark:bg-[#060b14] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Autenticando..." : "Entrar no Painel Master"}
          </button>
        </form>

        <div className="mt-8 text-xs text-gray-500 text-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <p>Credencial Master: mestre@admin.com / senha123</p>
        </div>
      </div>
    </div>
  );
}

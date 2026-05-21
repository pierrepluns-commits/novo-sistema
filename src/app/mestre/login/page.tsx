"use client";

import React, { useState } from "react";
import { loginUser, recoverPassword } from "@/app/actions/auth";
import toast from "react-hot-toast";
import { ShieldAlert, Mail, Lock, X, Check, Copy } from "lucide-react";

export default function MasterLoginPage() {
  const [loading, setLoading] = useState(false);
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<{
    email: string;
    name: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleRecover = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRecovering(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await recoverPassword(formData);
      if (res?.error) {
        toast.error(res.error);
      } else if (res?.success) {
        toast.success("E-mail de recuperação enviado!");
        setRecoveryResult({
          email: res.email!,
          name: res.name!,
          tempPassword: res.tempPassword!,
        });
      }
    } catch (err) {
      toast.error("Erro ao processar recuperação.");
    } finally {
      setRecovering(false);
    }
  };

  const handleCopy = () => {
    if (recoveryResult) {
      navigator.clipboard.writeText(recoveryResult.tempPassword);
      setCopied(true);
      toast.success("Senha copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#060b14] p-4 font-sans relative overflow-hidden">
      {/* Red ambient glow in dark mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-650/5 dark:bg-red-950/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse"></div>

      <div className="w-full max-w-md bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-xl p-8 shadow-xl relative overflow-hidden">
        
        {/* Top glowing line in dark mode */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-right from-transparent via-red-600 to-transparent opacity-75"></div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
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
              className="w-full px-4 py-2 bg-gray-50 dark:bg-[#060b14] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white transition-all text-sm font-medium"
              placeholder="pierrepluns@gmail.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha de Acesso</label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryResult(null);
                  setRecoveryEmail("");
                  setIsRecoverOpen(true);
                }}
                className="text-xs text-red-650 hover:text-red-500 font-semibold transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
            <input 
              name="password" 
              type="password" 
              required
              className="w-full px-4 py-2 bg-gray-50 dark:bg-[#060b14] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white transition-all text-sm"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? "Autenticando..." : "Entrar no Painel Master"}
          </button>
        </form>

        <div className="mt-8 text-xs text-gray-500 text-center pt-4 border-t border-gray-100 dark:border-gray-800">
          <p>Credencial Master: pierrepluns@gmail.com / senha123</p>
        </div>
      </div>

      {/* Recovery Modal */}
      {isRecoverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
            {/* Top glowing line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-red-650"></div>

            <button 
              type="button"
              onClick={() => setIsRecoverOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!recoveryResult ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-red-500/10 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 animate-pulse">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Recuperar Credencial Master</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Insira seu e-mail cadastrado. Atualizaremos sua senha de acesso e dispararemos um e-mail com a nova senha.</p>
                </div>

                <form onSubmit={handleRecover} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-550 dark:text-gray-400 mb-2 uppercase tracking-wider">Seu E-mail de Cadastro</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        name="email" 
                        type="email" 
                        required
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#060b14] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-550 transition-all text-gray-900 dark:text-white font-medium text-sm"
                        placeholder="Ex: pierrepluns@gmail.com"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRecoverOpen(false)}
                      className="flex-1 py-3 bg-gray-100 dark:bg-slate-900 border border-gray-250 dark:border-slate-800 text-gray-700 dark:text-slate-350 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={recovering}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-750 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-red-650/20"
                    >
                      {recovering ? "Processando..." : "Redefinir Senha"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nova Credencial Gerada!</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">A senha foi atualizada e enviada para o e-mail cadastrado.</p>
                </div>

                {/* Gorgeous Email Mock View */}
                <div className="bg-gray-50 dark:bg-[#040814] border border-gray-150 dark:border-white/5 rounded-2xl p-5 mb-6 text-left font-sans">
                  <div className="text-[11px] text-gray-500 border-b border-gray-200 dark:border-white/5 pb-2.5 mb-3 space-y-1 font-mono">
                    <div><span className="text-gray-600 dark:text-slate-400 font-bold">DE:</span> Security Central &lt;security@saas.com&gt;</div>
                    <div><span className="text-gray-600 dark:text-slate-400 font-bold">PARA:</span> {recoveryResult.email}</div>
                    <div><span className="text-gray-600 dark:text-slate-400 font-bold">ASSUNTO:</span> Redefinição de senha mestre - Rede de Administradores</div>
                  </div>
                  
                  <div className="space-y-3 text-xs text-gray-700 dark:text-slate-350">
                    <p>Olá, <strong className="text-gray-900 dark:text-white">{recoveryResult.name}</strong>!</p>
                    <p>Você solicitou uma recuperação de senha para a conta master. Use a senha temporária abaixo para restabelecer o controle administrativo:</p>
                    
                    {/* Copy Box */}
                    <div className="bg-white dark:bg-[#0a0f1c] border border-gray-250 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 mt-4 border-dashed">
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Nova Senha Master</span>
                        <code className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">{recoveryResult.tempPassword}</code>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white rounded-lg transition-all border border-gray-250 dark:border-slate-800"
                        title="Copiar Senha"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-500 italic mt-4">Nota: Guarde esta senha de maneira segura.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecoverOpen(false)}
                  className="w-full py-3 bg-red-600 hover:bg-red-750 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-lg"
                >
                  Concluído (Ir para o Login)
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


"use client";

import React, { useState } from "react";
import { loginUser, recoverPassword } from "../actions/auth";
import toast from "react-hot-toast";
import { Sparkles, Mail, Lock, Building2, X, Check, Copy } from "lucide-react";
import Link from "next/link";

interface LoginClientProps {
  systemConfig: any;
}

export function LoginClient({ systemConfig }: LoginClientProps) {
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

  const appName = systemConfig?.appName || "CyberERP";
  const primaryColor = systemConfig?.primaryColor || "#00f3ff";
  const secondaryColor = systemConfig?.secondaryColor || "#0055ff";

  const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "225, 29, 72";
  };

  const primaryRGB = hexToRgb(primaryColor);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
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
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 relative overflow-hidden">
      {/* Decorative ambient color ring */}
      <div 
        style={{ backgroundColor: primaryColor }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-15 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"
      ></div>

      <div className="w-full max-w-md bg-[#0a0f1c]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-500">
        
        {/* Top glowing line */}
        <div 
          style={{ background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)` }}
          className="absolute top-0 left-0 w-full h-[2px] opacity-50 group-hover:opacity-100 transition-opacity"
        ></div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div 
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                boxShadow: `0 0 20px rgba(${primaryRGB}, 0.4)`
              }}
              className="w-12 h-12 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300"
            >
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 uppercase flex items-center justify-center gap-1.5">
            <span>{appName.split(" ")[0]}</span>
            <span style={{ color: primaryColor }} className="font-extrabold">
              {appName.split(" ").slice(1).join(" ") || "Soluções"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Acesso de Funcionários</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">E-mail Comercial</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                name="email" 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-3 bg-[#040814] border border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-white font-semibold text-sm"
                placeholder="nome@empresa.com"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Senha de Acesso</label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryResult(null);
                  setRecoveryEmail("");
                  setIsRecoverOpen(true);
                }}
                className="text-[10px] text-slate-400 hover:text-cyan-400 transition-colors font-bold uppercase tracking-wider"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                name="password" 
                type="password" 
                required
                className="w-full pl-10 pr-4 py-3 bg-[#040814] border border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-white font-semibold text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              backgroundColor: primaryColor,
              boxShadow: `0 0 15px rgba(${primaryRGB}, 0.35)`
            }}
            className="w-full py-3.5 mt-4 text-white font-black uppercase tracking-wider text-xs rounded-xl hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? "Autenticando..." : "Inicializar Painel"}
          </button>
        </form>

        <div className="mt-8 text-[11px] text-slate-500 font-semibold text-center border-t border-white/5 pt-5">
          <p className="mb-2.5 uppercase text-slate-450 tracking-wider">Acessos Rápidos de Teste</p>
          <div className="grid grid-cols-1 gap-1.5 text-left bg-[#040814] p-3 rounded-xl border border-white/5 font-mono">
            <div><span style={{ color: primaryColor }}>Dono:</span> admin@empresa.com</div>
            <div><span style={{ color: primaryColor }}>Caixa:</span> caixa1@empresa.com</div>
            <div className="mt-1.5 text-center text-slate-400 border-t border-white/5 pt-1.5">SENHA UNIFICADA: senha123</div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-slate-450 hover:text-white transition-colors underline underline-offset-4">
            Voltar para a Página Inicial
          </Link>
        </div>
      </div>

      {/* Recovery Modal */}
      {isRecoverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0a0f1c] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Top glowing line */}
            <div 
              style={{ background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)` }}
              className="absolute top-0 left-0 w-full h-[2px] opacity-75"
            ></div>

            <button 
              type="button"
              onClick={() => setIsRecoverOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!recoveryResult ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                    <Mail className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Recuperar Senha</h3>
                  <p className="text-xs text-slate-400">Insira seu e-mail cadastrado. Geraremos uma nova senha de acesso e simularemos o envio para sua caixa de entrada.</p>
                </div>

                <form onSubmit={handleRecover} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Seu E-mail de Cadastro</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        name="email" 
                        type="email" 
                        required
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#040814] border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-white font-semibold text-sm"
                        placeholder="Ex: admin@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRecoverOpen(false)}
                      className="flex-1 py-3 bg-slate-900 border border-slate-850 text-slate-300 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-slate-800 active:scale-98 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={recovering}
                      style={{ 
                        backgroundColor: primaryColor,
                        boxShadow: `0 0 15px rgba(${primaryRGB}, 0.35)`
                      }}
                      className="flex-1 py-3 text-white font-black uppercase tracking-wider text-xs rounded-xl hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {recovering ? "Processando..." : "Redefinir Senha"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">E-mail Enviado!</h3>
                  <p className="text-xs text-slate-400">Nossa caixa postal disparou a nova senha para <strong className="text-white">{recoveryResult.email}</strong>.</p>
                </div>

                {/* Gorgeous Email Mock View */}
                <div className="bg-[#040814] border border-white/5 rounded-2xl p-5 mb-6 text-left font-sans">
                  <div className="text-[11px] text-slate-500 border-b border-white/5 pb-2.5 mb-3 space-y-1 font-mono">
                    <div><span className="text-slate-400 font-bold">DE:</span> {appName} Notifications &lt;no-reply@cybererp.com&gt;</div>
                    <div><span className="text-slate-400 font-bold">PARA:</span> {recoveryResult.email}</div>
                    <div><span className="text-slate-400 font-bold">ASSUNTO:</span> Sua nova senha temporária de acesso</div>
                  </div>
                  
                  <div className="space-y-3 text-xs text-slate-350">
                    <p>Olá, <strong className="text-white">{recoveryResult.name}</strong>!</p>
                    <p>Conforme solicitado, geramos uma nova credencial segura para a sua conta corporativa. Utilize os dados abaixo para fazer o login no painel:</p>
                    
                    {/* Copy Box */}
                    <div className="bg-[#0a0f1c] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 mt-4 border-dashed">
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Nova Senha Temporária</span>
                        <code className="text-emerald-400 font-mono font-black text-sm">{recoveryResult.tempPassword}</code>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-800"
                        title="Copiar Senha"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-505 italic mt-4">Nota: Recomendamos que você altere esta senha após o login por questões de segurança.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecoverOpen(false)}
                  style={{ 
                    backgroundColor: primaryColor,
                    boxShadow: `0 0 15px rgba(${primaryRGB}, 0.35)`
                  }}
                  className="w-full py-3 text-white font-black uppercase tracking-wider text-xs rounded-xl hover:brightness-110 active:scale-98 transition-all"
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

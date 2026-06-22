"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Search, ShoppingCart, Plus, Minus, Trash, Printer, Gift, Clock, CreditCard, Banknote, History, X, PackagePlus, Lock } from "lucide-react";
import { createSale, cancelSale, getRecentSales, updateSaleFee } from "../actions/pdv";
import { getReceiptConfig } from "../actions/config";
import { ReprintReceiptButton } from "@/components/forms/CaixaClientForms";

const DEFAULT_WARRANTY_TERMS = `TERMO DE GARANTIA E POLÍTICA DE TROCA (CONFORME LEI 8.078/90 - CDC)

1. DA GARANTIA LEGAL (Art. 26, CDC): A loja concede garantia de 30 (trinta) dias para produtos eletrônicos e periféricos contra defeitos de fabricação, contados a partir da data da compra.

2. DO DIREITO DE ARREPENDIMENTO E TESTE FUNCIONAL (Art. 49, CDC):
O Direito de Arrependimento (7 dias) é aplicável EXCLUSIVAMENTE a compras realizadas fora do estabelecimento (Internet/Telefone).
COMPRAS PRESENCIAIS: O cliente declara que, no ato da compra, teve acesso ao produto e, em casos aplicáveis, o mesmo foi TESTADO E APRESENTOU FUNCIONALIDADE NORMAL. Comprovado o pleno funcionamento no estabelecimento, NÃO EXISTE DIREITO A ARREPENDIMENTO, desistência ou troca por erro de escolha.

3. DA ALEGAÇÃO DE DEFEITO E TESTE DE BANCADA:
Em casos de reclamação de vício, o produto será submetido a teste técnico imediato no balcão.
PRODUTO EM PLENO FUNCIONAMENTO: Se, após o teste na loja, o produto apresentar funcionamento normal, a troca será sumariamente NEGADA. Nestes casos, entende-se que a falha relatada decorre de incompatibilidade, configuração incorreta ou falta de perícia do usuário, não sendo de responsabilidade da loja.
DANOS ADVERSOS À FABRICAÇÃO: Caso o produto apresente defeito visível ou funcional decorrente de fatores externos ocorridos após a saída da loja (picos de energia, quedas, umidade, pressão ou uso de fontes incompatíveis), a CONTRATADA se resguarda o direito de NÃO REALIZAR A TROCA, NÃO DEVOLVER VALORES E NÃO GERAR VALE-CRÉDITO, visto que a garantia cobre apenas vícios de fabricação.

4. DO BENEFÍCIO DE TROCA (48H ÚTEIS):
A substituição imediata só ocorre em até 48 horas úteis caso o defeito de fabricação seja real e comprovado pelo técnico da loja. Após este prazo, segue o rito do Art. 18 do CDC (prazo de até 30 dias para solução).

5. ITENS SEM GARANTIA (CONSUMO IMEDIATO):
I. PELÍCULAS: A garantia cessa após a aplicação. Não cobrimos danos pós-venda.
II. SERVIÇOS DE IMPRESSÃO/XEROX: Conferência obrigatória na entrega.
III. CAPAS: Sem garantia contra amarelamento ou danos de uso.

6. POLÍTICA DE REEMBOLSO E VALE-CRÉDITO:
A empresa NÃO REALIZA DEVOLUÇÃO DE VALORES EM ESPÉCIE/DINHEIRO.
Na impossibilidade de reparo ou troca por item idêntico, o ressarcimento será feito via VALE-CRÉDITO (Voucher) com validade de 30 dias.

7. EXCLUSÃO DE GARANTIA:
Anulação automática em caso de fios cortados, conectores oxidados/quebrados, selos violados ou qualquer sinal de impacto físico.`;

type Product = { id: string, name: string, price: number, cost: number, sku: string, barcode?: string, quantity: number };
type CartItem = Product & { cartQuantity: number, isFreebie: boolean };
type SaleType = { id: string, totalAmount: number, paymentMethod: string, status: string, createdAt: Date, items: any[], cardFee?: number };

export default function PDVPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<SaleType[]>([]);
  const [lastSale, setLastSale] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [installments, setInstallments] = useState<number>(1);
  const [customDate, setCustomDate] = useState<string>("");
  
  const [users, setUsers] = useState<{ id: string, name: string, role: string }[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [cardFeeInput, setCardFeeInput] = useState<string>("0");
  const [receiptConfig, setReceiptConfig] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Failed to load products", err));

    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
          if (data.length > 0) {
            setSelectedSellerId(data[0].id);
          }
        }
      })
      .catch(err => console.error("Failed to load users", err));

    getReceiptConfig()
      .then(data => setReceiptConfig(data))
      .catch(err => console.error("Failed to load receipt config", err));
  }, []);

  // Auto-print receipt when modal opens
  useEffect(() => {
    if (isReceiptModalOpen && lastSale) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReceiptModalOpen, lastSale]);

  const parsedReceiptConfig = (() => {
    try {
      return JSON.parse(receiptConfig?.receiptConfig || "{}");
    } catch (e) {
      return {};
    }
  })();

  const paperWidth = parsedReceiptConfig.paperWidth || "80mm";
  const margins = parsedReceiptConfig.margins || "8px";
  const showCashier = parsedReceiptConfig.showCashier ?? true;
  const showDocument = parsedReceiptConfig.showDocument ?? true;
  const showAddress = parsedReceiptConfig.showAddress ?? true;
  const showContact = parsedReceiptConfig.showContact ?? true;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase() === search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing ? existing.cartQuantity : 0;
      if (currentQty + 1 > product.quantity) {
        alert(`Estoque insuficiente! O estoque atual deste produto é de apenas ${product.quantity} unidades.`);
        return prev;
      }
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1, isFreebie: false }];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const exactMatch = products.find(p => p.sku === search || p.barcode === search);
      if (exactMatch) {
        addToCart(exactMatch);
        setSearch("");
      }
    }
  };

  const toggleFreebie = (id: string) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, isFreebie: !item.isFreebie } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    const item = cart.find(i => i.id === id);
    if (item && qty > item.quantity) {
      alert(`Estoque insuficiente! O estoque atual deste produto é de apenas ${item.quantity} unidades.`);
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, cartQuantity: qty } : item));
  };

  const total = cart.reduce((acc, item) => acc + (item.isFreebie ? 0 : item.price * item.cartQuantity), 0);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setIsPaymentModalOpen(true);
  };

  const handleFinishSale = async () => {
    try {
      const fee = ['CREDIT_CARD', 'DEBIT_CARD'].includes(paymentMethod) ? parseFloat(cardFeeInput) || 0 : 0;

      const sale = await createSale(cart.map(item => ({
        productId: item.id,
        quantity: item.cartQuantity,
        unitPrice: item.isFreebie ? 0 : item.price,
        unitCost: item.cost,
        isFreebie: item.isFreebie
      })), paymentMethod, installments, fee, selectedSellerId || undefined, customDate || undefined);
      
      setLastSale({
        ...sale,
        cartItems: [...cart]
      });
      setCart([]);
      setCardFeeInput("0");
      setCustomDate("");
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
    } catch (error: any) {
      console.error(error);
      if (error.message === "CAIXA_DIA_ANTERIOR_ABERTO") {
        alert("Atenção: Existe um caixa de dia anterior aberto! Você precisa fechar o caixa do dia anterior antes de realizar novas vendas.");
      } else if (error.message === "CAIXA_FECHADO") {
        alert("Atenção: Não há nenhum caixa aberto nesta unidade. Por favor, abra o caixa antes de fazer vendas.");
      } else {
        alert(error.message || "Erro ao finalizar venda.");
      }
    }
  };

  const loadRecentSales = async () => {
    try {
      const sales = await getRecentSales();
      setRecentSales(sales as any);
      setIsHistoryModalOpen(true);
    } catch(err) {
      console.error(err);
      alert("Erro ao carregar histórico.");
    }
  };

  const handleCancelSale = async (saleId: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta venda e estornar o valor?")) return;
    try {
      await cancelSale(saleId);
      alert("Venda cancelada com sucesso!");
      loadRecentSales(); // reload
    } catch(err: any) {
      console.error(err);
      alert(err.message || "Erro ao cancelar venda.");
    }
  };

  const handleFeeSubmit = async (saleId: string, fee: number) => {
    try {
      await updateSaleFee(saleId, fee);
      alert("Taxa registrada com sucesso!");
      loadRecentSales(); // reload
    } catch(err: any) {
      console.error(err);
      alert(err.message || "Erro ao atualizar taxa.");
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-8rem)] print:hidden">
        {/* Left side: Products List */}
        <div className="flex-1 flex flex-col space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 bg-card p-5 rounded-2xl border border-border shadow-md">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                <ShoppingCart className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                  Ponto de Venda
                </h1>
                <p className="text-[10px] font-mono text-gray-400 tracking-[0.3em] uppercase mt-1">Terminal de Caixa Rápido</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href="/estoque/novo">
                <Button 
                  icon={PackagePlus} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-500/30 font-bold px-6 py-2 tracking-wide"
                >
                  Adicionar Produto
                </Button>
              </a>
              <a href="/caixa">
                <Button 
                  icon={Lock} 
                  className="bg-rose-600 hover:bg-rose-500 text-white border-none shadow-lg shadow-rose-500/30 font-bold px-6 py-2 tracking-wide"
                >
                  Fechar Caixa
                </Button>
              </a>
              <Button 
                icon={History} 
                onClick={loadRecentSales}
                className="bg-violet-600 hover:bg-violet-500 text-white border-none shadow-[0_0_15px_rgba(139,92,246,0.5)] font-bold px-6 py-2 tracking-wide transition-all duration-300"
              >
                Histórico de Vendas
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Buscar ou 'bipar' por código (SKU) e aperte Enter..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-auto bg-card border border-border rounded-lg p-4 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3 content-start">
            {products.length === 0 ? (
               <div className="col-span-full flex justify-center py-10 text-gray-500">
                 Nenhum produto encontrado.
               </div>
            ) : (
              filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="relative border border-border rounded-xl p-3 flex flex-col items-center justify-center hover:border-primary cursor-pointer transition-all hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(0,243,255,0.15)] aspect-square text-center group" 
                  onClick={() => addToCart(product)}
                >
                  {/* SKU and Quantity Badge */}
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start w-[calc(100%-16px)]">
                    <span className="text-[10px] text-gray-500 font-mono">{product.sku}</span>
                    <span className="text-[10px] bg-secondary/30 text-gray-300 px-1.5 py-0.5 rounded-md">{product.quantity}</span>
                  </div>

                  {/* Name */}
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 mt-3 mb-2">{product.name}</h3>
                  
                  {/* Price */}
                  <div className="mt-auto">
                    <span className="font-bold text-[15px] text-green-400">R$ {product.price.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right side: Cart */}
        <div className="w-full lg:w-[450px] flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Carrinho</h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                <ShoppingCart className="w-10 h-10 opacity-20" />
                <p>O carrinho está vazio</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex flex-col border-b border-border pb-3 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{item.name}</h4>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        {item.isFreebie ? (
                           <span className="text-green-500 font-bold">BRINDE (R$ 0,00)</span>
                        ) : (
                           <span>R$ {item.price.toFixed(2)} un</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 select-none">
                      <button 
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                        className="p-1 rounded bg-[#0a0f1c] border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer w-7 h-7 flex items-center justify-center font-bold"
                        title="Diminuir quantidade"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input 
                        type="number"
                        min="1"
                        value={item.cartQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateCartQuantity(item.id, val);
                        }}
                        className="w-10 text-center bg-[#0a0f1c] border border-slate-800 rounded-lg text-white text-xs py-1 px-0.5 focus:ring-1 focus:ring-primary focus:outline-none font-bold"
                      />
                      <button 
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                        className="p-1 rounded bg-[#0a0f1c] border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer w-7 h-7 flex items-center justify-center font-bold"
                        title="Aumentar quantidade"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-xs text-gray-500 ml-0.5 font-bold">x</span>
                      <span className="text-sm font-bold text-foreground min-w-[70px] text-right">
                        R$ {item.isFreebie ? "0.00" : (item.price * item.cartQuantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleFreebie(item.id)} className={`text-xs flex items-center gap-1 ${item.isFreebie ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`} title="Marcar como Brinde">
                      <Gift className="w-3 h-3" /> {item.isFreebie ? 'Brinde' : 'Dar Brinde'}
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="text-xs flex items-center gap-1 text-red-400 hover:text-red-500" title="Remover">
                      <Trash className="w-3 h-3" /> Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-border bg-secondary/5 space-y-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
            
            <Button variant="primary" className="w-full py-6 text-lg" onClick={handleOpenPayment} disabled={cart.length === 0}>
              Finalizar Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Pagamento</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-400">Total a Pagar</p>
                <p className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">R$ {total.toFixed(2)}</p>
              </div>

              {/* Seleção do Vendedor / Funcionário */}
              <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Vendedor (Funcionário)</label>
                {users.length === 0 ? (
                  <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                    Nenhum funcionário cadastrado nesta unidade.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#060b14]/50 border border-slate-800 rounded-xl">
                    {users.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedSellerId(u.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          selectedSellerId === u.id 
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20' 
                            : 'bg-slate-800/40 text-slate-300 border-slate-700/50 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Data da Venda (Lançamento Retroativo) */}
              <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Data da Venda (Retroativo)</label>
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <p className="text-[10px] text-gray-500">Deixe em branco para registrar com a data e hora atual.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { id: 'CASH', label: 'Dinheiro', icon: Banknote },
                  { id: 'PIX', label: 'PIX', icon: Clock },
                  { id: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard },
                  { id: 'DEBIT_CARD', label: 'Débito', icon: CreditCard },
                ].map(method => (
                  <button 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${paymentMethod === method.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-800 bg-slate-800/20 hover:border-slate-700 text-slate-300'}`}
                  >
                    <method.icon className="w-6 h-6" />
                    <span className="font-semibold text-sm">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Taxa da Máquina e Parcelamento */}
              {['CREDIT_CARD', 'DEBIT_CARD'].includes(paymentMethod) && (
                <div className="mt-2 p-4 bg-[#060b14]/50 border border-slate-800 rounded-xl animate-in fade-in zoom-in duration-200 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Taxa da Máquina (R$ Fixo)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00"
                        value={cardFeeInput}
                        onChange={e => setCardFeeInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {paymentMethod === 'CREDIT_CARD' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Parcelamento</label>
                      <select 
                        value={installments} 
                        onChange={e => setInstallments(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none text-xs font-medium"
                      >
                        {[...Array(12)].map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1}x {i > 0 ? `(de R$ ${(total / (i+1)).toFixed(2)})` : 'à vista'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" onClick={handleFinishSale}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-card w-full max-w-3xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><History className="w-5 h-5"/> Últimas Vendas</h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {recentSales.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Nenhuma venda encontrada.</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-secondary/20">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Método</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map(sale => (
                      <tr key={sale.id} className="border-b border-border hover:bg-secondary/10">
                        <td className="px-4 py-3 font-mono text-xs">{sale.id.split("-")[0]}</td>
                        <td className="px-4 py-3">{new Date(sale.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">{sale.paymentMethod}</td>
                        <td className="px-4 py-3 font-medium">
                          R$ {sale.totalAmount.toFixed(2)}
                          {['CREDIT_CARD', 'DEBIT_CARD'].includes(sale.paymentMethod) && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs text-gray-400">Taxa: R$</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                defaultValue={sale.cardFee || ""}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val !== (sale.cardFee || 0)) {
                                    handleFeeSubmit(sale.id, val);
                                  }
                                }}
                                className="w-16 bg-secondary/20 border border-slate-700 text-white rounded p-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sale.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {sale.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1.5">
                          <ReprintReceiptButton sale={sale} users={users} />
                          {sale.status === 'COMPLETED' && (
                            <button onClick={() => handleCancelSale(sale.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold hover:underline">Cancelar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal & Print View */}
      {isReceiptModalOpen && lastSale && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-start p-4 overflow-y-auto print:p-0">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl flex flex-col my-8 print:my-0 print:shadow-none print:w-[80mm] print:bg-white print:text-black">
            
            {/* Dynamic CSS for Print Bobbin styling */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #receipt, #receipt * {
                  visibility: visible !important;
                }
                #receipt {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: ${paperWidth} !important;
                  padding: ${margins} !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                  color: black !important;
                }
                @page {
                  margin: 0;
                }
              }
            ` }} />

            {/* The printable area */}
            <div 
              style={{ 
                width: paperWidth === "58mm" ? "240px" : "330px", 
                padding: margins 
              }}
              className="bg-white text-black font-mono shadow-inner text-xs p-6" 
              id="receipt"
            >
              <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
                <h2 className="font-extrabold text-base uppercase tracking-tight">
                  {(receiptConfig?.unitName || receiptConfig?.companyName || "CYBER ERP").toUpperCase()}
                </h2>
                
                {showDocument && (receiptConfig?.unitDocument || receiptConfig?.companyDocument) && (
                  <p className="text-[10px] text-gray-700 mt-0.5 font-bold">
                    CNPJ/CPF: {receiptConfig?.unitDocument || receiptConfig?.companyDocument}
                  </p>
                )}
                
                {showAddress && receiptConfig?.unitAddress && (
                  <p className="text-[9px] text-gray-600 mt-0.5 leading-tight">
                    {receiptConfig.unitAddress}
                  </p>
                )}
                
                {showContact && receiptConfig?.unitContact && (
                  <p className="text-[9px] text-gray-600 mt-0.5 font-bold">
                    {receiptConfig.unitContact}
                  </p>
                )}

                {receiptConfig?.receiptHeader && (
                  <p className="text-[10px] italic border-t border-b border-dashed border-gray-300 py-1 my-1.5 text-gray-800 break-words whitespace-pre-line">
                    {receiptConfig.receiptHeader}
                  </p>
                )}

                <p className="text-[10px] font-bold mt-2">RECIBO #{lastSale.id.split("-")[0].toUpperCase()}</p>
                <p className="text-[9px] text-gray-500">{new Date(lastSale.createdAt).toLocaleString("pt-BR")}</p>
                
                {showCashier && (
                  <p className="text-[9px] text-gray-600 font-semibold mt-0.5">
                    VENDEDOR: {(users.find(u => u.id === lastSale.userId)?.name || users.find(u => u.id === selectedSellerId)?.name || "Caixa").toUpperCase()}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <table className="w-full text-[11px] table-fixed">
                  <thead>
                    <tr className="border-b border-dashed border-gray-400">
                      <th className="w-[12%] text-left py-1">QTD</th>
                      <th className="w-[48%] text-left py-1">ITEM</th>
                      <th className="w-[20%] text-right py-1">UN</th>
                      <th className="w-[20%] text-right py-1">TOT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastSale.cartItems.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100/50">
                        <td className="py-1 align-top text-left">{item.cartQuantity}</td>
                        <td className="py-1 align-top text-left break-words">{item.name} {item.isFreebie && "(Brinde)"}</td>
                        <td className="py-1 align-top text-right">{item.isFreebie ? "0.00" : item.price.toFixed(2)}</td>
                        <td className="py-1 align-top text-right">{item.isFreebie ? "0.00" : (item.price * item.cartQuantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-dashed border-gray-400 pt-2 text-right">
                <p className="text-xs text-gray-600">Subtotal: R$ {lastSale.totalAmount.toFixed(2)}</p>
                <p className="text-sm font-bold mt-1">TOTAL: R$ {lastSale.totalAmount.toFixed(2)}</p>
                <p className="text-xs mt-2 text-gray-600 uppercase">PAGAMENTO: {lastSale.paymentMethod}</p>
              </div>

              <div className="text-center mt-4 pt-3 border-t border-dashed border-gray-400">
                <div className="text-[9px] text-gray-700 whitespace-pre-line leading-relaxed text-left">
                  {receiptConfig?.receiptFooter || DEFAULT_WARRANTY_TERMS}
                </div>
                <div className="mt-4 flex justify-center opacity-50">
                   {/* Fake Barcode */}
                   <div className="h-8 w-40 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)]"></div>
                </div>
              </div>
            </div>

            {/* Actions (hidden in print) */}
            <div className="p-4 border-t border-border bg-secondary/10 flex gap-3 print:hidden">
              <Button variant="outline" className="flex-1" onClick={() => setIsReceiptModalOpen(false)}>Fechar</Button>
              <Button variant="primary" className="flex-1" icon={Printer} onClick={() => window.print()}>Imprimir</Button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

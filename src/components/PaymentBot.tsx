import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Plan } from '../types';
import { 
  X, 
  MessageSquare, 
  QrCode, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PaymentBotProps {
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: React.ReactNode;
}

const PaymentBot: React.FC<PaymentBotProps> = ({ plan, onClose, onSuccess }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingPix, setLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<{ id: string, qr_code: string, qr_code_base64: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const initialized = React.useRef(false);

  const addMessage = (content: React.ReactNode, type: 'bot' | 'user' = 'bot') => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), type, content }]);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initial bot sequence
    const sequence = async () => {
      addMessage(`Olá, ${profile?.name.split(' ')[0]}! 👋`);
      await new Promise(r => setTimeout(r, 600));

      // Check for existing pending subscription first
      setLoadingPix(true);
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', profile?.uid)
        .eq('plan_id', plan.id)
        .eq('status', 'pending')
        .not('qr_code', 'is', null)
        .maybeSingle();

      if (existingSub) {
        setLoadingPix(false);
        setPixData({
          id: existingSub.external_payment_id,
          qr_code: existingSub.qr_code,
          qr_code_base64: existingSub.qr_code_base64
        });
        addMessage(`Localizei um pagamento pendente para o **${plan.name}**.`);
        await new Promise(r => setTimeout(r, 600));
        addMessage(
          <div className="space-y-4">
            <p>Aqui está o seu QR Code gerado anteriormente:</p>
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto border border-zinc-200">
              <img src={`data:image/png;base64,${existingSub.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48" />
            </div>
          </div>
        );
        startPolling(existingSub.external_payment_id);
      } else {
        addMessage(`Excelente escolha! O **${plan.name}** vai te ajudar muito a alcançar seus objetivos.`);
        await new Promise(r => setTimeout(r, 1000));
        addMessage(`Estou gerando seu PIX de **R$ ${plan.price.toFixed(2)}** agora mesmo...`);
        generatePix();
      }
    };

    sequence();
  }, [profile, plan.id]);

  const generatePix = async () => {
    setLoadingPix(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: { planId: plan.id, studentId: profile?.uid }
      });

      if (error) throw error;
      
      setPixData(data);
      addMessage(
        <div className="space-y-4">
          <p>Prontinho! Aqui está seu QR Code para pagamento:</p>
          <div className="bg-white p-4 rounded-2xl inline-block mx-auto border border-zinc-200">
            <img src={`data:image/png;base64,${data.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48" />
          </div>
          <p className="text-xs text-zinc-500">Escaneie o código acima ou use o Copia e Cola abaixo.</p>
        </div>
      );
      
      // Start polling for payment status
      startPolling(data.id);
    } catch (err: any) {
      console.error('Error generating PIX:', err);
      const errorMsg = err.message || "Tive um problema ao gerar o PIX.";
      addMessage(`Ops! ${errorMsg} 😕`);
    } finally {
      setLoadingPix(false);
    }
  };

  const startPolling = (paymentId: string) => {
    const interval = setInterval(async () => {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('payment_status, status')
        .eq('external_payment_id', paymentId.toString())
        .single();

      if (sub?.payment_status === 'approved' || sub?.status === 'active') {
        setStatus('approved');
        clearInterval(interval);
        addMessage(
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-500">
            <p className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Pagamento Confirmado! 
            </p>
            <p className="text-xs mt-1">Seu plano já está ativo. Bons treinos! 💪</p>
          </div>
        );
        setTimeout(() => onSuccess(), 2000);
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  const handleCopy = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">VSFit Assistente</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">Bot de Pagamento Online</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-500",
                msg.type === 'user' ? "flex-row-reverse" : ""
              )}
            >
              {msg.type === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 mt-1 shrink-0">
                  <Zap className="w-4 h-4 text-orange-500" />
                </div>
              )}
              <div className={cn(
                "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                msg.type === 'bot' ? "bg-zinc-800 text-zinc-200" : "bg-orange-600 text-white"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {loadingPix && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              </div>
              <div className="bg-zinc-800 p-4 rounded-2xl">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-0" />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-150" />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-300" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar (Copia e Cola) */}
        {pixData && status === 'pending' && (
          <div className="p-6 bg-zinc-950 border-t border-zinc-800 space-y-4">
            <button
              onClick={handleCopy}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95",
                copied ? "bg-emerald-500 text-white" : "bg-white text-zinc-950 hover:bg-zinc-200"
              )}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'PIX Copia e Cola'}
            </button>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Pagamento 100% Seguro
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentBot;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../AuthContext";
import { Plan } from "../types";
import {
  ChevronLeft,
  CheckCircle2,
  Star,
  Zap,
  ShieldCheck,
  MessageCircle,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import PaymentBot from "../components/PaymentBot";

const SubscriptionOffers: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForBot, setSelectedPlanForBot] = useState<Plan | null>(
    null,
  );

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });

      if (data) {
        setPlans(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            durationMonths: p.duration_months,
            durationDays: p.duration_days,
            features: p.features || [],
            isFeatured: p.is_featured,
            tagline: p.tagline,
            personalId: p.personal_id,
          })),
        );
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const handleSubscribe = (plan: Plan) => {
    if (plan.price === 0) {
      // For Free Trial, still use WhatsApp or direct activation logic if preferred
      // For now, let's allow the bot to handle it or keep WhatsApp for the trial
      const message = encodeURIComponent(
        `Olá! Gostaria de ativar meu Plano Teste – 7 Dias Grátis do VSFit Gym.`,
      );
      const phone = "5511999999999";
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
      return;
    }

    // Open the Automated Payment Bot for paid plans
    setSelectedPlanForBot(plan);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-zinc-500">Carregando ofertas...</div>
    );

  return (
    <div className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Escolha seu Plano
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">
              Transforme seu corpo com o acompanhamento ideal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 auto-rows-max md:auto-rows-max">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col bg-zinc-900 border rounded-3xl p-6 sm:p-8 transition-all duration-500 group h-full",
                plan.isFeatured
                  ? "border-orange-600 shadow-2xl shadow-orange-600/20 lg:scale-105 lg:z-20"
                  : "border-zinc-800 hover:border-zinc-700",
              )}
            >
              {plan.isFeatured && (
                <div
                  className={cn(
                    "absolute -top-4 left-1/2 -translate-x-1/2 bg-linear-to-r from-orange-600 to-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-xl flex items-center gap-2 z-20",
                  )}
                >
                  <Star className="w-3 h-3 fill-white" />
                  Melhor Oferta
                </div>
              )}

              <div className="mb-8">
                <h3
                  className={cn(
                    "text-xl font-bold mb-2 transition-colors",
                    plan.isFeatured ? "text-orange-500" : "text-white",
                  )}
                >
                  {plan.name}
                </h3>
                {plan.tagline && (
                  <p className="text-sm text-zinc-500 leading-relaxed italic">
                    "{plan.tagline}"
                  </p>
                )}
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    R${" "}
                    {plan.price.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  {plan.durationMonths > 0 && (
                    <span className="text-zinc-500 text-sm font-medium">
                      / {plan.durationMonths} meses
                    </span>
                  )}
                  {plan.durationDays > 0 && (
                    <span className="text-zinc-500 text-sm font-medium">
                      / {plan.durationDays} dias
                    </span>
                  )}
                </div>
                {plan.durationMonths === 12 && (
                  <p className="text-emerald-500 text-xs font-bold mt-2 flex items-center gap-1 animate-pulse">
                    <TrendingUp className="w-3 h-3" /> Economize mais de 40%
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-4 mb-10">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest pl-1">
                  O que está incluso:
                </p>
                <ul className="space-y-4">
                  {plan.features?.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-zinc-300"
                    >
                      <div
                        className={cn(
                          "mt-0.5 rounded-full p-0.5",
                          plan.isFeatured ? "bg-orange-600/20" : "bg-zinc-800",
                        )}
                      >
                        <CheckCircle2
                          className={cn(
                            "w-3.5 h-3.5",
                            plan.isFeatured
                              ? "text-orange-500"
                              : "text-zinc-500",
                          )}
                        />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe(plan)}
                className={cn(
                  "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg",
                  plan.isFeatured
                    ? "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/25"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white shadow-black/20",
                )}
              >
                {plan.price === 0 ? "Experimente agora" : "Assinar agora"}
                <ArrowRight className="w-4 h-4" />
              </button>

              {plan.isFeatured && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <Zap className="w-3 h-3 text-orange-500" />
                  Acesso imediato via WhatsApp
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Payment Bot Modal */}
        {selectedPlanForBot && (
          <PaymentBot
            plan={selectedPlanForBot}
            onClose={() => setSelectedPlanForBot(null)}
            onSuccess={() => {
              setSelectedPlanForBot(null);
              navigate("/student");
            }}
          />
        )}

        {/* Footer Social Proof */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 sm:p-8 rounded-4xl flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 mt-10">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex -space-x-3 shrink-0">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden shrink-0"
                >
                  <img
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    alt="user"
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">
                +500 alunos transformados
              </p>
              <p className="text-zinc-500 text-xs">
                Junte-se à nossa comunidade hoje.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto justify-center md:justify-end">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-6 h-6 text-emerald-500 mb-1" />
              <span className="text-[10px] font-black text-zinc-500 uppercase">
                Seguro
              </span>
            </div>
            <div className="flex flex-col items-center">
              <MessageCircle className="w-6 h-6 text-orange-500 mb-1" />
              <span className="text-[10px] font-black text-zinc-500 uppercase">
                Suporte 1:1
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="w-6 h-6 text-blue-500 mb-1" />
              <span className="text-[10px] font-black text-zinc-500 uppercase">
                Foco total
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionOffers;

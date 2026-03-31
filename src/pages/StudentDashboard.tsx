import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../AuthContext";
import {
  Dumbbell,
  LineChart,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  ShieldCheck,
  Star,
  ArrowRight,
  Camera,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Workout, Evolution, Subscription } from "../types";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePlanAccess } from "../hooks/usePlanAccess";

const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [completedWorkoutIds, setCompletedWorkoutIds] = useState<Set<string>>(
    new Set(),
  );
  const [lastEvolution, setLastEvolution] = useState<Evolution | null>(null);
  const {
    subscription: planSub,
    loading: planLoading,
    isTrial,
    canSeeDetailedGraphs,
  } = usePlanAccess();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      // Use planSub from hook, but we still need other data
      const subData = planSub;

      // 1. Fetch Workouts (Assigned directly or by Plan)
      // Build query: fetch workouts assigned directly to student OR premium workouts from active plan

      // Fetch personal workouts (assigned to student)
      const { data: personalWorkouts, error: personalError } = await supabase
        .from("workouts")
        .select("*")
        .eq("student_id", profile.uid);

      // Fetch premium workouts (from active plan)
      let premiumWorkouts = [];
      if (subData?.planId) {
        const { data: premiumData, error: premiumError } = await supabase
          .from("workouts")
          .select("*")
          .eq("plan_id", subData.planId)
          .eq("is_premium", true);

        if (premiumData) {
          premiumWorkouts = premiumData;
        }
      }

      // Combine both arrays and remove duplicates
      const allWorkouts = [...(personalWorkouts || []), ...premiumWorkouts];
      const uniqueWorkoutIds = new Set<string>();
      const combinedWorkouts = allWorkouts.filter((w) => {
        if (uniqueWorkoutIds.has(w.id)) return false;
        uniqueWorkoutIds.add(w.id);
        return true;
      });

      if (combinedWorkouts) {
        const mappedWorkouts = combinedWorkouts.map((w) => ({
          id: w.id,
          studentId: w.student_id,
          personalId: w.personal_id,
          name: w.name,
          isPremium: w.is_premium,
          exercises: w.exercises,
          createdAt: w.created_at,
        }));
        setWorkouts(mappedWorkouts as Workout[]);
      }

      // Fetch workout logs
      const { data: logsData } = await supabase
        .from("workout_logs")
        .select("workout_id")
        .eq("user_id", profile.uid);

      if (logsData) {
        setCompletedWorkoutIds(new Set(logsData.map((l) => l.workout_id)));
      }

      // Fetch last evolution
      const { data: evolutionData, error: evolutionError } = await supabase
        .from("evolution")
        .select("*")
        .eq("student_id", profile.uid)
        .order("date", { ascending: false })
        .limit(1);

      if (evolutionData && evolutionData.length > 0) {
        const ev = evolutionData[0];
        setLastEvolution({
          id: ev.id,
          studentId: ev.student_id,
          date: ev.date,
          weight: ev.weight,
          measurements: ev.measurements,
          photos: ev.photos,
        } as Evolution);
      }

      setLoading(false);
    };

    fetchData();
  }, [profile]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Bora treinar, {profile?.name.split(" ")[0]}? 🔥
          </h1>
          <p className="text-zinc-500">
            {isTrial
              ? "Você está no período de teste de 7 dias."
              : "Seu progresso é constante."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {planSub && (
            <div
              className={cn(
                "flex items-center gap-2 border px-4 py-2 rounded-xl text-xs font-bold transition-all",
                planSub.endDate &&
                  !isNaN(new Date(planSub.endDate).getTime()) &&
                  new Date(planSub.endDate) < new Date()
                  ? "bg-red-500/10 border-red-500/20 text-red-500"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                Plano {planSub.plan?.name || "..."}:{" "}
                {planSub.endDate && !isNaN(new Date(planSub.endDate).getTime())
                  ? new Date(planSub.endDate) < new Date()
                    ? "Expirado"
                    : `Vence em ${format(new Date(planSub.endDate), "dd/MM")}`
                  : "Status desconhecido"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
            <Calendar className="w-5 h-5 text-orange-500" />
            <span className="text-zinc-100 font-bold">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      {/* Premium Subscription Banner */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[2rem] p-8 border transition-all duration-500",
          planSub?.endDate &&
            !isNaN(new Date(planSub.endDate).getTime()) &&
            new Date(planSub.endDate) > new Date()
            ? "bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800"
            : "bg-gradient-to-br from-orange-600 to-amber-500 border-transparent shadow-xl shadow-orange-600/20",
        )}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star
                className={cn(
                  "w-5 h-5",
                  planSub && new Date(planSub.endDate) > new Date()
                    ? "text-orange-500"
                    : "text-white",
                )}
              />
              <h2
                className={cn(
                  "text-xl font-black uppercase tracking-widest",
                  planSub && new Date(planSub.endDate) > new Date()
                    ? "text-white"
                    : "text-white",
                )}
              >
                {planSub && new Date(planSub.endDate) > new Date()
                  ? "Você é Premium! ⭐"
                  : "Experimente o Premium"}
              </h2>
            </div>
            <p
              className={cn(
                "text-sm font-medium max-w-xl",
                planSub && new Date(planSub.endDate) > new Date()
                  ? "text-zinc-400"
                  : "text-white/90",
              )}
            >
              {planSub && new Date(planSub.endDate) > new Date()
                ? "Aproveite todos os recursos liberados e foque nos seus resultados. Sua evolução não para!"
                : "Libere treinos personalizados, acompanhamento completo e suporte VIP. Transforme seu corpo com foco total."}
            </p>
          </div>
          <button
            onClick={() => navigate("/subscriptions")}
            className={cn(
              "px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg flex items-center gap-2",
              planSub && new Date(planSub.endDate) > new Date()
                ? "bg-zinc-800 text-white hover:bg-zinc-700"
                : "bg-white text-orange-600 hover:bg-zinc-100",
            )}
          >
            {planSub && !isTrial ? "Ver Planos" : "Ver Ofertas Premium 🔥"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Decorative elements for the banner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-orange-600/20 transition-all duration-500" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-600/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-zinc-500 text-sm font-bold uppercase">
              Treinos Ativos
            </span>
          </div>
          <p className="text-4xl font-black text-white">{workouts.length}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-600/20 transition-all duration-500" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
              <LineChart className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-zinc-500 text-sm font-bold uppercase">
              Último Peso
            </span>
          </div>
          <p className="text-4xl font-black text-white">
            {lastEvolution?.weight || "--"}{" "}
            <span className="text-lg font-bold text-zinc-500">kg</span>
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-600/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-green-600/20 transition-all duration-500" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-600/10 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-zinc-500 text-sm font-bold uppercase">
              Fotos de Progresso
            </span>
          </div>
          {isTrial ? (
            <div className="flex items-center gap-2 text-zinc-600">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-bold">Liberado no Premium</span>
            </div>
          ) : (
            <p className="text-4xl font-black text-white">
              {lastEvolution?.photos?.length || 0}
            </p>
          )}
        </div>
      </div>

      {/* Workouts List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          Seus Treinos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workouts.length > 0 ? (
            workouts.map((workout) => {
              const isSubActive =
                planSub && new Date(planSub.endDate) >= new Date();
              const isLocked = workout.isPremium && !isSubActive;

              return (
                <button
                  key={workout.id}
                  onClick={() => {
                    if (isLocked) {
                      alert(
                        "Este é um treino Premium! Renove sua assinatura com seu personal para acessar.",
                      );
                    } else {
                      navigate(`/workouts/${workout.id}`);
                    }
                  }}
                  className={cn(
                    "bg-zinc-900 border p-6 rounded-3xl transition-all group flex items-center justify-between text-left",
                    isLocked
                      ? "border-zinc-800 opacity-60 grayscale cursor-not-allowed"
                      : "border-zinc-800 hover:border-orange-600/50",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center border transition-colors",
                        isLocked
                          ? "border-zinc-800"
                          : "border-zinc-800 group-hover:border-orange-600/30",
                      )}
                    >
                      {isLocked ? (
                        <Lock className="w-7 h-7 text-zinc-700" />
                      ) : (
                        <Dumbbell className="w-7 h-7 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">
                          {workout.name}
                        </h3>
                        {completedWorkoutIds.has(workout.id) && (
                          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Finalizado
                          </span>
                        )}
                        {workout.isPremium && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-600/10 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-600/20">
                            Premium
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">
                        {workout.exercises.length} exercícios
                      </p>
                    </div>
                  </div>
                  {isLocked ? (
                    <Lock className="w-5 h-5 text-zinc-800" />
                  ) : (
                    <div className="flex items-center gap-3">
                      {completedWorkoutIds.has(workout.id) && (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      )}
                      <ChevronRight className="w-6 h-6 text-zinc-700 group-hover:text-orange-500 transition-colors" />
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="col-span-full bg-zinc-900 border border-zinc-800 p-12 rounded-3xl text-center">
              <Dumbbell className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500">
                Você ainda não tem treinos cadastrados.
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Fale com seu personal trainer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

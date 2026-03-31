import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Workout, WorkoutExercise } from '../types';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Clock, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Weight,
  Repeat,
  ChevronRight,
  ChevronLeft,
  Timer,
  X,
  RotateCcw,
  Trophy,
  PartyPopper,
  Sparkles,
  Dumbbell
} from 'lucide-react';
import { cn } from '../lib/utils';

const WorkoutView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  
  // Active Workout States
  const [isTracking, setIsTracking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timerValue, setTimerValue] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setWorkout({
          id: data.id,
          studentId: data.student_id,
          personalId: data.personal_id,
          name: data.name,
          exercises: data.exercises,
          createdAt: data.created_at
        } as Workout);
      }
      setLoading(false);
    };
    fetchWorkout();
  }, [id]);

  // Timer Logic
  useEffect(() => {
    if (isTimerActive && timerValue > 0) {
      timerRef.current = setInterval(() => {
        setTimerValue(prev => prev - 1);
      }, 1000);
    } else if (timerValue === 0) {
      setIsTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, timerValue]);

  // Persist workout completion
  useEffect(() => {
    if (isFinished && workout) {
      const saveLog = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('workout_logs').insert({
              user_id: user.id,
              workout_id: workout.id,
              completed_at: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error saving workout log:', err);
        }
      };
      saveLog();
    }
  }, [isFinished, workout]);

  const startTimer = (secondsStr: string) => {
    // Parse seconds from string (e.g. "60s" or "60")
    const seconds = parseInt(secondsStr.replace(/\D/g, '')) || 60;
    setTimerValue(seconds);
    setIsTimerActive(true);
  };

  const toggleExercise = (exerciseId: string) => {
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId);
  };

  const toggleComplete = (exerciseId: string) => {
    setCompletedExercises(prev => 
      prev.includes(exerciseId) 
        ? prev.filter(id => id !== exerciseId) 
        : [...prev, exerciseId]
    );
  };

  const currentExercise = workout?.exercises[currentIndex];
  const progressPercent = workout ? ((completedExercises.length / workout.exercises.length) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-screen text-zinc-500">Carregando treino...</div>;
  if (!workout) return <div className="text-center p-12 text-zinc-500">Treino não encontrado.</div>;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 text-center space-y-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-600 via-yellow-400 to-orange-600" />
          
          <div className="relative">
            <div className="w-24 h-24 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <Trophy className="w-12 h-12 text-orange-500 animate-bounce" />
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-500 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase whitespace-pre-line">
              TREINO{'\n'}CONCLUÍDO!
            </h1>
            <p className="text-zinc-500 font-medium">Você completou o seu treino de hoje com sucesso. Parabéns!</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800/50">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Exercícios</p>
              <p className="text-2xl font-black text-white">{workout.exercises.length}</p>
            </div>
            <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800/50">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</p>
              <p className="text-lg font-black text-green-500 flex items-center justify-center gap-1 uppercase italic">
                <CheckCircle2 className="w-4 h-4" /> 100%
              </p>
            </div>
          </div>

          <button 
            onClick={() => navigate('/')}
            className="w-full bg-white hover:bg-zinc-200 text-black font-black py-5 rounded-3xl transition-all shadow-xl shadow-white/10 active:scale-95 uppercase tracking-widest text-sm"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active Workout Perspective - MODERNIZED
  if (isTracking && currentExercise) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <button onClick={() => setIsTracking(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all">
            <X className="w-6 h-6" />
          </button>
          <div className="text-center min-w-0">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest truncate">{workout.name}</h2>
            <p className="text-xs text-zinc-600">Série {currentIndex + 1} de {workout.exercises.length}</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-zinc-900 overflow-hidden border-b border-zinc-800">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 shadow-lg shadow-orange-600/50" 
            style={{ width: `${((currentIndex + 1) / workout.exercises.length) * 100}%` }} 
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-40">
          {/* Exercise Demo - Large Visual */}
          <div className="aspect-square bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 relative shadow-2xl">
            {currentExercise.gifUrl ? (
              <img 
                src={currentExercise.gifUrl} 
                alt={currentExercise.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                <Dumbbell className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-sm font-medium">Sem demonstração</p>
              </div>
            )}
            
            {/* Timer Overlay */}
            {isTimerActive && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="text-8xl font-black text-orange-500 tabular-nums mb-4 drop-shadow-lg">{timerValue}</div>
                <p className="text-zinc-300 uppercase font-bold tracking-widest text-sm">Tempo de Descanso</p>
                <button 
                  onClick={() => setIsTimerActive(false)}
                  className="mt-8 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-full text-xs font-bold transition-all shadow-lg shadow-orange-600/30 active:scale-95"
                >
                  Pular Descanso
                </button>
              </div>
            )}
          </div>

          {/* Exercise Name & Muscle Group */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-white">{currentExercise.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-orange-600/20 border border-orange-600/40 px-4 py-1.5 rounded-full text-sm font-bold text-orange-400 uppercase tracking-widest">
                {currentExercise.muscleGroup}
              </span>
              <span className="text-zinc-500 font-bold">•</span>
              <span className="text-zinc-400 text-sm">Exercício {currentIndex + 1}/{workout.exercises.length}</span>
            </div>
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-center hover:border-orange-600/30 transition-all">
              <Repeat className="w-5 h-5 text-orange-500 mx-auto mb-2" />
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Séries</p>
              <p className="text-2xl font-black text-white mt-1">{currentExercise.sets}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-center hover:border-blue-600/30 transition-all">
              <CheckCircle2 className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Repetições</p>
              <p className="text-2xl font-black text-white mt-1">{currentExercise.reps}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-center hover:border-yellow-600/30 transition-all">
              <Weight className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Carga</p>
              <p className="text-2xl font-black text-white mt-1">{currentExercise.load || '--'}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-center hover:border-green-600/30 transition-all">
              <Timer className="w-5 h-5 text-green-500 mx-auto mb-2" />
              <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Descanso</p>
              <p className="text-2xl font-black text-white mt-1">{currentExercise.rest}</p>
            </div>
          </div>

          {/* Instructions Card */}
          {currentExercise.notes && (
            <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border border-blue-600/30 p-6 rounded-3xl space-y-3">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-sm font-black text-blue-300 uppercase tracking-widest mb-2">Instruções</h3>
                  <p className="text-sm text-blue-100 leading-relaxed">{currentExercise.notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Helpful Tips */}
          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/10 border border-emerald-600/30 p-6 rounded-3xl space-y-3">
            <h3 className="text-sm font-black text-emerald-300 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Dicas Profissionais
            </h3>
            <ul className="space-y-2 text-sm text-emerald-100">
              <li className="flex gap-2">
                <span className="font-black">•</span>
                <span>Mantenha a forma correta do começo ao fim</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black">•</span>
                <span>Controle a respiração: expire na contração, inspire na volta</span>
              </li>
              <li className="flex gap-2">
                <span className="font-black">•</span>
                <span>Se sentir dor, pare e revise sua posição</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Controls - Improved */}
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/95 to-transparent flex items-center justify-between gap-3">
          <button 
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => prev - 1)}
            className="w-14 h-14 md:w-16 md:h-16 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center disabled:opacity-20 disabled:grayscale hover:bg-zinc-800 transition-all active:scale-95"
            title="Exercício anterior"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          <div className="flex-1 flex gap-2">
            {!isTimerActive && (
              <button 
                onClick={() => startTimer(currentExercise.rest)}
                className="w-14 h-14 md:w-16 md:h-16 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center hover:bg-zinc-800 hover:border-green-600/50 transition-all active:scale-95"
                title="Iniciar timer de descanso"
              >
                <Timer className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
              </button>
            )}
            
            <button 
              onClick={() => {
                const exerciseId = currentExercise.exerciseId;
                if (!completedExercises.includes(exerciseId)) {
                  toggleComplete(exerciseId);
                }
                if (currentIndex < workout.exercises.length - 1) {
                  setCurrentIndex(prev => prev + 1);
                  setIsTimerActive(false);
                } else {
                  setIsFinished(true);
                }
              }}
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-black rounded-3xl flex items-center justify-center gap-2 shadow-xl shadow-orange-600/50 transition-all active:scale-95 py-4 md:py-5"
            >
              <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" />
              <span className="text-sm md:text-base">{currentIndex === workout.exercises.length - 1 ? 'Finalizar Treino' : 'Próximo Exercício'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
  // List Overview
  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{workout.name}</h1>
            <p className="text-sm text-zinc-500">{workout.exercises.length} exercícios no total</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">Hoje</span>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl">
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Duração Est.</span>
          </div>
          <p className="text-2xl font-black text-white">45 <span className="text-sm font-bold text-zinc-500">min</span></p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl">
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Progresso</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-black text-white">{Math.round(progressPercent)} <span className="text-sm font-bold text-zinc-500">%</span></p>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <button 
        onClick={() => {
          setIsTracking(true);
          setCurrentIndex(0);
        }}
        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-orange-600/30 transition-all flex items-center justify-center gap-3 active:scale-95 group"
      >
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="w-4 h-4 fill-white" />
        </div>
        <span className="uppercase tracking-widest">Iniciar Treino Agora</span>
      </button>

      {/* Instructions & Overview */}
      <div className="bg-gradient-to-r from-orange-600/10 via-orange-600/5 to-transparent border border-orange-600/20 rounded-3xl p-6 space-y-3">
        <h3 className="text-sm font-black text-orange-300 uppercase tracking-widest flex items-center gap-2">
          <Info className="w-4 h-4" /> Dicas Importantes
        </h3>
        <ul className="text-sm space-y-2 text-zinc-300">
          <li className="flex gap-3">
            <span className="text-orange-500 font-black text-lg">✓</span>
            <span>Execute cada exercício com forma correta para melhores resultados</span>
          </li>
          <li className="flex gap-3">
            <span className="text-orange-500 font-black text-lg">✓</span>
            <span>Utilize o timer de descanso para manter a intensidade</span>
          </li>
          <li className="flex gap-3">
            <span className="text-orange-500 font-black text-lg">✓</span>
            <span>Beba água regularmente entre os exercícios</span>
          </li>
        </ul>
      </div>

      {/* Exercises List - Modern Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          {workout.exercises.length} Exercícios neste Treino
        </h2>
        {workout.exercises.map((ex, index) => (
          <div 
            key={ex.exerciseId + index}
            className={cn(
              "bg-zinc-900 border rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer group",
              completedExercises.includes(ex.exerciseId) 
                ? "border-green-600/40 bg-gradient-to-r from-green-600/10 to-transparent opacity-60" 
                : "border-zinc-800 hover:border-orange-600/30 hover:shadow-lg hover:shadow-orange-600/10"
            )}
          >
            <div className="p-5 md:p-6 flex items-start gap-4">
              {/* Checkbox */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleComplete(ex.exerciseId);
                }}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 mt-1",
                  completedExercises.includes(ex.exerciseId) 
                    ? "bg-green-600 text-white shadow-lg shadow-green-600/30" 
                    : "bg-zinc-950 border border-zinc-800 text-zinc-700 hover:border-orange-600/50 hover:bg-orange-600/5"
                )}
              >
                <CheckCircle2 className="w-6 h-6" />
              </button>
              
              {/* Exercise Info */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExercise(ex.exerciseId)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={cn(
                    "font-black text-lg transition-all",
                    completedExercises.includes(ex.exerciseId) ? "text-zinc-500 line-through" : "text-white group-hover:text-orange-400"
                  )}>
                    {ex.name}
                  </h3>
                  <span className="text-[10px] font-black text-zinc-600 bg-zinc-950 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    #{index + 1}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="bg-orange-600/20 border border-orange-600/40 px-3 py-1 rounded-lg text-[11px] font-black text-orange-400 uppercase tracking-wider">
                    {ex.muscleGroup}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  <div className="bg-zinc-950/50 border border-zinc-800 p-2 rounded-xl text-center">
                    <p className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">Séries</p>
                    <p className="text-sm font-bold text-white mt-0.5">{ex.sets}</p>
                  </div>
                  <div className="bg-zinc-950/50 border border-zinc-800 p-2 rounded-xl text-center">
                    <p className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">Reps</p>
                    <p className="text-sm font-bold text-white mt-0.5">{ex.reps}</p>
                  </div>
                  {ex.load && (
                    <div className="bg-zinc-950/50 border border-zinc-800 p-2 rounded-xl text-center">
                      <p className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">Carga</p>
                      <p className="text-sm font-bold text-white mt-0.5">{ex.load}</p>
                    </div>
                  )}
                  <div className="bg-zinc-950/50 border border-zinc-800 p-2 rounded-xl text-center">
                    <p className="text-[8px] text-zinc-600 uppercase font-black tracking-tighter">Descanso</p>
                    <p className="text-sm font-bold text-white mt-0.5">{ex.rest}</p>
                  </div>
                </div>
              </div>

              {/* Expand Button */}
              <button 
                onClick={() => toggleExercise(ex.exerciseId)}
                className="p-2 text-zinc-500 hover:text-orange-500 hover:bg-zinc-950 rounded-xl transition-all shrink-0"
              >
                {expandedExercise === ex.exerciseId ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Expanded Details */}
            {expandedExercise === ex.exerciseId && (
              <div className="px-5 md:px-6 pb-5 pt-3 border-t border-zinc-800/50 space-y-5 bg-zinc-950/30 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Exercise Demo Video/Image */}
                <div className="aspect-video bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden relative group/demo">
                  {ex.gifUrl ? (
                    <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover group-hover/demo:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                      <Dumbbell className="w-16 h-16 opacity-20" />
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {ex.notes && (
                  <div className="bg-blue-600/10 border border-blue-600/30 p-5 rounded-3xl space-y-2">
                    <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                      <Info className="w-4 h-4" /> Instruções
                    </h4>
                    <p className="text-sm text-blue-100 leading-relaxed">{ex.notes}</p>
                  </div>
                )}

                {/* Pro Tip */}
                <div className="bg-emerald-600/10 border border-emerald-600/30 p-5 rounded-3xl space-y-2">
                  <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Dica do Trainer
                  </h4>
                  <p className="text-sm text-emerald-100 leading-relaxed">
                    Foque em manter a forma perfeita durante todo o exercício. Qualidade é sempre melhor que quantidade!
                  </p>
                </div>
                
                {/* Action Button */}
                <button 
                  onClick={() => {
                    setIsTracking(true);
                    setCurrentIndex(index);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Executar Agora
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutView;

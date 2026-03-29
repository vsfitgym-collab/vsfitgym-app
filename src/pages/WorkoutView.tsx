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
  Sparkles
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

  // Active Workout Perspective
  if (isTracking && currentExercise) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <button onClick={() => setIsTracking(false)} className="p-2 text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{workout.name}</h2>
            <p className="text-xs text-zinc-600">Exercício {currentIndex + 1} de {workout.exercises.length}</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-900 overflow-hidden">
          <div 
            className="h-full bg-orange-600 transition-all duration-500" 
            style={{ width: `${((currentIndex + 1) / workout.exercises.length) * 100}%` }} 
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
          {/* Visual Demo */}
          <div className="aspect-square bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 relative shadow-2xl">
            {currentExercise.gifUrl ? (
              <img 
                src={currentExercise.gifUrl} 
                alt={currentExercise.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                <Play className="w-16 h-16 mb-2 opacity-20" />
                <p className="text-sm font-medium">Demonstração indisponível</p>
              </div>
            )}
            
            {/* Timer Overlay */}
            {isTimerActive && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="text-7xl font-black text-orange-500 tabular-nums mb-4">{timerValue}</div>
                <p className="text-zinc-400 uppercase font-bold tracking-widest text-sm">Tempo de Descanso</p>
                <button 
                  onClick={() => setIsTimerActive(false)}
                  className="mt-8 px-6 py-2 bg-zinc-800 rounded-full text-xs font-bold hover:bg-zinc-700 transition-colors"
                >
                  Pular Descanso
                </button>
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-black text-white">{currentExercise.name}</h1>
              <p className="text-orange-500 font-bold uppercase text-sm tracking-tighter">{currentExercise.muscleGroup}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-center">
                <Repeat className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-[10px] text-zinc-500 uppercase font-black">Séries x Reps</p>
                <p className="text-lg font-bold text-white">{currentExercise.sets} x {currentExercise.reps}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-center">
                <Weight className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-[10px] text-zinc-500 uppercase font-black">Carga</p>
                <p className="text-lg font-bold text-white">{currentExercise.load || '--'}</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl text-center">
                <Timer className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-[10px] text-zinc-500 uppercase font-black">Descanso</p>
                <p className="text-lg font-bold text-white">{currentExercise.rest}</p>
              </div>
            </div>

            {currentExercise.notes && (
              <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-100 italic">{currentExercise.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-between gap-4">
          <button 
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => prev - 1)}
            className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="flex-1 flex gap-2">
            {!isTimerActive && (
              <button 
                onClick={() => startTimer(currentExercise.rest)}
                className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center hover:bg-zinc-800 transition-all"
              >
                <Timer className="w-6 h-6 text-green-500" />
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
                  // Finish workout
                  setIsFinished(true);
                }
              }}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30 transition-all uppercase tracking-widest text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              {currentIndex === workout.exercises.length - 1 ? 'Finalizar' : 'Próximo'}
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

      {/* Exercises List */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-[0.2em] px-2">Lista de Exercícios</h2>
        {workout.exercises.map((ex, index) => (
          <div 
            key={ex.exerciseId + index}
            className={cn(
              "bg-zinc-900 border rounded-3xl overflow-hidden transition-all duration-300",
              completedExercises.includes(ex.exerciseId) ? "border-green-600/30 bg-green-600/5 opacity-60" : "border-zinc-800"
            )}
          >
            <div className="p-5 flex items-center gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleComplete(ex.exerciseId);
                }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  completedExercises.includes(ex.exerciseId) 
                    ? "bg-green-600 text-white" 
                    : "bg-zinc-950 border border-zinc-800 text-zinc-700 hover:border-zinc-600"
                )}
              >
                <CheckCircle2 className="w-6 h-6" />
              </button>
              
              <div className="flex-1 cursor-pointer" onClick={() => toggleExercise(ex.exerciseId)}>
                <h3 className={cn(
                  "font-bold text-lg transition-all",
                  completedExercises.includes(ex.exerciseId) ? "text-zinc-500 line-through" : "text-white"
                )}>
                  {ex.name}
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] font-black text-orange-500 uppercase flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> {ex.sets}x{ex.reps}
                  </span>
                  {ex.load && (
                    <span className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1">
                      <Weight className="w-3 h-3" /> {ex.load}
                    </span>
                  )}
                </div>
              </div>

              <button 
                onClick={() => toggleExercise(ex.exerciseId)}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                {expandedExercise === ex.exerciseId ? <ChevronUp /> : <ChevronDown />}
              </button>
            </div>

            {expandedExercise === ex.exerciseId && (
              <div className="px-5 pb-5 pt-2 border-t border-zinc-800/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="aspect-video bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden relative">
                  {ex.gifUrl ? (
                    <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                      <Play className="w-12 h-12" />
                    </div>
                  )}
                </div>
                
                {ex.notes && (
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-sm text-zinc-400 italic">{ex.notes}</p>
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setIsTracking(true);
                    setCurrentIndex(index);
                  }}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
                >
                  Focar neste exercício
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

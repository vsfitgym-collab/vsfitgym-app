import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { Search, Dumbbell, ChevronLeft, ChevronRight, X, Info, Loader2, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  fetchExercises,
  fetchBodyParts,
  ExerciseDBItem,
  translateBodyPart,
  translateMuscle,
  translateEquipment,
  translateExerciseName,
  translateInstructions,
} from '../lib/exercisedb';

const ITEMS_PER_PAGE = 12;

const ExerciseLibrary: React.FC = () => {
  const { profile } = useAuth();

  // Data state
  const [exercises, setExercises] = useState<ExerciseDBItem[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter/pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalExercises, setTotalExercises] = useState(0);

  // Detail modal
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDBItem | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentOffset(0);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  // Fetch body parts list on mount
  useEffect(() => {
    fetchBodyParts()
      .then(setBodyParts)
      .catch(() => setBodyParts([]));
  }, []);

  // Fetch exercises when offset, search, or bodyPart changes
  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `https://exercisedb.dev/api/v1/exercises?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}&sortBy=name&sortOrder=asc`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (selectedBodyPart) {
        url = `https://exercisedb.dev/api/v1/bodyparts/${encodeURIComponent(selectedBodyPart)}/exercises?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar exercícios.');
      const json = await res.json();
      setExercises(json.data ?? []);
      setTotalExercises(json.metadata?.totalExercises ?? 0);
    } catch (err: any) {
      setError(err.message ?? 'Erro desconhecido.');
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [currentOffset, debouncedSearch, selectedBodyPart]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const totalPages = Math.ceil(totalExercises / ITEMS_PER_PAGE);
  const currentPage = Math.floor(currentOffset / ITEMS_PER_PAGE) + 1;

  const handleBodyPartSelect = (bp: string | null) => {
    setSelectedBodyPart(bp);
    setCurrentOffset(0);
    setSearchTerm('');
    setDebouncedSearch('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Biblioteca de Exercícios</h1>
          <p className="text-zinc-500 mt-1">
            {totalExercises > 0 ? (
              <span><span className="text-orange-500 font-bold">{totalExercises}</span> exercícios disponíveis via ExerciseDB</span>
            ) : 'Consulte a execução correta de cada movimento.'}
          </p>
        </div>
        {/* API Badge */}
        <div className="flex items-center gap-2 bg-orange-600/10 border border-orange-600/30 text-orange-400 text-xs font-bold px-4 py-2 rounded-xl">
          <Zap className="w-4 h-4" />
          ExerciseDB API
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar exercício (ex: push, chest, squat...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-600 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setCurrentOffset(0); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body Part Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleBodyPartSelect(null)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
              !selectedBodyPart
                ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
            )}
          >
            Todos
          </button>
          {bodyParts.map((bp) => (
            <button
              key={bp}
              onClick={() => handleBodyPartSelect(bp)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                selectedBodyPart === bp
                  ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              )}
            >
              {translateBodyPart(bp)}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-zinc-500">Carregando exercícios...</p>
        </div>
      ) : error ? (
        <div className="col-span-full p-20 text-center bg-zinc-900/50 border border-dashed border-red-800/40 rounded-3xl">
          <p className="text-red-400 font-bold">{error}</p>
          <button
            onClick={loadExercises}
            className="mt-4 text-orange-500 text-sm hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : exercises.length === 0 ? (
        <div className="p-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
          <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
          <p className="text-zinc-500">Nenhum exercício encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.exerciseId}
              exercise={ex}
              onClick={() => setSelectedExercise(ex)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setCurrentOffset(Math.max(0, currentOffset - ITEMS_PER_PAGE))}
            disabled={currentOffset === 0}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:border-orange-600 hover:text-white transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-zinc-400 text-sm font-bold">
            Página <span className="text-white">{currentPage}</span> de <span className="text-white">{totalPages}</span>
          </span>
          <button
            onClick={() => setCurrentOffset(currentOffset + ITEMS_PER_PAGE)}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:border-orange-600 hover:text-white transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <ExerciseModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}
    </div>
  );
};

// --- Exercise Card ---
const ExerciseCard: React.FC<{ exercise: ExerciseDBItem; onClick: () => void }> = ({ exercise, onClick }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-orange-600/50 transition-all cursor-pointer hover:shadow-xl hover:shadow-orange-600/10 hover:-translate-y-1"
    >
      {/* GIF / Thumbnail */}
      <div className="aspect-square bg-zinc-950 relative flex items-center justify-center overflow-hidden">
        {!imgError && exercise.gifUrl ? (
          <img
            src={exercise.gifUrl}
            alt={exercise.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <Dumbbell className="w-12 h-12 text-zinc-700 group-hover:text-orange-600 transition-colors" />
        )}
        {/* Body part badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-black/70 backdrop-blur-sm text-orange-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-orange-600/30">
            {translateBodyPart(exercise.bodyParts[0] ?? '')}
          </span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Info className="w-5 h-5 text-orange-400" />
            Ver Detalhes
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight mb-2">
          {translateExerciseName(exercise.name)}
        </h3>
        <div className="flex flex-wrap gap-1">
          {exercise.targetMuscles.slice(0, 2).map((m) => (
            <span key={m} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
              {translateMuscle(m)}
            </span>
          ))}
          {exercise.equipments.slice(0, 1).map((eq) => (
            <span key={eq} className="text-[10px] bg-zinc-800 text-orange-500/70 px-2 py-0.5 rounded-md">
              {translateEquipment(eq)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Exercise Detail Modal ---
const ExerciseModal: React.FC<{ exercise: ExerciseDBItem; onClose: () => void }> = ({ exercise, onClose }) => {
  const [imgError, setImgError] = useState(false);
  const [translatedInstructions, setTranslatedInstructions] = useState<string[]>([]);
  const [translatingInstructions, setTranslatingInstructions] = useState(false);

  useEffect(() => {
    setTranslatedInstructions([]);
    if (exercise.instructions.length === 0) return;
    setTranslatingInstructions(true);
    translateInstructions(exercise.instructions)
      .then(setTranslatedInstructions)
      .finally(() => setTranslatingInstructions(false));
  }, [exercise.exerciseId]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold text-white leading-tight">
              {translateExerciseName(exercise.name)}
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {exercise.bodyParts.map((bp) => (
                <span key={bp} className="bg-orange-600/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-md border border-orange-600/30">
                  {translateBodyPart(bp)}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800 p-2 rounded-xl transition-all flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* GIF */}
          <div className="bg-zinc-950 flex items-center justify-center" style={{ minHeight: 220, maxHeight: 320 }}>
            {!imgError && exercise.gifUrl ? (
              <img
                src={exercise.gifUrl}
                alt={exercise.name}
                className="h-64 w-auto object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12">
                <Dumbbell className="w-16 h-16 text-zinc-700" />
                <p className="text-zinc-600 text-sm">GIF não disponível</p>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Metadata chips */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Músculos Alvo</p>
                <div className="flex flex-wrap gap-1">
                  {exercise.targetMuscles.map((m) => (
                    <span key={m} className="bg-zinc-800 text-white text-xs px-2 py-1 rounded-lg">{translateMuscle(m)}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Equipamento</p>
                <div className="flex flex-wrap gap-1">
                  {exercise.equipments.map((eq) => (
                    <span key={eq} className="bg-zinc-800 text-orange-400 text-xs px-2 py-1 rounded-lg">{translateEquipment(eq)}</span>
                  ))}
                </div>
              </div>
              {exercise.secondaryMuscles.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Músculos Secundários</p>
                  <div className="flex flex-wrap gap-1">
                    {exercise.secondaryMuscles.map((m) => (
                      <span key={m} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded-lg">{translateMuscle(m)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            {exercise.instructions.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Instruções</p>
                {translatingInstructions ? (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    Traduzindo instruções...
                  </div>
                ) : (
                  <ol className="space-y-3">
                    {(translatedInstructions.length > 0 ? translatedInstructions : exercise.instructions).map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 text-xs font-black flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseLibrary;

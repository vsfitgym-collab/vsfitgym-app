import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { UserProfile, WorkoutExercise } from '../types';
import { ChevronLeft, Plus, Trash2, Save, Search, Dumbbell, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchExercises, ExerciseDBItem, translateBodyPart, translateMuscle, translateExerciseName } from '../lib/exercisedb';

interface WorkoutEditorProps {
  initialAssignmentType?: 'student' | 'plan';
  initialPlanId?: string;
  initialStudentId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

const WorkoutEditor: React.FC<WorkoutEditorProps> = ({
  initialAssignmentType = 'student',
  initialPlanId = '',
  initialStudentId = '',
  onSaved,
  onCancel
}) => {
  const { profile } = useAuth();

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [apiExercises, setApiExercises] = useState<ExerciseDBItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseSearchDebounced, setExerciseSearchDebounced] = useState('');
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'student' | 'plan'>(initialAssignmentType);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const fetchStudentsAndPlans = async () => {
      // Fetch students
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('personal_id', profile.uid)
        .eq('role', 'student');

      if (studentsData) {
        setStudents(studentsData.map(s => ({
          uid: s.uid,
          name: s.name,
          email: s.email,
          role: s.role,
          personalId: s.personal_id,
          photoUrl: s.photo_url,
          createdAt: s.created_at
        })) as UserProfile[]);
      }

      // Fetch plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('personal_id', profile.uid);
      
      if (plansData) {
        setPlans(plansData);
      }

      setLoading(false);
    };

    fetchStudentsAndPlans();
  }, [profile?.uid]);

  // Debounce exercise search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setExerciseSearchDebounced(exerciseSearch), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [exerciseSearch]);

  // Fetch exercises from ExerciseDB when modal opens or search changes
  useEffect(() => {
    if (!isExerciseModalOpen) return;
    setExercisesLoading(true);
    fetchExercises({ limit: 25, offset: 0, search: exerciseSearchDebounced, sortBy: 'name' })
      .then(res => setApiExercises(res.data ?? []))
      .catch(() => setApiExercises([]))
      .finally(() => setExercisesLoading(false));
  }, [isExerciseModalOpen, exerciseSearchDebounced]);

  const handleAddExerciseToWorkout = (ex: ExerciseDBItem) => {
    const newWorkoutExercise: WorkoutExercise = {
      exerciseId: ex.exerciseId,
      name: translateExerciseName(ex.name),
      muscleGroup: translateBodyPart(ex.bodyParts[0] ?? ex.targetMuscles[0] ?? ''),
      sets: 3,
      reps: '12',
      rest: '60s',
      load: '',
      gifUrl: ex.gifUrl
    };
    setSelectedExercises([...selectedExercises, newWorkoutExercise]);
    setIsExerciseModalOpen(false);
    setExerciseSearch('');
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, field: keyof WorkoutExercise, value: any) => {
    const updated = [...selectedExercises];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedExercises(updated);
  };

  const handleSaveWorkout = async () => {
    if ((assignmentType === 'student' && !selectedStudentId) || (assignmentType === 'plan' && !selectedPlanId) || !workoutName || selectedExercises.length === 0) {
      alert('Por favor, preencha todos os campos e adicione pelo menos um exercício.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('workouts')
        .insert({
          student_id: assignmentType === 'student' ? selectedStudentId : null,
          plan_id: assignmentType === 'plan' ? selectedPlanId : null,
          personal_id: profile?.uid,
          name: workoutName,
          is_premium: false,
          exercises: selectedExercises
        });

      if (error) throw error;
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Erro ao salvar treino.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 relative h-full flex flex-col">
      <div className="flex items-center gap-4 shrink-0">
        <button 
          onClick={onCancel}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold text-white">Criar Novo Treino</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
        {/* Sidebar: Workout Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-5">
             <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Atribuir a</label>
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAssignmentType('student')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    assignmentType === 'student' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
                  )}
                >
                  Aluno
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentType('plan')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    assignmentType === 'plan' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
                  )}
                >
                  Plano
                </button>
              </div>
            </div>

            {assignmentType === 'student' ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Aluno</label>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 appearance-none"
                >
                  <option value="">Selecione um aluno</option>
                  {students.map(s => (
                    <option key={s.uid} value={s.uid}>{s.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Plano</label>
                <select 
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 appearance-none"
                >
                  <option value="">Selecione um plano</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Nome do Treino</label>
              <input 
                type="text" 
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="Ex: Treino A - Superior"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
              />
            </div>

            <button 
              onClick={handleSaveWorkout}
              disabled={saving}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/20"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Treino'}
            </button>
          </div>
        </div>

        {/* Main Content: Exercises List */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Exercícios</h2>
            <button 
              onClick={() => setIsExerciseModalOpen(true)}
              className="text-orange-500 hover:text-orange-400 font-bold flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Exercício
            </button>
          </div>

          <div className="space-y-4">
            {selectedExercises.length > 0 ? selectedExercises.map((ex, index) => (
              <div key={index} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center border border-zinc-800">
                      <Dumbbell className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{ex.name}</h3>
                      <p className="text-xs text-zinc-500 uppercase">{ex.muscleGroup}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveExercise(index)}
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Séries</label>
                    <input 
                      type="number" 
                      value={ex.sets}
                      onChange={(e) => handleUpdateExercise(index, 'sets', parseInt(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-orange-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Reps</label>
                    <input 
                      type="text" 
                      value={ex.reps}
                      onChange={(e) => handleUpdateExercise(index, 'reps', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-orange-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Descanso</label>
                    <input 
                      type="text" 
                      value={ex.rest}
                      onChange={(e) => handleUpdateExercise(index, 'rest', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-orange-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Carga (kg)</label>
                    <input 
                      type="text" 
                      value={ex.load}
                      onChange={(e) => handleUpdateExercise(index, 'load', e.target.value)}
                      placeholder="Opcional"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-orange-600"
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 p-12 rounded-3xl text-center">
                <Dumbbell className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500">Nenhum exercício adicionado ao treino.</p>
                <button 
                  onClick={() => setIsExerciseModalOpen(true)}
                  className="mt-4 text-orange-500 font-bold hover:underline"
                >
                  Adicionar agora
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exercise Selection Modal */}
      {isExerciseModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl flex-col">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-2xl font-bold text-white">Selecionar Exercício</h2>
              <button onClick={() => setIsExerciseModalOpen(false)} className="text-zinc-500 hover:text-white">Fechar</button>
            </div>

            <div className="relative mb-6 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar exercício (ex: chest, squat, bicep...)"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-orange-600"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {exercisesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  <p className="text-zinc-500 text-sm">Carregando exercícios...</p>
                </div>
              ) : apiExercises.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Nenhum exercício encontrado.</p>
              ) : (
                apiExercises.map(ex => (
                  <button
                    key={ex.exerciseId}
                    onClick={() => handleAddExerciseToWorkout(ex)}
                    className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-orange-600/50 transition-all text-left flex items-center gap-4 group"
                  >
                    {ex.gifUrl && (
                      <img src={ex.gifUrl} alt={ex.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white group-hover:text-orange-500 transition-colors truncate">{translateExerciseName(ex.name)}</h4>
                      <p className="text-xs text-zinc-500 uppercase">{ex.targetMuscles.map(translateMuscle).join(', ')}</p>
                    </div>
                    <Plus className="w-5 h-5 text-zinc-700 group-hover:text-orange-500 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutEditor;

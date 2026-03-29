import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Plan } from '../types';
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  Calendar, 
  BadgeDollarSign, 
  Loader2, 
  ChevronLeft,
  Settings,
  ShieldCheck,
  CheckCircle2,
  X,
  Dumbbell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import WorkoutEditor from '../components/WorkoutEditor';

const PlansManagement: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<'months' | 'days'>('months');
  const [isFeatured, setIsFeatured] = useState(false);
  const [tagline, setTagline] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [planWorkouts, setPlanWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [isCreatingWorkout, setIsCreatingWorkout] = useState(false);

  const fetchPlans = async () => {
    if (!profile?.uid) return;
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('personal_id', profile.uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedPlans = (data || []).map(p => ({
        id: p.id,
        personalId: p.personal_id,
        name: p.name,
        price: p.price,
        durationMonths: p.duration_months,
        durationDays: p.duration_days,
        features: p.features || [],
        isFeatured: p.is_featured,
        tagline: p.tagline,
        createdAt: p.created_at
      }));
      
      setPlans(mappedPlans);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [profile?.uid]);

  const resetForm = () => {
    setEditingPlan(null);
    setName('');
    setPrice(0);
    setDuration(1);
    setDurationUnit('months');
    setIsFeatured(false);
    setTagline('');
    setFeaturesInput('');
    setPlanWorkouts([]);
  };

  const handleOpenNewPlan = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditPlan = async (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price);
    setDuration(plan.durationMonths > 0 ? plan.durationMonths : (plan.durationDays || 1));
    setDurationUnit(plan.durationMonths > 0 ? 'months' : 'days');
    setIsFeatured(plan.isFeatured || false);
    setTagline(plan.tagline || '');
    setFeaturesInput(plan.features?.join('\n') || '');
    
    setIsModalOpen(true);
    setLoadingWorkouts(true);
    
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('plan_id', plan.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPlanWorkouts(data || []);
    } catch (err) {
      console.error('Error fetching workouts for plan:', err);
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || duration < 1) return;
    
    setSaving(true);
    try {
      const dataObj = {
        personal_id: profile?.uid,
        name,
        price,
        duration_months: durationUnit === 'months' ? duration : 0,
        duration_days: durationUnit === 'days' ? duration : null,
        is_featured: isFeatured,
        tagline,
        features: featuresInput ? featuresInput.split('\n').filter(f => f.trim() !== '') : []
      };

      if (editingPlan) {
        const { error } = await supabase.from('plans').update(dataObj).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert(dataObj);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchPlans();
    } catch (err) {
      console.error('Error saving plan:', err);
      alert('Erro ao salvar plano.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!confirm('Tem certeza que deseja excluir este plano? Todos os treinamentos exclusivos dele também podem ser impactados.')) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      if (editingPlan && editingPlan.id === id) {
        setIsModalOpen(false);
        resetForm();
      }
      fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert('Erro ao excluir plano.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!confirm('Deseja realmente remover este treino do plano?')) return;
    try {
      const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
      if (error) throw error;
      setPlanWorkouts(planWorkouts.filter(w => w.id !== workoutId));
    } catch (err) {
      console.error('Error deleting workout:', err);
      alert('Erro ao excluir treino.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Gestão de Planos</h1>
            <p className="text-zinc-500 mt-1">Configure assinaturas e organize seus treinos por plano.</p>
          </div>
        </div>
        
        <button 
          onClick={handleOpenNewPlan}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Novo Plano
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <p className="text-zinc-500">Buscando planos...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 p-16 rounded-3xl text-center">
          <BadgeDollarSign className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhum plano cadastrado</h3>
          <p className="text-zinc-500 max-w-sm mx-auto mb-6">
            Crie seu primeiro plano para começar a gerenciar as assinaturas e o acesso dos seus alunos.
          </p>
          <button 
            onClick={handleOpenNewPlan}
            className="text-orange-500 font-bold hover:underline inline-flex items-center gap-2"
          >
            Criar meu primeiro plano <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              onClick={() => handleEditPlan(plan)}
              className={cn(
                "bg-zinc-900 border rounded-3xl p-6 transition-all group relative overflow-hidden cursor-pointer",
                plan.isFeatured ? "border-orange-600 shadow-lg shadow-orange-600/10" : "border-zinc-800 hover:border-orange-600/50 hover:-translate-y-1"
              )}
            >
              {plan.isFeatured && (
                <div className="absolute top-0 right-12 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-b-lg shadow-lg">
                  ⭐ Destaque
                </div>
              )}
              {/* Decorative background element */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600/5 blur-3xl rounded-full group-hover:bg-orange-600/10 transition-colors pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 bg-orange-600/10 rounded-2xl flex items-center justify-center border border-orange-600/20">
                  <CreditCard className="w-6 h-6 text-orange-500" />
                </div>
                <button 
                  type="button"
                  onClick={(e) => handleDeletePlan(plan.id, e)}
                  disabled={deletingId === plan.id}
                  className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 relative z-20"
                  title="Excluir Plano"
                >
                  {deletingId === plan.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-500 transition-colors">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-white">R$ {plan.price}</span>
                <span className="text-zinc-500 text-sm">/ total</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <Calendar className="w-4 h-4 text-orange-500/70" />
                  <span>Duração: <b className="text-zinc-200">
                    {plan.durationMonths > 0 
                      ? `${plan.durationMonths} ${plan.durationMonths === 1 ? 'mês' : 'meses'}`
                      : `${plan.durationDays} dias`}
                  </b></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-orange-500/70" />
                  <span>Acesso Total</span>
                </div>
              </div>

              {plan.features && plan.features.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-800/50 space-y-3">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Incluso no pacote</p>
                  <ul className="space-y-2">
                    {plan.features.slice(0, 3).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span className="truncate">{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 3 && (
                      <li className="text-xs text-orange-500 font-bold pl-5">
                        +{plan.features.length - 3} benefício(s)...
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-zinc-800/50">
                <div className="flex items-center justify-between text-xs text-zinc-500 uppercase font-black tracking-widest group-hover:text-orange-500 transition-colors">
                  <span>Ver Detalhes</span>
                  <Settings className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal / Workout Creator Sub-view */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          {isCreatingWorkout && editingPlan ? (
             <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-6xl shadow-2xl relative flex flex-col h-[95vh] animate-in slide-in-from-right-8 duration-300">
                <WorkoutEditor 
                   initialAssignmentType="plan"
                   initialPlanId={editingPlan.id}
                   onSaved={() => {
                      setIsCreatingWorkout(false);
                      handleEditPlan(editingPlan);
                   }}
                   onCancel={() => setIsCreatingWorkout(false)}
                />
             </div>
          ) : (
          <div className={cn(
            "bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 w-full shadow-2xl relative flex flex-col max-h-[95vh]",
            editingPlan ? "max-w-4xl" : "max-w-md"
          )}>
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h2>
                <p className="text-zinc-500 text-sm mt-1">{editingPlan ? 'Gerencie as configurações e os treinos vinculados.' : 'Defina os detalhes e o preço.'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className={cn("overflow-y-auto flex-1 min-h-0 pr-2", editingPlan ? "grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12" : "")}>
              
              {/* Form Configurações do Plano */}
              <form onSubmit={handleSavePlan} className="space-y-6">
                {editingPlan && <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">Detalhes</h3>}
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nome do Plano</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Plano Trimestral VIP"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 transition-colors"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Valor Total (R$)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dur./Unidade</label>
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                      <input
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-16 bg-transparent border-none text-white focus:outline-none px-2 font-bold text-center"
                        required
                      />
                      <select
                        value={durationUnit}
                        onChange={(e) => setDurationUnit(e.target.value as 'months' | 'days')}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg py-1 px-2 text-[10px] text-white focus:outline-none cursor-pointer uppercase font-black tracking-widest flex-1"
                      >
                        <option value="months">Meses</option>
                        <option value="days">Dias</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border",
                        isFeatured ? "bg-orange-600/10 border-orange-600/30" : "bg-zinc-800 border-zinc-700"
                      )}>
                        <ShieldCheck className={cn("w-4 h-4", isFeatured ? "text-orange-500" : "text-zinc-500")} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Destaque</p>
                        <p className="text-[10px] text-zinc-500 uppercase font-black">⭐ Principal Oferta</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFeatured(!isFeatured)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                        isFeatured ? "bg-orange-600" : "bg-zinc-700"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md",
                          isFeatured ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Gatilho de Venda (Tagline)</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Ex: Transforme seu corpo com foco por 3 meses!"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between">
                    Benefícios Inclusos
                    <span className="text-[10px] lowercase italic normal-case font-normal opacity-50">Um por linha</span>
                  </label>
                  <textarea
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    placeholder="Ex: Acesso ao chat&#10;Treinos VIP&#10;Consultoria semanal"
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 transition-colors resize-none"
                  />
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-zinc-800 pb-2 md:pb-0">
                  {editingPlan && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(editingPlan.id)}
                      className="p-3 rounded-xl border border-red-900 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      title="Excluir Plano"
                    >
                      <Trash2 className="w-5 h-5"/>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-lg shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Salvando...' : 'Salvar Plano'}
                  </button>
                </div>
              </form>

              {/* Lista Vertical de Treinos */}
              {editingPlan && (
                <div className="flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 pt-8 md:pt-0 md:pl-8">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Dumbbell className="w-5 h-5 text-orange-500"/>
                      Treinos Vinculados
                    </h3>
                    <button 
                      onClick={() => setIsCreatingWorkout(true)}
                      className="text-xs font-bold text-orange-500 flex items-center gap-1 hover:text-orange-400 transition-colors"
                      title="Criar novo treino para este plano"
                    >
                      <Plus className="w-4 h-4"/>
                      Novo
                    </button>
                  </div>
                  
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loadingWorkouts ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500"/>
                        <p className="text-sm text-zinc-500">Buscando treinos...</p>
                      </div>
                    ) : planWorkouts.length === 0 ? (
                      <div className="bg-zinc-950/50 border-2 border-dashed border-zinc-800 p-8 rounded-2xl text-center">
                        <Dumbbell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm font-bold">Nenhum treino adicionado.</p>
                        <p className="text-xs text-zinc-600 mt-1">Crie um novo treino e atribua a este plano.</p>
                        <button 
                          onClick={() => setIsCreatingWorkout(true)} 
                          className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Criar Treino Interno
                        </button>
                      </div>
                    ) : (
                      planWorkouts.map(w => (
                        <div key={w.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between group hover:border-orange-600/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center group-hover:border-orange-500/50 transition-colors">
                              <Dumbbell className="w-4 h-4 text-orange-500"/>
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{w.name}</h4>
                              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-0.5">
                                {w.exercises ? w.exercises.length : 0} exercícios
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.preventDefault(); handleDeleteWorkout(w.id); }} 
                            className="p-2 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded-xl text-zinc-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            title="Remover treino do plano"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlansManagement;

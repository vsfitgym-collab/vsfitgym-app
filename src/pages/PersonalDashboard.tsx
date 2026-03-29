import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Plus, Users, Dumbbell, Search, ChevronRight, MessageSquare, PlusCircle, LineChart, CreditCard, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserProfile, Workout, Plan, Subscription } from '../types';
import { cn } from '../lib/utils';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PersonalDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Subscription management
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [workoutLogs, setWorkoutLogs] = useState<Record<string, any[]>>({});
  const [filterPlanId, setFilterPlanId] = useState<string>('all');

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Students
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('personal_id', profile.uid);

        if (studentsError) throw studentsError;

        const mappedStudents = studentsData.map(s => ({
          uid: s.uid,
          name: s.name,
          email: s.email,
          role: s.role,
          personalId: s.personal_id,
          photoUrl: s.photo_url,
          createdAt: s.created_at
        })) as UserProfile[];

        setStudents(mappedStudents);

        // Fetch Subscriptions for these students
        const studentIds = mappedStudents.map(s => s.uid);
        if (studentIds.length > 0) {
          const { data: subsData, error: subsError } = await supabase
            .from('subscriptions')
            .select('*, plan:plans(*)')
            .in('student_id', studentIds);

          if (subsError) throw subsError;

          const subsMap: Record<string, Subscription> = {};
          subsData?.forEach(sub => {
            subsMap[sub.student_id] = {
              id: sub.id,
              studentId: sub.student_id,
              planId: sub.plan_id,
              status: sub.status,
              startDate: sub.start_date,
              endDate: sub.end_date,
              plan: sub.plan ? {
                id: sub.plan.id,
                personalId: sub.plan.personal_id,
                name: sub.plan.name,
                price: sub.plan.price,
                durationMonths: sub.plan.duration_months
              } : undefined
            };
          });
          setSubscriptions(subsMap);
        }

        // Fetch Plans for assignment
        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .eq('personal_id', profile.uid);
        
        if (plansError) throw plansError;
        setPlans(plansData.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          durationMonths: p.duration_months,
          personalId: p.personal_id
        })));

        // Fetch Workout Logs for students
        if (studentIds.length > 0) {
          const { data: logsData } = await supabase
            .from('workout_logs')
            .select('*, workout:workouts(name)')
            .in('user_id', studentIds)
            .order('completed_at', { ascending: false });
          
          if (logsData) {
            const logsMap: Record<string, any[]> = {};
            logsData.forEach(log => {
              if (!logsMap[log.user_id]) logsMap[log.user_id] = [];
              logsMap[log.user_id].push(log);
            });
            setWorkoutLogs(logsMap);
          }
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription
    const subscription = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `personal_id=eq.${profile.uid}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workout_logs' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentEmail || !newStudentName) return;
    setAddingStudent(true);
    setAddStudentError(null);
    try {
      const { data, error } = await supabase.functions.invoke('invite-student', {
        body: { studentEmail: newStudentEmail, studentName: newStudentName }
      });
      
      if (error) {
        // Se error message for um objeto JSON serializado, tentamos pegar o campo 'error'
        const errorMsg = error.message;
        try {
          const parsed = JSON.parse(errorMsg);
          throw new Error(parsed.error || parsed.message || 'Erro ao convidar aluno.');
        } catch {
          throw new Error(errorMsg || 'Erro ao convidar aluno.');
        }
      }
      
      // Se houvesse erro retornado dentro do data do body
      if (data && data.error) {
        throw new Error(data.error);
      }

      setIsAddStudentModalOpen(false);
      setNewStudentEmail('');
      setNewStudentName('');
    } catch (err: any) {
      setAddStudentError(err.message ?? 'Erro desconhecido.');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedPlanId) return;

    setAssigning(true);
    try {
      const plan = plans.find(p => p.id === selectedPlanId);
      if (!plan) throw new Error('Plano não encontrado');

      const startDate = new Date();
      const endDate = addMonths(startDate, plan.durationMonths);

      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          student_id: selectedStudent.uid,
          plan_id: selectedPlanId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          status: 'active'
        }, { onConflict: 'student_id' });

      if (error) throw error;

      setIsAssignModalOpen(false);
      setSelectedStudent(null);
      setSelectedPlanId('');
      // Reload is handled by real-time or we could manually refresh local state
    } catch (err: any) {
      console.error('Error assigning plan:', err);
      alert(`Erro ao vincular plano: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setAssigning(false);
    }
  };

  const getSubStatusBadge = (studentId: string) => {
    const sub = subscriptions[studentId];
    if (!sub) return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-wider border border-zinc-700">
        <AlertCircle className="w-3 h-3" />
        Sem Plano
      </span>
    );

    const isExpired = new Date(sub.endDate) < new Date();
    if (isExpired || sub.status === 'expired') return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider border border-red-500/20">
        <Clock className="w-3 h-3" />
        Expirado
      </span>
    );

    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        Ativo
      </span>
    );
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = filterPlanId === 'all' || 
                       (filterPlanId === 'none' && !subscriptions[student.uid]) ||
                       (subscriptions[student.uid]?.planId === filterPlanId);
                       
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Olá, {profile?.name.split(' ')[0]}! 👋</h1>
          <p className="text-zinc-500">Gerencie seus alunos e treinos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link 
            to="/create-workout"
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all border border-zinc-700"
          >
            <Dumbbell className="w-5 h-5 text-orange-500" />
            Criar Treino
          </Link>
          <button 
            onClick={() => setIsAddStudentModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20"
          >
            <Plus className="w-5 h-5" />
            Novo Aluno
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-zinc-500 text-sm font-bold uppercase">Alunos Ativos</span>
          </div>
          <p className="text-4xl font-black text-white">{students.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-600/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-zinc-500 text-sm font-bold uppercase">Treinos Criados</span>
          </div>
          <p className="text-4xl font-black text-white">24</p>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white">Meus Alunos</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-600 transition-colors w-full"
              />
            </div>
            <select
              value={filterPlanId}
              onChange={(e) => setFilterPlanId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-orange-600 transition-colors cursor-pointer"
            >
              <option value="all">Todos os Planos</option>
              <option value="none">Sem Plano</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-zinc-800">
          {filteredStudents.length > 0 ? filteredStudents.map((student) => (
            <div key={student.uid} className="p-4 hover:bg-zinc-800/50 transition-colors flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-white truncate">{student.name}</h3>
                  {subscriptions[student.uid] ? (
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                      subscriptions[student.uid].plan?.name.includes('Premium') 
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                        : subscriptions[student.uid].plan?.name.includes('Básico')
                        ? "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {subscriptions[student.uid].plan?.name.split('(')[0].trim()}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700">
                      S/ Plano
                    </span>
                  )}
                  {getSubStatusBadge(student.uid)}
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="truncate">{student.email}</span>
                  {subscriptions[student.uid] && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span className="text-zinc-400 font-medium">
                        Plano: {subscriptions[student.uid].plan?.name}
                      </span>
                    </>
                  )}
                  {workoutLogs[student.uid] && (
                    <>
                      <span className="text-zinc-700">•</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        {workoutLogs[student.uid].length} Treinos
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link 
                  to={`/chat/${student.uid}`}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-orange-500 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>
                <Link 
                  to={`/evolution?studentId=${student.uid}`}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-blue-500 transition-colors"
                >
                  <LineChart className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => { setSelectedStudent(student); setIsAssignModalOpen(true); }}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors"
                  title="Vincular Plano"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
                <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
              </div>
            </div>
          )) : (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhum aluno encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Convidar Aluno</h2>
            <p className="text-zinc-500 text-sm mb-6">O aluno receberá um e-mail de convite para criar a sua conta.</p>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Nome do Aluno</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">E-mail do Aluno</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
                  required
                />
              </div>
              {addStudentError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {addStudentError}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAddStudentModalOpen(false); setAddStudentError(null); setNewStudentEmail(''); setNewStudentName(''); }}
                  className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-lg shadow-orange-600/20"
                >
                  {addingStudent ? 'Enviando...' : 'Convidar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Assign Plan Modal */}
      {isAssignModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600/5 blur-3xl rounded-full" />
            
            <h2 className="text-2xl font-bold text-white mb-2">Vincular Plano</h2>
            <p className="text-zinc-500 text-sm mb-6">
              Selecione um plano para <span className="text-white font-bold">{selectedStudent.name}</span>. 
              A data de vencimento será calculada automaticamente.
            </p>
            
            <form onSubmit={handleAssignPlan} className="space-y-5 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Escolha o Plano</label>
                {plans.length === 0 ? (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                    <p className="text-zinc-500 text-sm mb-2">Você ainda não tem planos criados.</p>
                    <Link to="/plans" className="text-orange-500 text-xs font-bold hover:underline">Ir para Gestão de Planos</Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {plans.map(plan => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border transition-all text-left flex justify-between items-center group",
                          selectedPlanId === plan.id 
                            ? "bg-emerald-600/10 border-emerald-500 text-white" 
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                        )}
                      >
                        <div>
                          <p className="font-bold text-sm group-hover:text-white transition-colors">{plan.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-black">{plan.durationMonths} {plan.durationMonths === 1 ? 'mês' : 'meses'}</p>
                        </div>
                        <p className="font-black text-xs text-orange-500">R$ {plan.price}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsAssignModalOpen(false); setSelectedStudent(null); setSelectedPlanId(''); }}
                  className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedPlanId}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-30 transition-colors shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {assigning ? 'Salvando...' : 'Ativar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalDashboard;

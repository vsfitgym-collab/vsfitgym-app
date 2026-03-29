import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Evolution as EvolutionType } from '../types';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Plus, LineChart as LucideLineChart, Scale, Ruler, Camera, ChevronRight, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSearchParams, Link } from 'react-router-dom';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';

const Evolution: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId') || profile?.uid;
  const { isTrial, canUploadPhotos, canSeeDetailedGraphs } = usePlanAccess();
  
  const [evolutions, setEvolutions] = useState<EvolutionType[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEvolution, setNewEvolution] = useState({
    weight: '',
    chest: '',
    waist: '',
    biceps: '',
    thigh: ''
  });
  const [selectedMetric, setSelectedMetric] = useState<'weight' | 'chest' | 'waist' | 'biceps' | 'thigh'>('weight');
  const [comparisonPhotos, setComparisonPhotos] = useState<{before: string | null, after: string | null}>({before: null, after: null});
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!studentId) return;

    const fetchEvolutions = async () => {
      const { data, error } = await supabase
        .from('evolution')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: true });

      if (data) {
        const mappedData = data.map(ev => ({
          id: ev.id,
          studentId: ev.student_id,
          date: ev.date,
          weight: ev.weight,
          measurements: ev.measurements,
          photos: ev.photos
        }));
        setEvolutions(mappedData as EvolutionType[]);
      }
    };

    fetchEvolutions();

    const subscription = supabase
      .channel('evolution_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evolution', filter: `student_id=eq.${studentId}` }, () => {
        fetchEvolutions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [studentId]);

  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      const { error } = await supabase
        .from('evolution')
        .insert({
          student_id: studentId,
          date: new Date().toISOString(),
          weight: parseFloat(newEvolution.weight),
          measurements: {
            chest: parseFloat(newEvolution.chest),
            waist: parseFloat(newEvolution.waist),
            biceps: parseFloat(newEvolution.biceps),
            thigh: parseFloat(newEvolution.thigh)
          }
        });
      
      if (error) throw error;
      setIsAddModalOpen(false);
      setNewEvolution({ weight: '', chest: '', waist: '', biceps: '', thigh: '' });
    } catch (error) {
      console.error(error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, evolutionId: string) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(evolutionId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.uid}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('evolution')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('evolution')
        .getPublicUrl(filePath);

      // Update evolution record
      const evolution = evolutions.find(ev => ev.id === evolutionId);
      const currentPhotos = evolution?.photos || [];
      
      const { error: updateError } = await supabase
        .from('evolution')
        .update({
          photos: [...currentPhotos, publicUrl]
        })
        .eq('id', evolutionId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erro ao enviar foto.');
    } finally {
      setUploading(null);
    }
  };

  const handleDeletePhoto = async (evolutionId: string, photoUrl: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta foto?')) return;

    try {
      const evolution = evolutions.find(ev => ev.id === evolutionId);
      const newPhotos = (evolution?.photos || []).filter(p => p !== photoUrl);

      const { error } = await supabase
        .from('evolution')
        .update({ photos: newPhotos })
        .eq('id', evolutionId);

      if (error) throw error;

      // Extract path from URL to delete from storage
      const path = photoUrl.split('/evolution/')[1];
      if (path) {
        await supabase.storage.from('evolution').remove([path]);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const chartData = (evolutions || []).map(ev => {
    try {
      if (!ev || !ev.date) return { date: '...', value: 0 };
      const date = new Date(ev.date);
      return {
        date: isNaN(date.getTime()) ? '...' : format(date, 'dd/MM'),
        value: selectedMetric === 'weight' ? (ev.weight || 0) : ((ev.measurements as any)?.[selectedMetric] || 0)
      };
    } catch {
      return { date: '...', value: 0 };
    }
  });

  const PremiumGatedChart = ({ children, isLocked }: { children: React.ReactNode, isLocked: boolean }) => (
    <div className="relative h-64 w-full">
      {isLocked && (
        <div className="absolute inset-0 z-10 bg-zinc-950/40 backdrop-blur-[6px] rounded-3xl flex flex-col items-center justify-center p-6 text-center border border-white/5">
          <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-orange-600/40 animate-bounce">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 italic">Acesso Premium 🔥</h3>
          <p className="text-zinc-300 text-sm font-bold mb-6 max-w-[200px]">
            Libere gráficos de Peito, Cintura, Bíceps e Coxa no Plano Premium.
          </p>
          <Link 
            to="/subscriptions"
            className="bg-white text-zinc-950 px-8 py-3 rounded-full font-black uppercase text-xs tracking-widest hover:bg-orange-600 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            Fazer Upgrade Agora
          </Link>
        </div>
      )}
      <div className={cn("h-full w-full", isLocked && "grayscale opacity-30 pointer-events-none blur-[2px]")}>
        {children}
      </div>
    </div>
  );

  const metrics = [
    { id: 'weight', label: 'Peso', unit: 'kg', icon: <Scale className="w-4 h-4" /> },
    { id: 'chest', label: 'Peito', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
    { id: 'waist', label: 'Cintura', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
    { id: 'biceps', label: 'Bíceps', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
    { id: 'thigh', label: 'Coxa', unit: 'cm', icon: <Ruler className="w-4 h-4" /> },
  ];

  const handleSelectPhotoForComparison = (url: string) => {
    if (!comparisonPhotos.before) {
      setComparisonPhotos({ ...comparisonPhotos, before: url });
    } else if (!comparisonPhotos.after) {
      setComparisonPhotos({ ...comparisonPhotos, after: url });
      setIsComparisonModalOpen(true);
    } else {
      setComparisonPhotos({ before: url, after: null });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Evolução Física</h1>
          <p className="text-zinc-500">Acompanhe seu progresso ao longo do tempo.</p>
        </div>
        {profile?.uid === studentId && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20"
          >
            <Plus className="w-5 h-5" />
            Novo Registro
          </button>
        )}
      </div>

      {/* Chart Section */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-600/10 rounded-2xl flex items-center justify-center">
              <LucideLineChart className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Histórico de Evolução</h2>
          </div>
          
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2">
            {metrics.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  selectedMetric === m.id 
                    ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                )}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <PremiumGatedChart isLocked={!canSeeDetailedGraphs && selectedMetric !== 'weight'}>
          {chartData.filter(d => d.value > 0).length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.filter(d => d.value > 0)}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  unit={selectedMetric === 'weight' ? 'kg' : 'cm'}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    color: '#fff' 
                  }}
                  itemStyle={{ color: '#ea580c' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ea580c" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-800 rounded-[2rem]">
              <LucideLineChart className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">Registre esta métrica pelo menos 2 vezes para ver o gráfico.</p>
            </div>
          )}
        </PremiumGatedChart>
      </div>

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-orange-500" />
              Histórico de Medidas
            </h2>
          </div>
          <div className="divide-y divide-zinc-800 relative">
            {isTrial && (
              <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl max-w-xs">
                  <Lock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-white font-bold mb-2">Histórico Bloqueado</h3>
                  <p className="text-sm text-zinc-500 mb-4">No período de teste você vê apenas o gráfico de peso. Assine o plano mensal para liberar medidas e fotos!</p>
                </div>
              </div>
            )}
            {evolutions.length > 0 ? [...evolutions].reverse().map((ev) => (
              <div key={ev.id} className="p-6 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-bold text-white">
                      {format(new Date(ev.date), "d 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <span className="bg-orange-600/10 text-orange-500 text-sm font-black px-3 py-1 rounded-full border border-orange-600/20">
                    {ev.weight} kg
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Peito</p>
                    <p className="text-sm font-bold text-zinc-300">{ev.measurements?.chest || '--'} cm</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Cintura</p>
                    <p className="text-sm font-bold text-zinc-300">{ev.measurements?.waist || '--'} cm</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Bíceps</p>
                    <p className="text-sm font-bold text-zinc-300">{ev.measurements?.biceps || '--'} cm</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Coxa</p>
                    <p className="text-sm font-bold text-zinc-300">{ev.measurements?.thigh || '--'} cm</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center">
                <Scale className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500">Nenhum registro de evolução ainda.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-orange-500" />
              Fotos de Progresso
            </h2>
          </div>
          <div className="p-6 relative">
            {isTrial && (
              <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl max-w-xs">
                  <Camera className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-white font-bold mb-2">Fotos de Progresso</h3>
                  <p className="text-sm text-zinc-500 mb-4">O acompanhamento visual completo está disponível apenas para alunos Premium.</p>
                </div>
              </div>
            )}
            <h3 className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">Galeria de Fotos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* File Input (Hidden) */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  const lastEv = evolutions[evolutions.length - 1];
                  if (lastEv) handlePhotoUpload(e, lastEv.id);
                  else alert('Faça um registro de medidas primeiro para vincular a foto.');
                }}
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[3/4] bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-700 hover:text-orange-500 hover:border-orange-600/50 transition-all cursor-pointer group"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                ) : (
                  <>
                    <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Adicionar</span>
                  </>
                )}
              </div>

              {/* Render All Photos from History */}
              {evolutions.flatMap(ev => (ev.photos || []).map(photo => ({ url: photo, evId: ev.id }))).reverse().map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleSelectPhotoForComparison(item.url)}
                  className={cn(
                    "aspect-[3/4] bg-zinc-800 rounded-2xl overflow-hidden relative group cursor-pointer border-2 transition-all",
                    comparisonPhotos.before === item.url || comparisonPhotos.after === item.url 
                      ? "border-orange-500 scale-95 shadow-lg shadow-orange-500/20" 
                      : "border-transparent"
                  )}
                >
                  <img 
                    src={item.url} 
                    alt="Progresso" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(item.evId, item.url); }}
                      className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest bg-orange-600 px-2 py-1 rounded-md">Comparar</span>
                  </div>
                  {(comparisonPhotos.before === item.url || comparisonPhotos.after === item.url) && (
                    <div className="absolute top-2 right-2 bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">
                      {comparisonPhotos.before === item.url ? '1' : '2'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Modal */}
      {isComparisonModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => { setIsComparisonModalOpen(false); setComparisonPhotos({before: null, after: null}); }}
              className="absolute top-6 right-6 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Antes & Depois 🔥</h2>
              <p className="text-zinc-500">Compare sua evolução visual e veja o resultado do seu esforço!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-orange-600 text-white text-xs font-black px-4 py-1.5 rounded-full inline-block uppercase tracking-widest">Início / Anterior</div>
                <div className="aspect-[3/4] bg-zinc-950 rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-xl">
                  {comparisonPhotos.before && <img src={comparisonPhotos.before} className="w-full h-full object-cover" alt="Antes" />}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-emerald-600 text-white text-xs font-black px-4 py-1.5 rounded-full inline-block uppercase tracking-widest">Atual / Recente</div>
                <div className="aspect-[3/4] bg-zinc-950 rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-xl">
                  {comparisonPhotos.after && <img src={comparisonPhotos.after} className="w-full h-full object-cover" alt="Depois" />}
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-zinc-950/50 border border-zinc-800 rounded-3xl text-center">
              <p className="text-orange-500 font-bold italic">"O resultado não é mágica, é constância!"</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Evolution Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Novo Registro</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white">
                <X />
              </button>
            </div>
            <form onSubmit={handleAddEvolution} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Peso (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newEvolution.weight}
                    onChange={(e) => setNewEvolution({...newEvolution, weight: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Peito (cm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newEvolution.chest}
                    onChange={(e) => setNewEvolution({...newEvolution, chest: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Cintura (cm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newEvolution.waist}
                    onChange={(e) => setNewEvolution({...newEvolution, waist: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Bíceps (cm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newEvolution.biceps}
                    onChange={(e) => setNewEvolution({...newEvolution, biceps: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Coxa (cm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newEvolution.thigh}
                    onChange={(e) => setNewEvolution({...newEvolution, thigh: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
              >
                Salvar Evolução
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Evolution;

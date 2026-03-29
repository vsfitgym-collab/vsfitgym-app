import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Target, 
  Camera, 
  LogOut, 
  Save, 
  Shield, 
  TrendingUp, 
  Scale, 
  Calendar,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Evolution } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Profile: React.FC = () => {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [goal, setGoal] = useState(profile?.goal || '');
  const [lastEvolution, setLastEvolution] = useState<Evolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone || '');
      setGoal(profile.goal || '');
      fetchLastEvolution();
    }
  }, [profile]);

  const fetchLastEvolution = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('evolution')
      .select('*')
      .eq('student_id', profile.uid)
      .order('date', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      setLastEvolution({
        id: data[0].id,
        studentId: data[0].student_id,
        date: data[0].date,
        weight: data[0].weight,
        measurements: data[0].measurements,
        photos: data[0].photos
      } as Evolution);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone,
          goal
        })
        .eq('uid', profile.uid);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.uid}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('uid', profile.uid);

      if (updateError) throw updateError;
      
      setMessage({ type: 'success', text: 'Foto de perfil atualizada!' });
    } catch (err: any) {
      console.error(err);
      alert('Erro ao carregar foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Meu Perfil</h1>
          <p className="text-zinc-500">Gerencie suas informações e acompanhe seu progresso.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 text-center relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-yellow-500" />
            
            <div className="relative mb-6 inline-block">
              <div className="w-32 h-32 rounded-[40px] bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105 shadow-xl">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-zinc-500" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white border-4 border-zinc-900 shadow-lg hover:bg-orange-700 transition-colors"
                title="Mudar Foto"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">{profile?.name}</h2>
              <div className="flex items-center justify-center gap-1.5 text-zinc-500">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {profile?.role === 'personal' ? 'Personal Trainer' : 'Aluno'}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Desde</p>
                <p className="text-sm font-bold text-white">
                  {profile?.createdAt ? (
                    (() => {
                      const d = new Date(profile.createdAt);
                      return !isNaN(d.getTime()) ? format(d, 'MMM yyyy', { locale: ptBR }) : '--';
                    })()
                  ) : '--'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Objetivo</p>
                <p className="text-sm font-bold text-orange-500 italic truncate">{profile?.goal || 'Não definido'}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="w-full bg-zinc-900 border border-red-900/30 text-red-500 hover:bg-red-500/10 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all transition-duration-300"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </button>
        </div>

        {/* Info/Stats Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Evolution Summary */}
          {profile?.role === 'student' && (
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-[32px] p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white italic uppercase flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Status da Evolução
                </h3>
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                  Resumo
                </span>
              </div>

              {lastEvolution ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-zinc-950/50 p-6 rounded-[24px] border border-zinc-800/50 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-20" />
                    <Scale className="w-4 h-4 text-emerald-500 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Último Peso</p>
                    <p className="text-2xl font-black text-white tabular-nums">{lastEvolution.weight} <span className="text-xs text-zinc-500">kg</span></p>
                  </div>
                  <div className="bg-zinc-950/50 p-6 rounded-[24px] border border-zinc-800/50 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20" />
                    <CheckCircle2 className="w-4 h-4 text-blue-500 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Cintura</p>
                    <p className="text-2xl font-black text-white tabular-nums">{lastEvolution.measurements?.waist || '--'} <span className="text-xs text-zinc-500">cm</span></p>
                  </div>
                  <div className="bg-zinc-950/50 p-6 rounded-[24px] border border-zinc-800/50 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-20" />
                    <Calendar className="w-4 h-4 text-orange-500 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Atualizado em</p>
                    <p className="text-lg font-black text-white">
                      {lastEvolution?.date ? (() => {
                        const d = new Date(lastEvolution.date);
                        return !isNaN(d.getTime()) ? format(d, 'dd/MM/yy') : '--';
                      })() : '--'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-zinc-950 border border-zinc-800 rounded-3xl border-dashed">
                  <TrendingUp className="w-8 h-8 text-zinc-800 mx-auto mb-2 opacity-20" />
                  <p className="text-zinc-600 text-sm">Nenhuma evolução registrada ainda.</p>
                </div>
              )}
            </div>
          )}

          {/* Edit Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase">Informações Básicas</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-orange-600/50 transition-all font-medium"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail (Login)</label>
                  <div className="relative opacity-50">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="w-full bg-black border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-zinc-500 focus:outline-none cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Telefone/WhatsApp</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-orange-500 transition-colors" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-orange-600/50 transition-all font-medium"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">Objetivo Fitness</label>
                  <div className="relative group">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-orange-500 transition-colors" />
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-orange-600/50 transition-all font-medium appearance-none"
                    >
                      <option value="">Selecione um objetivo</option>
                      <option value="Perda de Peso">Perda de Peso</option>
                      <option value="Ganho de Massa">Ganho de Massa</option>
                      <option value="Condicionamento">Condicionamento Físico</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              </div>

              {message && (
                <div className={cn(
                  "p-4 rounded-2xl text-sm font-bold animate-in fade-in duration-300",
                  message.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                )}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-white hover:bg-zinc-200 text-black font-black px-10 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-white/5 active:scale-95 uppercase tracking-widest text-xs"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

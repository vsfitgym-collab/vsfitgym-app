import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Mail, Lock, User, ArrowRight, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (signUpData.user) {
          const finalRole = email === 'vsfitgym@gmail.com' ? 'personal' : 'student';
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              uid: signUpData.user.id,
              name,
              email,
              phone,
              goal,
              role: finalRole,
              personal_id: finalRole === 'student' ? '421fb03a-d564-4de5-a4d5-45ea9273a5fd' : null,
              created_at: new Date().toISOString()
            });
          if (profileError) throw profileError;
        }
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-2xl shadow-xl shadow-orange-600/20 mb-6 rotate-3">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter uppercase italic">VSFit Gym</h1>
          <p className="text-zinc-500 mt-2">Sua evolução começa aqui.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex bg-zinc-950 p-1 rounded-xl mb-8">
            <button 
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                isLogin ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Entrar
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
                !isLogin ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-orange-600 transition-colors"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-orange-600 transition-colors"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-orange-600 transition-colors"
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="Telefone/WhatsApp"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 transition-colors"
                  />
                </div>
                <div className="relative">
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-600 transition-colors appearance-none"
                    required
                  >
                    <option value="" disabled>Qual seu objetivo?</option>
                    <option value="Perda de Peso">Perda de Peso</option>
                    <option value="Ganho de Massa">Ganho de Massa</option>
                    <option value="Condicionamento">Condicionamento Físico</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </>
            )}

            {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? 'Processando...' : (
                <>
                  {isLogin ? 'Entrar' : 'Começar Agora'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-zinc-500 font-bold">Ou continue com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
          >
            <Chrome className="w-5 h-5" />
            Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

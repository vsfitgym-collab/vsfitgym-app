import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Dumbbell, 
  Users, 
  LineChart, 
  MessageSquare, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard,
  BadgeDollarSign,
  ChevronRight,
  User,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!profile) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', profile.uid)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('global_notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { 
      label: 'Dashboard', 
      path: profile?.role === 'personal' ? '/personal' : '/student', 
      icon: LayoutDashboard 
    },
    ...(profile?.role === 'personal' ? [
      { label: 'Planos', path: '/plans', icon: BadgeDollarSign }
    ] : [
      { label: 'Planos', path: '/subscriptions', icon: BadgeDollarSign }
    ]),
    { label: 'Exercícios', path: '/exercises', icon: Dumbbell },
    { label: 'Evolução', path: '/evolution', icon: LineChart },
    { 
      label: 'Chat', 
      path: '/chat', 
      icon: MessageSquare,
      badge: unreadCount > 0
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">VSFit Gym</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className={cn(
        "fixed inset-0 z-40 bg-zinc-900 border-r border-zinc-800 w-64 transform transition-transform duration-300 md:relative md:translate-x-0",
        isMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter italic uppercase">VSFit Gym</span>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  location.pathname === item.path 
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  location.pathname === item.path ? "text-white" : "group-hover:text-orange-500"
                )} />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
                )}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-zinc-800">
            {/* User Profile Summary */}
            <div className="p-4 border-t border-zinc-800">
              <Link 
                to="/profile"
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                  {profile?.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{profile?.name?.split(' ')[0] || 'Usuário'}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{profile?.role === 'personal' ? 'Personal' : 'Aluno'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-zinc-500 transition-colors" />
              </Link>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-400 hover:bg-red-950/30 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;

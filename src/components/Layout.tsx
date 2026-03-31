import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../lib/supabase";
import {
  Dumbbell,
  Users,
  LineChart,
  MessageSquare,
  LogOut,
  LayoutDashboard,
  BadgeDollarSign,
  ChevronRight,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../lib/utils";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!profile) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", profile.uid)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel("global_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchUnread();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Dashboard",
      path: profile?.role === "personal" ? "/personal" : "/student",
      icon: LayoutDashboard,
    },
    ...(profile?.role === "personal"
      ? [{ label: "Planos", path: "/plans", icon: BadgeDollarSign }]
      : [{ label: "Planos", path: "/subscriptions", icon: BadgeDollarSign }]),
    { label: "Exercícios", path: "/exercises", icon: Dumbbell },
    { label: "Evolução", path: "/evolution", icon: LineChart },
    {
      label: "Chat",
      path: "/chat",
      icon: MessageSquare,
      badge: unreadCount > 0,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-zinc-900 border-r border-zinc-800 flex-col fixed top-0 left-0 h-screen pt-6 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tighter italic uppercase">
            VSFit Gym
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                location.pathname === item.path
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  location.pathname === item.path
                    ? "text-white"
                    : "group-hover:text-orange-500",
                )}
              />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <div className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
              )}
            </Link>
          ))}
        </nav>

        {/* Profile & Logout */}
        <div className="pt-6 border-t border-zinc-800 space-y-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {profile?.name?.split(" ")[0] || "Usuário"}
              </p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                {profile?.role === "personal" ? "Personal" : "Aluno"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-zinc-500 transition-colors shrink-0" />
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-400 hover:bg-red-950/30 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile + Tablet View */}
      <div className="flex flex-col w-full md:ml-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">VSFit Gym</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-2 py-2 z-50">
          <div className="flex items-center justify-between gap-1 max-w-full overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center py-3 px-3 rounded-xl transition-all duration-200 shrink-0 relative group",
                  location.pathname === item.path
                    ? "bg-orange-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                )}
                title={item.label}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6",
                    location.pathname === item.path
                      ? "text-white"
                      : "group-hover:text-orange-500",
                  )}
                />
                <span className="text-[10px] font-bold mt-1 whitespace-nowrap">
                  {item.label}
                </span>
                {item.badge && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Layout;

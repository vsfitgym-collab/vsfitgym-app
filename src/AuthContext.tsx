import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('uid', userId)
        .single();

      if (error && error.code === 'PGRST116') { // Profile not found
        // Create profile for OAuth users
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const finalRole = user.email === 'vsfitgym@gmail.com' ? 'personal' : 'student';
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              uid: user.id,
              name: user.user_metadata.full_name || user.email?.split('@')[0] || 'Usuário',
              email: user.email || '',
              role: finalRole,
              personal_id: finalRole === 'student' ? '421fb03a-d564-4de5-a4d5-45ea9273a5fd' : null,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          setProfile(newProfile as UserProfile);
        }
      } else if (error) {
        throw error;
      } else {
        // Map snake_case to camelCase
        const mappedProfile = {
          uid: data.uid,
          name: data.name,
          email: data.email,
          role: data.role,
          personalId: data.personal_id,
          photoUrl: data.photo_url,
          phone: data.phone,
          goal: data.goal,
          createdAt: data.created_at
        };
        setProfile(mappedProfile as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

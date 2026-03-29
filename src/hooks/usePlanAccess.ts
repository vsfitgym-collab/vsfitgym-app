import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Subscription } from '../types';

export const usePlanAccess = () => {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*, plan:plans(*)')
          .eq('student_id', profile.uid)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching subscription:', error);
        } else if (data) {
          setSubscription({
            id: data.id,
            studentId: data.student_id,
            planId: data.plan_id,
            status: data.status,
            startDate: data.start_date,
            endDate: data.end_date,
            plan: data.plan
          } as any);
        }
      } catch (err) {
        console.error('Unexpected error in usePlanAccess:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [profile]);

  // Regrais de Negócio por Plano
  const isPersonal = profile?.role === 'personal';
  const planName = subscription?.plan?.name?.toLowerCase() || '';
  const isTrial = !isPersonal && (planName.includes('teste') || planName.includes('7 dias'));
  
  // No plano de 7 dias, o aluno SÓ vê o gráfico de peso.
  const canSeeDetailedGraphs = isPersonal || (!isTrial && !!subscription);
  
  // No plano de 7 dias, as fotos e medidas avançadas ficam com cadeado.
  const canUploadPhotos = isPersonal || (!isTrial && !!subscription);
  
  // Acesso a treinos e chat é liberado para todos com subscription ativa.
  const hasActiveSubscription = isPersonal || (!!subscription && new Date(subscription.endDate) >= new Date());

  return {
    subscription,
    loading,
    isTrial,
    canSeeDetailedGraphs,
    canUploadPhotos,
    hasActiveSubscription,
    planName: subscription?.plan?.name || 'Sem Plano'
  };
};

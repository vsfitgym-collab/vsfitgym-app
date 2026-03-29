import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isSupabaseError = this.state.error?.message.includes('Supabase credentials missing');

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-4">
              {isSupabaseError ? 'Configuração Necessária' : 'Algo deu errado'}
            </h1>
            
            <p className="text-zinc-400 mb-8 leading-relaxed">
              {isSupabaseError 
                ? 'Para que o VSFit Gym funcione, você precisa configurar as chaves do Supabase nas configurações do projeto (Secrets).'
                : 'Ocorreu um erro inesperado. Nossa equipe técnica já foi notificada.'}
            </p>

            {isSupabaseError && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-8 text-left">
                <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Variáveis Necessárias:</p>
                <code className="text-xs text-orange-500 block mb-1">VITE_SUPABASE_URL</code>
                <code className="text-xs text-orange-500 block">VITE_SUPABASE_ANON_KEY</code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] React Uncaught Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#faf9f6] flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-white border border-[#eae6e1] rounded-2xl p-8 shadow-xl text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-5 text-red-600">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
              Recuperação do Sistema Omnix AI
            </h1>
            
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Ocorreu uma exceção inesperada durante a renderização da interface. O estado do sistema foi preservado com segurança.
            </p>

            {this.state.error && (
              <div className="w-full bg-red-50/60 border border-red-100 rounded-xl p-3 text-left mb-6 text-xs font-mono text-red-800 overflow-x-auto max-h-36">
                <span className="font-bold block mb-1">Detalhes do Erro:</span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Novamente
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Home className="w-4 h-4" />
                Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

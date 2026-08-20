import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  messageId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MessageErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MessageErrorBoundary] Caught message rendering error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full my-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Mensagem Indisponível</p>
              <p className="text-[11px] text-amber-700/90 mt-0.5 leading-relaxed">
                Não foi possível renderizar esta mensagem devido a um formato de data/hora ou conteúdo inválido.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="shrink-0 text-[11px] font-medium text-amber-800 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MessageErrorBoundary;

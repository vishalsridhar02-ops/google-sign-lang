import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, Home, Sparkles } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime error in Aavishkar Kiosk:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    this.handleReset();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white bg-hud-grid relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative max-w-xl w-full glass-panel-elevated rounded-3xl border border-rose-500/30 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] text-center space-y-6">
            {/* Warning Icon Badge */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-950 to-slate-900 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.35)] animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold tracking-widest uppercase">
                <Terminal className="w-3.5 h-3.5" />
                <span>Runtime Exception Shield</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                Aavishkar Kiosk Diagnostic State
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                An unexpected client-side error occurred. The fallback error shield has prevented a blank screen and preserved the system environment.
              </p>
            </div>

            {/* Error Message Box */}
            <div className="bg-slate-950/90 rounded-2xl border border-white/10 p-4 text-left space-y-2 overflow-hidden shadow-inner">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Exception Details</span>
                <span className="text-rose-400 font-bold">Uncaught</span>
              </div>
              <pre className="text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap break-all p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 max-h-32">
                {this.state.error?.message || 'Unknown runtime error'}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Terminal</span>
              </button>

              <button
                onClick={this.handleClearStorage}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 hover:border-rose-400/40 font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Reset Kiosk Cache</span>
              </button>
            </div>

            {/* Footer Note */}
            <div className="pt-2 text-[10px] font-mono text-slate-500">
              JAIN (Deemed-to-be University) • Aavishkar ISL Neural Kiosk
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

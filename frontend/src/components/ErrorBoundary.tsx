import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  feature?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// Error Boundary genérico
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center bg-slate-900/50 rounded-xl border border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {this.props.feature ? `Erro em ${this.props.feature}` : 'Algo deu errado'}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md">
            {this.state.error?.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Voltar ao início
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Error Boundary específico para Downloads
export class DownloadsErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar downloads</h3>
          <p className="text-slate-400 text-sm mb-4">
            Não foi possível carregar a lista de downloads.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-sm"
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Error Boundary específico para Favoritos
export class FavoritesErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar favoritos</h3>
          <p className="text-slate-400 text-sm mb-4">
            Não foi possível carregar seus favoritos.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-sm"
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Error Boundary específico para Modal de Análise
export class AnalysisErrorBoundary extends Component<
  { children: ReactNode; onClose?: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Erro na análise</h3>
          <p className="text-slate-400 mb-6">{this.state.error?.message || 'Erro ao analisar torrent'}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white"
            >
              Tentar novamente
            </button>
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

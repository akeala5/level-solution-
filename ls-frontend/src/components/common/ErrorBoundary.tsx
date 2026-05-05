'use client'
import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    // En production, envoyer à Sentry
    if (process.env.NODE_ENV === 'production') {
      console.error('[ErrorBoundary]', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 bg-surface">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={32} className="text-danger" />
            </div>

            <h1 className="text-xl font-black text-dark mb-2">
              Une erreur inattendue s&apos;est produite
            </h1>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              Nous avons rencontré un problème. Rechargez la page ou revenez à l&apos;accueil.
            </p>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details className="mb-5 text-left bg-gray-900 rounded-xl p-4 text-xs font-mono text-red-400 overflow-auto max-h-40">
                <summary className="cursor-pointer text-gray-400 mb-2">Détails erreur (dev)</summary>
                <p className="font-bold">{this.state.error.toString()}</p>
                <pre className="mt-2 whitespace-pre-wrap opacity-70">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-primary btn-sm gap-2"
              >
                <RefreshCw size={14} />
                Réessayer
              </button>
              <a href="/" className="btn-outline btn-sm gap-2">
                <Home size={14} />
                Accueil
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Wrapper fonctionnel pour usage simple
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

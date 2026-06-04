import { Component } from 'react'
import { AlertCircle } from 'lucide-react'

// Atrapa errores de render de cualquier subárbol y los muestra en pantalla.
// Útil para no quedarnos con "pantalla en blanco" cuando un componente revienta.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] flex items-start justify-center p-6">
          <div className="bg-surface border border-theme rounded-2xl p-6 max-w-2xl w-full shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(239,68,68,0.14)', color: '#DC2626' }}
              >
                <AlertCircle size={20} />
              </div>
              <h2 className="font-display text-lg font-bold text-main">
                Algo se rompió al renderizar
              </h2>
            </div>

            <p className="text-sm text-soft mb-3">
              {this.state.error?.message || String(this.state.error)}
            </p>

            {this.state.info?.componentStack && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted hover:text-soft transition-colors py-1">
                  Stack del componente
                </summary>
                <pre className="mt-2 p-3 bg-surface-alt rounded-xl border border-theme overflow-x-auto whitespace-pre-wrap text-soft font-mono text-[11px] leading-relaxed">
                  {this.state.info.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.reset}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

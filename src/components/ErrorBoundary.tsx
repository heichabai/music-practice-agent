import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(err: unknown): State {
    return { error: err instanceof Error ? err.message : String(err) }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', err, info.componentStack)
  }

  render() {
    if (this.state.error !== null) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-base px-6 text-primary">
          <div className="max-w-md text-center">
            <p className="text-lg font-medium">页面出错了</p>
            <p className="mt-3 break-words text-sm text-wrong">{this.state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-medium text-on-accent hover:bg-accent-strong"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

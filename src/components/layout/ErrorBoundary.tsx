import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-base p-8">
          <div className="max-w-md rounded-xl border border-border-default bg-surface-raised p-8 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h1 className="mb-2 text-lg font-bold text-primary">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-secondary">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

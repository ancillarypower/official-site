import { Component, type ErrorInfo, type ReactNode } from "react";
import { useI18n } from "@/context/I18nContext";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const FALLBACK_STRINGS: Record<string, string> = {
  error_title: "Something went wrong",
  error_generic: "An unexpected error occurred. Please reload the page.",
  error_reload: "Reload Page",
};

function ErrorFallback() {
  let t: (key: string) => string = (k) => FALLBACK_STRINGS[k] ?? k;
  try {
    const i18n = useI18n();
    t = i18n.t;
  } catch {
    // Outside I18nProvider (e.g. tests): use English fallback
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-8">
      <div className="max-w-md rounded-xl border border-border-default bg-surface-raised p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-lg font-bold text-primary">
          {t("error_title")}
        </h1>
        <p className="mb-6 text-sm text-secondary">
          {t("error_generic")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {t("error_reload")}
        </button>
      </div>
    </div>
  );
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
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

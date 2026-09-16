import { Component, type ErrorInfo, type ReactNode } from "react";
import { useI18n } from "@/context/I18nContext";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Route-level error boundary that catches lazy-load chunk failures
 * and other route-specific errors, keeping Navbar/Footer/Sidebar visible.
 *
 * Use `key={location.pathname}` so navigating to a different route
 * unmounts this boundary and clears the error automatically.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <RouteErrorFallback />;
    }
    return this.props.children;
  }
}

/**
 * Fallback UI rendered inside RouteErrorBoundary.
 * Functional component so it can use the useI18n hook.
 */
export function RouteErrorFallback() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3.5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-xl">
        ⚠️
      </div>
      <h2 className="text-base font-semibold">{t("route_load_error")}</h2>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        {t("route_load_retry")}
      </button>
    </div>
  );
}

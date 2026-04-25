import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-8">
          <div className="max-w-md rounded-[var(--radius-lg)] bg-surface p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <AlertTriangle className="h-7 w-7 text-primary" />
            </div>
            <h1 className="mb-2 font-display text-4xl text-text-primary">
              Something went wrong
            </h1>
            <p className="mb-6 text-text-muted">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-accent px-5 font-semibold text-white cursor-pointer transition-all duration-200 hover:bg-accent-dark hover:-translate-y-px focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

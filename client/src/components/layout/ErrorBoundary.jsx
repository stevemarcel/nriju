import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-background">
          <AlertTriangle className="w-12 h-12 text-primary mb-4" />
          <h1 className="font-heading text-2xl font-bold text-text mb-2">Something went wrong</h1>
          <p className="text-text-muted max-w-md mb-6">
            An unexpected error occurred. Try reloading the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-3 bg-primary text-white font-medium rounded-lg inline-flex items-center gap-2 hover:bg-primary/95 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };

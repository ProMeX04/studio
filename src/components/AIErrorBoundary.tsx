/**
 * @fileOverview Error Boundary for AI operations
 */
import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class AIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ AI Error Boundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || undefined,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 border border-red-200 rounded-lg bg-red-50">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Đã xảy ra lỗi với AI
            </h3>
            <p className="text-red-600 mb-4">
              {this.state.error?.message || 'Lỗi không xác định'}
            </p>
            <Button
              onClick={this.handleReset}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Thử lại
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-gray-600">
                Chi tiết lỗi (Development)
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                {this.state.error?.stack}
                {this.state.errorInfo}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

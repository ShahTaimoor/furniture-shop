import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">
                Oops! Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-6xl mb-4">😵</div>
                <p className="text-gray-600 mb-4">
                  We encountered an unexpected error. This has been logged and we'll look into it.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="text-left bg-gray-100 p-3 rounded text-xs mb-4">
                    <summary className="cursor-pointer font-semibold mb-2">
                      Error Details (Development Only)
                    </summary>
                    <pre className="whitespace-pre-wrap text-red-600">
                      {this.state.error.toString()}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="whitespace-pre-wrap text-gray-600 mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReload}
                  className="flex-1"
                  variant="outline"
                >
                  Reload Page
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

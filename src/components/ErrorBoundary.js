import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#2d2c33', color: '#f5f5f5', borderRadius: '10px' }}>
          <h2>Something went wrong.</h2>
          <p>The application encountered an error. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              backgroundColor: '#50c8ba', 
              color: '#1a1a1d', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '5px', 
              cursor: 'pointer' 
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
              <summary>Error Details</summary>
              <p>{this.state.error && this.state.error.toString()}</p>
              <p>{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
import React, { Component } from 'react';

class ErrorSuppressor extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught in boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.message || 'Unknown error'}</p>
          <p>Check the console for more details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorSuppressor;
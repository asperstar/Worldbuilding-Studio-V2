// Create a file called ErrorSuppressor.js in your components directory
import React, { useEffect } from 'react';

const ErrorSuppressor = ({ children }) => {
  useEffect(() => {
    // Store original console.error
    const originalConsoleError = console.error;
    
    // Replace console.error with our filtered version
    console.error = (...args) => {
      // Filter out ResizeObserver errors
      if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop')) {
        return;
      }
      originalConsoleError(...args);
    };
    
    // Disable error overlay in development
    if (typeof window !== 'undefined' && window.__REACT_ERROR_OVERLAY__) {
      window.__REACT_ERROR_OVERLAY__.handleRuntimeError = () => {};
      window.__REACT_ERROR_OVERLAY__.startReportingRuntimeErrors = () => {};
      window.__REACT_ERROR_OVERLAY__.stopReportingRuntimeErrors = () => {};
    }
    
    return () => {
      // Restore original console.error when component unmounts
      console.error = originalConsoleError;
    };
  }, []);

  return <>{children}</>;
};

export default ErrorSuppressor;
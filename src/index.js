// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client'; // Use React 18's createRoot
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext'; // Ensure this path is correct

// Create the root and render the app
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Global error handling for uncaught errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', function (event) {
    console.error('Global error caught:', event.error);
  });
}

// Suppress ResizeObserver loop errors
if (typeof window !== 'undefined') {
  const originalErrorHandler = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    if (
      message.includes('ResizeObserver loop') ||
      (error && error.message && error.message.includes('ResizeObserver loop'))
    ) {
      console.warn('Suppressed ResizeObserver loop error');
      return true; // Prevents the error from showing in console
    }
    return originalErrorHandler
      ? originalErrorHandler(message, source, lineno, colno, error)
      : false;
  };

  // Suppress ResizeObserver loop errors in console.error
  const originalConsoleError = console.error;
  console.error = function (msg, ...args) {
    if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) {
      return;
    }
    return originalConsoleError(msg, ...args);
  };

  // Suppress ResizeObserver loop errors through the error event
  window.addEventListener(
    'error',
    function (e) {
      if (e.message && e.message.includes('ResizeObserver loop')) {
        e.stopPropagation();
        e.preventDefault();
        return true; // Prevents the error from showing up in console
      }
    },
    true
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
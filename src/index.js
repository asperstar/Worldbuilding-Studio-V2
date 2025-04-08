import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import ErrorBoundary from './components/ErrorBoundary';

if (typeof window !== 'undefined') {
  window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Add to index.js
if (typeof window !== 'undefined') {
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message.includes('ResizeObserver loop') || (error && error.message && error.message.includes('ResizeObserver loop'))) {
      console.warn('Suppressed ResizeObserver loop error');
      return true; // Prevents the error from showing in console
    }
    return originalErrorHandler ? originalErrorHandler(message, source, lineno, colno, error) : false;
  };
}

// Add this to your index.js file, before the ReactDOM.render call
if (typeof window !== 'undefined') {
  // Completely suppress ResizeObserver loop errors
  const originalConsoleError = console.error;
  console.error = function(msg, ...args) {
    if (typeof msg === 'string' && msg.includes('ResizeObserver loop')) {
      return;
    }
    return originalConsoleError(msg, ...args);
  };

  // Also suppress ResizeObserver loop error through the error event
  window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('ResizeObserver loop')) {
      e.stopPropagation();
      e.preventDefault();
      return true; // prevents the error from showing up in console
    }
  }, true);
}



// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

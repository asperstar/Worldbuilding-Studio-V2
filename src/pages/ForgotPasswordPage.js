// src/pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { useStorage } from '../contexts/StorageContext';
import { Link } from 'react-router-dom';
import '../Apps.css';

function ForgotPasswordPage() {
  const { sendPasswordReset, error } = useStorage();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    const success = await sendPasswordReset(email);
    setIsLoading(false);
    if (success) {
      setMessage('Password reset email sent! Check your inbox (and spam/junk folder).');
    }
  };

  return (
    <div className="forgot-password-page">
      <h1>Forgot Password</h1>
      <p>Enter your email address to receive a password reset link.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <p>
        <Link to="/login">Back to Login</Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;
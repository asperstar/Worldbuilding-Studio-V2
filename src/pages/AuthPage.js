// src/pages/AuthPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  //AuthError
} from 'firebase/auth';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/worlds');
    } catch (error) {
      // More specific error handling
      switch (error.code) {
        case 'auth/weak-password':
          setError('Password is too weak. Please use a stronger password.');
          break;
        case 'auth/email-already-in-use':
          setError('Email is already in use. Please use a different email.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/user-not-found':
          setError('No user found with this email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        default:
          setError(error.message || 'Authentication failed. Please try again.');
      }
    }
  };
  
  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>{isLogin ? 'Sign In' : 'Create Account'}</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength="6"
              placeholder="Enter your password"
            />
          </div>
          
          <button type="submit" className="submit-button">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-toggle">
          <p>
            {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
            <button 
              type="button"
              className="toggle-button"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
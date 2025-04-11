// src/pages/AuthPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import { testStorage } from '../utils/storageExports';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/worlds');
      }
    });
    
    return () => unsubscribe();
  }, [auth, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      let userCredential;
      
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      
      const testResult = await testStorage();
      console.log('Firestore connection test:', testResult);
      
      if (!testResult.success) {
        console.warn('Firebase connection issue:', testResult);
        setError(`Authentication successful but there was an issue connecting to the database: ${testResult.error}`);
        setLoading(false);
        return;
      }
      
      navigate('/worlds');
    } catch (error) {
      console.error("Auth error:", error);
      let errorMessage = "Authentication failed";
      
      switch(error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already in use by another account.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = error.message || "Authentication failed";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>{isLogin ? 'Sign In' : 'Create Account'}</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} action="/auth" method="POST">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              name="username" // Added name attribute
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="username" // Added for password saving
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              name="password" // Added name attribute
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength="6"
              placeholder="Enter your password"
              disabled={loading}
              autoComplete={isLogin ? "current-password" : "new-password"} // Different for login vs signup
            />
          </div>
          
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div className="auth-toggle">
          <p>
            {isLogin ? 'Don\'t have an account?' : 'Already have an account?'}
            <button 
              type="button"
              className="toggle-button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
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
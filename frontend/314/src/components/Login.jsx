// Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Animated Background */}
      <div className="auth-background">
        <div className="floating-element element-1"></div>
        <div className="floating-element element-2"></div>
        <div className="floating-element element-3"></div>
      </div>

      {/* Navigation */}
      <nav className="auth-nav">
        <Link to="/" className="logo">EventHub</Link>
        <Link to="/signup" className="nav-link">
          Don't have an account? <span>Sign Up</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="login-content">
        <div className="login-container">
          <div className="login-header">
            <h1>Sign in to EventHub</h1>
            <p>Access your events and continue creating amazing experiences</p>
          </div>
        
          {error && (
            <div className="error-message">
              <span className="error-icon">&#9888;&#65039;</span>
              {error}
            </div>
          )}
        
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="submit-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span className="button-arrow">&#8594;</span>
                </>
              )}
            </button>
          </form>

          {/* Social Proof */}
          <div className="social-proof">
            <div className="proof-item">
              <span className="proof-icon">&#127881;</span>
              <span>200+ active users</span>
            </div>
            <div className="proof-divider">•</div>
            <div className="proof-item">
              <span className="proof-icon">&#127903;&#65039;</span>
              <span>50+ events created</span>
            </div>
          </div>
        
          <div className="form-footer">
            <p>New to EventHub? <Link to="/signup">Create an account</Link></p>
          </div>
        </div>

        {/* Side Quote */}
        <div className="auth-quote">
          <blockquote>
            "EventHub is a project by Mon, Viktoriia, Luke, Harpreet, and Tan for our 314 Assignment"
          </blockquote>
          <cite>
            <strong>- Luke Dunn, University of Wollongong</strong>
          </cite>
        </div>
      </div>
    </div>
  );
}

export default Login;
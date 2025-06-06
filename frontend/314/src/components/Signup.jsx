import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Signup.css';

function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // if register is successful take them to the login page other wise throw error to console
    // TODO: add error handling to ui
    try {
      await register(formData);
      navigate('/login');
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="auth-background">
        <div className="floating-element element-1"></div>
        <div className="floating-element element-2"></div>
        <div className="floating-element element-3"></div>
      </div>

      <nav className="auth-nav">
        <Link to="/" className="logo">EventHub</Link>
        <Link to="/login" className="nav-link">
          Already have an account? <span>Sign In</span>
        </Link>
      </nav>

      <div className="signup-content">
        <div className="signup-container">
          <div className="signup-header">
            <h1>Create your EventHub account</h1>
            <p>Join 200+ users creating amazing events</p>
          </div>
        
          {error && (
            <div className="error-message">
              <span className="error-icon">&#9888;&#65039;</span>
              {error}
            </div>
          )}
        
          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Rick"
                  required
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Roll"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="rickroll@gmail.com"
                required
                autoComplete="email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">
                Password
                <span className="password-hint">Minimum 6 characters</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength="6"
                autoComplete="new-password"
              />
            </div>
            
            <div className="terms-checkbox">
              <input 
                type="checkbox" 
                id="terms" 
                required
              />
              <label htmlFor="terms">
                I agree to the <a href="https://www.youtube.com/watch?v=xvFZjo5PgG0" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://www.youtube.com/watch?v=xvFZjo5PgG0" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </label>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="submit-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <span className="button-arrow">&#8594;</span>
                </>
              )}
            </button>
          </form>
          
          <div className="form-footer">
            <p>Already have an account? <Link to="/login">Sign in instead</Link></p>
          </div>
        </div>

        <div className="auth-features">
          <h2>Why EventHub?</h2>
          <ul className="features-list">
            <li>
              <span className="feature-emoji">&#127881;</span>
              <div>
                <strong>Easy Event Creation</strong>
                <p>Set up your event in minutes with our intuitive interface</p>
              </div>
            </li>
            <li>
              <span className="feature-emoji">&#127903;&#65039;</span>
              <div>
                <strong>Smart Ticketing</strong>
                <p>Manage registrations and tickets effortlessly</p>
              </div>
            </li>
            <li>
              <span className="feature-emoji">&#128202;</span>
              <div>
                <strong>Real-time Analytics</strong>
                <p>Track your event performance with detailed insights</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Signup;
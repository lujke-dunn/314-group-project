// AuthContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';
import axios from './api';


// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          // Set default auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Validate token by making a request to fetch user profile
          const response = await axios.get('/profile');
          setUser(response.data);
        } catch (error) {
          // Token is invalid or expired
          console.error('Auth token validation failed:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await axios.post('/login', { email, password });
      const { token, user } = response.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set default auth header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Update state
      setUser(user);
      
      return user;
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await axios.post('/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Registration failed';
    }
  };

  // Logout function
  const logout = () => {
    // Remove from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Remove auth header
    delete axios.defaults.headers.common['Authorization'];
    
    // Update state
    setUser(null);
  };

  const updateProfile = async (userData) => {
    try {
      const response = await axios.put('/profile', userData);
      setUser(prev => ({ ...prev, ...response.data }));
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update profile';
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get('/profile');
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to refresh user data';
    }
  };
  

  // Build context value
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
import { createContext, useState, useContext, useEffect } from 'react';
import axios from './api';


const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // check if user is still logged in on page load
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          const response = await axios.get('/profile');
          setUser(response.data);
        } catch (error) {
          console.error('Auth token validation failed:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      
      return user;
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Registration failed';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    delete axios.defaults.headers.common['Authorization'];
    
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
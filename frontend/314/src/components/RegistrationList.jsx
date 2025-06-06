import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './RegistrationList.css';

function RegistrationList() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchRegistrations = async () => {
      try {
        const response = await api.get('/registrations');
        setRegistrations(response.data);
        setFilteredRegistrations(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch registrations:', err);
        setError('Failed to load your registrations. Please try again later.');
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredRegistrations(registrations);
    } else {
      setFilteredRegistrations(registrations.filter(reg => reg.status === statusFilter));
    }
  }, [statusFilter, registrations]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const totalRegistrations = registrations.length;
  const confirmedCount = registrations.filter(reg => reg.status === 'confirmed').length;
  const pendingCount = registrations.filter(reg => reg.status === 'pending').length;
  const upcomingCount = registrations.filter(reg => 
    new Date(reg.event_start_date) > new Date() && reg.status !== 'canceled'
  ).length;

  if (loading) {
    return (
      <div className="registrations-wrapper">
        <div className="registrations-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your registrations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="registrations-wrapper">
        <div className="registrations-container">
          <div className="error-state">
            <span className="error-icon">&#9888;&#65039;</span>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registrations-wrapper">
      <div className="registrations-container">
        <div className="registrations-header">
          <h1 className="registrations-title">My Registrations</h1>
          <p className="registrations-subtitle">
            Manage all your event registrations and tickets in one place
          </p>
          
          {totalRegistrations > 0 && (
            <div className="registrations-stats">
              <div className="stat-item">
                <span className="stat-number">{totalRegistrations}</span>
                <span className="stat-label">Total Events</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{confirmedCount}</span>
                <span className="stat-label">Confirmed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{upcomingCount}</span>
                <span className="stat-label">Upcoming</span>
              </div>
            </div>
          )}
        </div>

        {registrations.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">&#127915;</span>
            <h2 className="empty-title">No Registrations Yet</h2>
            <p className="empty-message">
              You haven't registered for any events yet. Discover amazing events happening in your area and start your journey!
            </p>
            <button onClick={() => navigate('/')} className="browse-button">
              <span>&#128269;</span>
              Browse Events
            </button>
          </div>
        ) : (
          <>
            <div className="filter-section">
              <div className="filter-group">
                <label className="filter-label">Filter by status:</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Registrations</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending Payment</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div className="filter-group">
                <span className="filter-label">
                  Showing {filteredRegistrations.length} of {totalRegistrations} registrations
                </span>
              </div>
            </div>

            <div className="registrations-grid">
              {filteredRegistrations.map(reg => (
                <div key={reg.id} className="registration-card">
                  <div className="registration-header">
                    <h3 className="event-title">{reg.event_title}</h3>
                    <div className="registration-status">
                      <span className={`status-badge ${reg.status}`}>
                        {reg.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="registration-details">
                    <div className="detail-row">
                      <span className="detail-icon">&#128197;</span>
                      <span className="detail-text">Date:</span>
                      <span className="detail-value">{formatDate(reg.event_start_date)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">&#127903;&#65039;</span>
                      <span className="detail-text">Ticket:</span>
                      <span className="detail-value">{reg.ticket_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">&#128176;</span>
                      <span className="detail-text">Price:</span>
                      <span className="detail-value price-value">${reg.total_price.toFixed(2)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">&#128221;</span>
                      <span className="detail-text">Registered:</span>
                      <span className="detail-value">{formatDate(reg.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="registration-actions">
                    <button 
                      onClick={() => navigate(`/registrations/${reg.id}`)}
                      className="registration-button primary"
                    >
                      <span>&#128203;</span>
                      View Details
                    </button>
                    <button 
                      onClick={() => navigate(`/events/${reg.event_id}`)}
                      className="registration-button secondary"
                    >
                      <span>&#127914;</span>
                      View Event
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredRegistrations.length === 0 && statusFilter !== 'all' && (
              <div className="empty-state">
                <span className="empty-icon">&#128269;</span>
                <h2 className="empty-title">No {statusFilter} registrations</h2>
                <p className="empty-message">
                  You don't have any {statusFilter} registrations at the moment.
                </p>
                <button onClick={() => setStatusFilter('all')} className="browse-button">
                  <span>&#8617;&#65039;</span>
                  Show All Registrations
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default RegistrationList;
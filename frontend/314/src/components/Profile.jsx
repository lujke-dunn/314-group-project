import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './Profile.css';

function Profile() {
  const { user, isAuthenticated, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [registrations, setRegistrations] = useState([]);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState({
    registrations: true,
    organized: true,
    feedback: true
  });
  const [error, setError] = useState({});
  
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });
  
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [notifPreferences, setNotifPreferences] = useState({
    email_updates: true,
    event_reminders: true,
    marketing: false
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || ''
      });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      try {
        const regResponse = await api.get('/registrations');
        setRegistrations(regResponse.data || []);
        setLoading(prev => ({ ...prev, registrations: false }));
      } catch (err) {
        console.error('Failed to fetch registrations:', err);
        setRegistrations([]);
        setError(prev => ({ 
          ...prev, 
          registrations: 'Failed to load your event registrations' 
        }));
        setLoading(prev => ({ ...prev, registrations: false }));
      }
      
      if (user?.is_organizer) {
        try {
          const eventsResponse = await api.get('/my-events');
          setOrganizedEvents(eventsResponse.data.events || []);
          setLoading(prev => ({ ...prev, organized: false }));
        } catch (err) {
          console.error('Failed to fetch organized events:', err);
          setOrganizedEvents([]);
          setError(prev => ({ 
            ...prev, 
            organized: 'Failed to load your organized events' 
          }));
          setLoading(prev => ({ ...prev, organized: false }));
        }
      } else {
        setLoading(prev => ({ ...prev, organized: false }));
      }
      
      try {
        const feedbackResponse = await api.get('/feedback');
        setFeedbacks(feedbackResponse.data || []);
        setLoading(prev => ({ ...prev, feedback: false }));
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
        setFeedbacks([]);
        setError(prev => ({ 
          ...prev, 
          feedback: 'Failed to load your feedback history' 
        }));
        setLoading(prev => ({ ...prev, feedback: false }));
      }
    };

    fetchData();
  }, [isAuthenticated, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleNotifChange = (e) => {
    const { name, checked } = e.target;
    setNotifPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await updateProfile(formData);
      setEditing(false);
    } catch (err) {
      setError(prev => ({ 
        ...prev, 
        profile: err.response?.data?.error || 'Failed to update profile' 
      }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError(prev => ({ ...prev, password: 'New passwords do not match' }));
      return;
    }
    
    try {
      await api.post('/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setChangingPassword(false);
    } catch (err) {
      setError(prev => ({ 
        ...prev, 
        password: err.response?.data?.error || 'Failed to change password' 
      }));
    }
  };
  
  const handleNotifSubmit = async (e) => {
    e.preventDefault();
    alert('Notification preferences saved.');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstInitial = user.first_name?.[0] || '';
    const lastInitial = user.last_name?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
  };

  const safeRegistrations = registrations || [];
  const safeOrganizedEvents = organizedEvents || [];
  const safeFeedbacks = feedbacks || [];
  
  const totalEvents = safeRegistrations.length;
  const upcomingEvents = safeRegistrations.filter(reg => 
    new Date(reg.event_start_date) > new Date() && reg.status !== 'canceled'
  ).length;
  const organizedCount = safeOrganizedEvents.length;
  const avgRating = safeFeedbacks.length > 0 
    ? (safeFeedbacks.reduce((sum, f) => sum + f.rating, 0) / safeFeedbacks.length).toFixed(1)
    : 0;

  if (!isAuthenticated) {
    return (
      <div className="profile-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      <section className="profile-hero">
        <div className="hero-background">
          <div className="floating-element element-1"></div>
          <div className="floating-element element-2"></div>
        </div>
        
        <div className="hero-content">
          <div className="user-avatar">
            <div className="avatar-circle">
              {getUserInitials()}
            </div>
            <div className="avatar-status"></div>
          </div>
          
          <div className="user-info">
            <h1 className="user-name">
              {user?.first_name || 'First'} {user?.last_name || 'User'}
            </h1>
            <p className="user-email">{user?.email || 'user@example.com'}</p>
            <div className="user-badges">
              {user?.is_admin && <span className="badge admin">Admin</span>}
              {user?.is_organizer && <span className="badge organizer">Event Organizer</span>}
            </div>
          </div>
          
          <div className="hero-actions">
            <button onClick={logout} className="logout-btn">
              <span>&#128682;</span>
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <section className="stats-dashboard">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">&#127915;</div>
            <div className="stat-content">
              <div className="stat-number">{totalEvents}</div>
              <div className="stat-label">Events Attended</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">&#128198;</div>
            <div className="stat-content">
              <div className="stat-number">{upcomingEvents}</div>
              <div className="stat-label">Upcoming Events</div>
            </div>
          </div>
          
          {user?.is_organizer && (
            <div className="stat-card">
              <div className="stat-icon">&#127914;</div>
              <div className="stat-content">
                <div className="stat-number">{organizedCount}</div>
                <div className="stat-label">Events Created</div>
              </div>
            </div>
          )}
          
          <div className="stat-card">
            <div className="stat-icon">&#11088;</div>
            <div className="stat-content">
              <div className="stat-number">{avgRating || '--'}</div>
              <div className="stat-label">Avg. Rating Given</div>
            </div>
          </div>
        </div>
      </section>

      <nav className="profile-nav">
        <div className="nav-container">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <span className="tab-icon">&#128202;</span>
            Overview
          </button>
          
          <button 
            onClick={() => setActiveTab('events')}
            className={`nav-tab ${activeTab === 'events' ? 'active' : ''}`}
          >
            <span className="tab-icon">&#127903;&#65039;</span>
            My Events
          </button>
          
          {user?.is_organizer && (
            <button 
              onClick={() => setActiveTab('organized')}
              className={`nav-tab ${activeTab === 'organized' ? 'active' : ''}`}
            >
              <span className="tab-icon">&#127914;</span>
              Organized Events
            </button>
          )}
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <span className="tab-icon">&#9881;&#65039;</span>
            Settings
          </button>
        </div>
      </nav>

      <main className="profile-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="content-grid">
              <div className="activity-card">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {safeRegistrations.slice(0, 3).map((reg) => (
                    <div key={reg.id} className="activity-item">
                      <div className="activity-icon">&#127915;</div>
                      <div className="activity-content">
                        <p>Registered for <strong>{reg.event_title}</strong></p>
                        <span className="activity-date">{formatDate(reg.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {safeRegistrations.length === 0 && (
                    <div className="empty-state">
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="quick-actions-card">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                  <button onClick={() => navigate('/')} className="action-btn">
                    <span>&#128269;</span>
                    Browse Events
                  </button>
                  {user?.is_organizer && (
                    <button onClick={() => navigate('/events/create')} className="action-btn">
                      <span>&#10133;</span>
                      Create Event
                    </button>
                  )}
                  <button onClick={() => setActiveTab('settings')} className="action-btn">
                    <span>&#9881;&#65039;</span>
                    Settings
                  </button>
                  <button onClick={() => setChangingPassword(true)} className="action-btn">
                    <span>&#128272;</span>
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-section">
            <div className="section-header">
              <h2>My Events</h2>
              <button onClick={() => navigate('/')} className="browse-btn">
                Browse More Events
              </button>
            </div>
            
            {loading.registrations ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading your events...</p>
              </div>
            ) : error.registrations ? (
              <div className="error-state">
                <span className="error-icon">&#9888;&#65039;</span>
                {error.registrations}
              </div>
            ) : safeRegistrations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#127915;</div>
                <h3>No events yet</h3>
                <p>You haven't registered for any events. Start exploring!</p>
                <button onClick={() => navigate('/')} className="cta-btn">
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="events-grid">
                {safeRegistrations.map((reg) => (
                  <div key={reg.id} className="event-card">
                    <div className="event-status">
                      <span className={`status-badge ${reg.status}`}>
                        {reg.status}
                      </span>
                    </div>
                    
                    <div className="event-header">
                      <h4>{reg.event_title}</h4>
                      <p className="event-date">{formatDate(reg.event_start_date)}</p>
                    </div>
                    
                    <div className="event-details">
                      <div className="detail-item">
                        <span className="detail-icon">&#127903;&#65039;</span>
                        <span>{reg.ticket_name}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">&#128176;</span>
                        <span>${reg.total_price?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                    
                    <div className="event-actions">
                      <button 
                        onClick={() => navigate(`/events/${reg.event_id}`)}
                        className="action-btn primary"
                      >
                        View Event
                      </button>
                      {reg.status !== 'canceled' && (
                        <button 
                          onClick={() => navigate(`/registrations/${reg.id}`)}
                          className="action-btn secondary"
                        >
                          View Ticket
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'organized' && user?.is_organizer && (
          <div className="organized-section">
            <div className="section-header">
              <h2>Events You've Organized</h2>
              <button onClick={() => navigate('/events/create')} className="create-btn">
                <span>&#10133;</span>
                Create New Event
              </button>
            </div>
            
            {loading.organized ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading your organized events...</p>
              </div>
            ) : error.organized ? (
              <div className="error-state">
                <span className="error-icon">&#9888;&#65039;</span>
                {error.organized}
              </div>
            ) : safeOrganizedEvents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#127914;</div>
                <h3>No events created yet</h3>
                <p>Start organizing amazing events for your community!</p>
                <button onClick={() => navigate('/events/create')} className="cta-btn">
                  Create Your First Event
                </button>
              </div>
            ) : (
              <div className="events-grid">
                {safeOrganizedEvents.map((event) => (
                  <div key={event.id} className="event-card organized">
                    <div className="event-status">
                      <span className={`status-badge ${event.is_published ? (event.is_canceled ? 'canceled' : 'published') : 'draft'}`}>
                        {event.is_published ? (event.is_canceled ? 'Canceled' : 'Published') : 'Draft'}
                      </span>
                    </div>
                    
                    <div className="event-header">
                      <h4>{event.title}</h4>
                      <p className="event-date">{formatDate(event.start_datetime)}</p>
                    </div>
                    
                    <div className="event-details">
                      <div className="detail-item">
                        <span className="detail-icon">📍</span>
                        <span>{event.venue}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-icon">👥</span>
                        <span>0 registered</span>
                      </div>
                    </div>
                    
                    <div className="event-actions">
                      <button 
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="action-btn primary"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => navigate(`/events/${event.id}/edit`)}
                        className="action-btn secondary"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="settings-grid">
              <div className="settings-card">
                <h3>Personal Information</h3>
                {error.profile && (
                  <div className="error-message">
                    <span className="error-icon">&#9888;&#65039;</span>
                    {error.profile}
                  </div>
                )}
                
                {!editing ? (
                  <div className="info-display">
                    <div className="info-item">
                      <label>Email</label>
                      <span>{user?.email}</span>
                    </div>
                    <div className="info-item">
                      <label>Name</label>
                      <span>{user?.first_name} {user?.last_name}</span>
                    </div>
                    <div className="info-item">
                      <label>Phone</label>
                      <span>{user?.phone || 'Not provided'}</span>
                    </div>
                    
                    <button onClick={() => setEditing(true)} className="edit-btn">
                      Edit Information
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="edit-form">
                    <div className="form-group">
                      <label htmlFor="first_name">First Name</label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
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
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="save-btn">
                        Save Changes
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditing(false)}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <div className="settings-card">
                <h3>Security</h3>
                
                {!changingPassword ? (
                  <div className="security-info">
                    <p>Keep your account secure with a strong password.</p>
                    <button 
                      onClick={() => setChangingPassword(true)}
                      className="change-password-btn"
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <div>
                    {error.password && (
                      <div className="error-message">
                        <span className="error-icon">&#9888;&#65039;</span>
                        {error.password}
                      </div>
                    )}
                    
                    <form onSubmit={handlePasswordSubmit} className="password-form">
                      <div className="form-group">
                        <label htmlFor="current_password">Current Password</label>
                        <input
                          type="password"
                          id="current_password"
                          name="current_password"
                          value={passwordData.current_password}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="new_password">New Password</label>
                        <input
                          type="password"
                          id="new_password"
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          required
                          minLength="6"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="confirm_password">Confirm New Password</label>
                        <input
                          type="password"
                          id="confirm_password"
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          required
                          minLength="6"
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button type="submit" className="save-btn">
                          Update Password
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setChangingPassword(false)}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div className="settings-card">
                <h3>Notifications</h3>
                
                <form onSubmit={handleNotifSubmit} className="notifications-form">
                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="email_updates">Email Updates</label>
                      <p>Receive updates about your event registrations</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        id="email_updates"
                        name="email_updates"
                        checked={notifPreferences.email_updates}
                        onChange={handleNotifChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="event_reminders">Event Reminders</label>
                      <p>Get reminded about upcoming events you're attending</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        id="event_reminders"
                        name="event_reminders"
                        checked={notifPreferences.event_reminders}
                        onChange={handleNotifChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="preference-item">
                    <div className="preference-info">
                      <label htmlFor="marketing">Marketing Communications</label>
                      <p>Receive information about new events and features</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        id="marketing"
                        name="marketing"
                        checked={notifPreferences.marketing}
                        onChange={handleNotifChange}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <button type="submit" className="save-preferences-btn">
                    Save Preferences
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Profile;
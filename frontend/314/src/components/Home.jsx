import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './Home.css';

function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // call to the backend to get events in order of thier entries within the db
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/events', {
          params: {
            page: 1,
            per_page: 6
          }
        });
        setEvents(response.data.events);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events. Please try again later.');
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="home-wrapper">
      <nav className="home-nav">
        <h1 className="logo">EventHub</h1>
      
        {isAuthenticated ? (
          <div className="nav-actions">
            <span className="welcome-text">Welcome, {user.first_name}!</span>
            <button onClick={handleProfileClick} className="nav-button profile-button">My Profile</button>
            <button onClick={logout} className="nav-button logout-button">Logout</button>
          </div>
        ) : (
          <div className="nav-actions">
            <button onClick={() => navigate('/login')} className="nav-button login-button">Login</button>
            <button onClick={() => navigate('/signup')} className="nav-button signup-button">Get Started</button>
          </div>
        )}
      </nav>

      <section className="hero-section">
        <div className="hero-background">
          <div className="floating-element element-1"></div>
          <div className="floating-element element-2"></div>
          <div className="floating-element element-3"></div>
        </div>
        <div className="hero-content">
          <div className="hero-badge">🎉 Join 200+ Active Users</div>
          <h2 className="hero-title">
            Your Events,
            <span className="text-gradient"> Elevated</span>
          </h2>
          <p className="hero-subtitle">
            Transform ordinary gatherings into extraordinary experiences. 
            Create, manage, and sell tickets for events that people will remember.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/events')} className="primary-cta">
              <span>Find Events</span>
              <span className="cta-arrow">→</span>
            </button>
            {isAuthenticated ? (
              <button onClick={() => navigate('/events/create')} className="secondary-cta">
                <span>Create Event</span>
              </button>
            ) : (
              <button onClick={() => navigate('/signup')} className="secondary-cta">
                <span>Create Event</span>
              </button>
            )}
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">50+</span>
              <span className="stat-label">Events Created</span>
            </div>
            <div className="stat">
              <span className="stat-number">200+</span>
              <span className="stat-label">Active Users</span>
            </div>
            <div className="stat">
              <span className="stat-number">95%</span>
              <span className="stat-label">Satisfaction Rate</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <div className="features-header">
            <h2 className="features-title">Everything You Need to Succeed</h2>
            <p className="features-subtitle">Powerful features that make event management effortless</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast Setup</h3>
              <p>Create your event page in under 5 minutes with our intuitive builder</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>Secure Payments</h3>
              <p>Accept payments instantly with bank-level security and fraud protection</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Analytics</h3>
              <p>Track ticket sales, attendee data, and revenue with live dashboards</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Smart Marketing</h3>
              <p>Reach your audience with built-in email campaigns and social tools</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile First</h3>
              <p>Manage events on-the-go with our powerful mobile experience</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Team Collaboration</h3>
              <p>Work together seamlessly with role-based permissions</p>
            </div>
          </div>
        </div>
      </section>


      <section className="events-section">
        <div className="section-header">
          <h2 className="section-title">Trending Events Near You</h2>
          <p className="section-subtitle">Discover what's happening in your community</p>
        </div>
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading amazing events...</p>
          </div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <p>No events yet. Be the first to create one!</p>
            {isAuthenticated && (
              <button onClick={() => navigate('/events/create')} className="create-event-inline">
                Create Event
              </button>
            )}
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <div key={event.id} className="event-card">
                <div className="event-card-badge">Trending</div>
                <div className="event-card-header">
                  <h3 className="event-title">{event.title}</h3>
                </div>
                <div className="event-card-body">
                  <div className="event-detail">
                    <span className="event-icon">📅</span>
                    <span>{formatDate(event.start_datetime)}</span>
                  </div>
                  <div className="event-detail">
                    <span className="event-icon">📍</span>
                    <span>{event.venue}, {event.city}</span>
                  </div>
                  <div className="event-detail">
                    <span className="event-icon">🏟️</span>
                    <span>Limited Spots Available</span>
                  </div>
                </div>
                <button onClick={() => navigate(`/events/${event.id}`)} className="event-card-button">
                  <span>Get Tickets</span>
                  <span className="button-arrow">→</span>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="events-footer">
          <button onClick={() => navigate('/events')} className="view-all-button">
            View All Events <span>→</span>
          </button>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Create Unforgettable Events?</h2>
          <p className="cta-subtitle">Start organizing better events for your university community</p>
          <div className="cta-actions">
            <button onClick={() => navigate('/events')} className="cta-button primary">
              Browse Events
            </button>
            {isAuthenticated ? (
              <button onClick={() => navigate('/events/create')} className="cta-button secondary">
                Create Event
              </button>
            ) : (
              <button onClick={() => navigate('/signup')} className="cta-button secondary">
                Get Started
              </button>
            )}
          </div>
          <p className="cta-note">No credit card required • Setup in minutes • Cancel anytime</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
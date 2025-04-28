// src/components/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch upcoming events when component mounts
    const fetchEvents = async () => {
      try {
        const response = await api.get('/events', {
          params: {
            page: 1,
            per_page: 6 // Limit to 6 events for the homepage
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

  // Format date function
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <h1>Event Management System</h1>
      
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user.first_name}!</p>
          <div>
            <button onClick={handleProfileClick}>View My Profile</button>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      ) : (
        <div>
          <p>Please log in or sign up to continue</p>
          <div>
            <button onClick={() => navigate('/login')}>Login</button>
            <button onClick={() => navigate('/signup')}>Sign Up</button>
          </div>
        </div>
      )}

    {isAuthenticated && (
      <div>
        <h2>Create Your Own Event</h2>
        <p>Share your passion and bring people together by hosting your own event!</p>
        <button onClick={() => navigate('/events/create')}>Create New Event</button>
      </div>
    )}

      <div>
        <h2>Upcoming Events</h2>
        {loading ? (
          <p>Loading events...</p>
        ) : error ? (
          <p>{error}</p>
        ) : events.length === 0 ? (
          <p>No upcoming events found.</p>
        ) : (
          <div>
            {events.map(event => (
              <div key={event.id}>
                <h3>{event.title}</h3>
                <p>Date: {formatDate(event.start_datetime)}</p>
                <p>Location: {event.venue}, {event.city}</p>
                <button onClick={() => navigate(`/events/${event.id}`)}>
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
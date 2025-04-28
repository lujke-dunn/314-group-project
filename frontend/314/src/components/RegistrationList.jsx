// src/components/RegistrationList.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

function RegistrationList() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchRegistrations = async () => {
      try {
        const response = await api.get('/registrations');
        setRegistrations(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch registrations:', err);
        setError('Failed to load your registrations. Please try again later.');
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, [isAuthenticated, navigate]);

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) return <div>Loading your registrations...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>My Registrations</h1>
      
      {registrations.length === 0 ? (
        <div>
          <p>You haven't registered for any events yet.</p>
          <button onClick={() => navigate('/')}>Browse Events</button>
        </div>
      ) : (
        <div>
          {registrations.map(reg => (
            <div key={reg.id}>
              <h3>{reg.event_title}</h3>
              <p><strong>Date:</strong> {formatDate(reg.event_start_date)}</p>
              <p><strong>Ticket:</strong> {reg.ticket_name}</p>
              <p><strong>Status:</strong> {reg.status}</p>
              <p><strong>Price:</strong> ${reg.total_price.toFixed(2)}</p>
              
              <button onClick={() => navigate(`/registrations/${reg.id}`)}>
                View Details
              </button>
              
              <button onClick={() => navigate(`/events/${reg.event_id}`)}>
                View Event
              </button>
              
              <hr />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RegistrationList;
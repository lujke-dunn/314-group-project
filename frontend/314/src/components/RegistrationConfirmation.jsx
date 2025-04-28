// src/components/RegistrationConfirmation.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

function RegistrationConfirmation() {
  const { id } = useParams(); // Registration ID
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [registration, setRegistration] = useState(null);
  const [event, setEvent] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchRegistrationDetails = async () => {
      try {
        const response = await api.get(`/registrations/${id}`);
        setRegistration(response.data.registration);
        setEvent(response.data.event);
        setTicket(response.data.ticket_type);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch registration:', err);
        setError('Failed to load registration details. Please try again later.');
        setLoading(false);
      }
    };

    fetchRegistrationDetails();
  }, [id, isAuthenticated, navigate]);

  const handlePayment = async () => {
    try {
      await api.post(`/registrations/${id}/payments`, {
        method: 'credit_card',
        transaction_id: `TRANS-${Date.now()}`
      });
      
      // Reload the registration data to show updated status
      const response = await api.get(`/registrations/${id}`);
      setRegistration(response.data.registration);
    } catch (err) {
      console.error('Payment failed:', err);
      setError('Payment processing failed. Please try again later.');
    }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/registrations/${id}/cancel`);
      
      // Reload the registration data to show updated status
      const response = await api.get(`/registrations/${id}`);
      setRegistration(response.data.registration);
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError('Failed to cancel registration. Please try again later.');
    }
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div>Loading registration details...</div>;
  if (error) return <div>{error}</div>;
  if (!registration) return <div>Registration not found.</div>;

  return (
    <div>
      <h1>Registration Confirmation</h1>
      
      <div>
        <h2>Registration Status: {registration.status}</h2>
        
        {registration.status === 'pending' && (
          <div>
            <p>Your registration is pending payment. Please complete your payment to confirm your spot.</p>
            <button onClick={handlePayment}>Complete Payment</button>
          </div>
        )}
        
        {registration.status === 'confirmed' && (
          <div>
            <p>Your registration is confirmed! We're looking forward to seeing you at the event.</p>
          </div>
        )}
        
        {registration.status === 'canceled' && (
          <div>
            <p>This registration has been canceled.</p>
          </div>
        )}
      </div>
      
      <div>
        <h2>Event Details</h2>
        <p><strong>Event:</strong> {event.title}</p>
        <p><strong>Date:</strong> {formatDate(event.start_datetime)}</p>
        <p><strong>Location:</strong> {event.venue}</p>
        <p><strong>Ticket Type:</strong> {ticket.name}</p>
        <p><strong>Price:</strong> ${registration.total_price.toFixed(2)}</p>
        <p><strong>Registration Date:</strong> {formatDate(registration.created_at)}</p>
      </div>
      
      {registration.status !== 'canceled' && (
        <div>
          <h2>Need to Cancel?</h2>
          <p>If you can't attend the event, you can cancel your registration.</p>
          <button onClick={handleCancel}>Cancel Registration</button>
        </div>
      )}
      
      <div>
        <button onClick={() => navigate('/profile')}>View All My Registrations</button>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    </div>
  );
}

export default RegistrationConfirmation;
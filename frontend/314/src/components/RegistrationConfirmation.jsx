import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './RegistrationConfirmation.css';

function RegistrationConfirmation() {
  const { id } = useParams();
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

    // payment flow in order to confirm registation, send email if went through
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
      
      const response = await api.get(`/registrations/${id}`);
      setRegistration(response.data.registration);
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError('Failed to cancel registration. Please try again later.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusDetails = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: '⏳',
          title: 'Payment Pending',
          message: 'Your registration is pending payment. Please complete your payment to confirm your spot at this amazing event.',
          className: 'pending'
        };
      case 'confirmed':
        return {
          icon: '✅',
          title: 'Registration Confirmed',
          message: 'Your registration is confirmed! We\'re looking forward to seeing you at the event. Your ticket is ready below.',
          className: 'confirmed'
        };
      case 'canceled':
        return {
          icon: '❌',
          title: 'Registration Canceled',
          message: 'This registration has been canceled. If this was a mistake, please contact support or register again.',
          className: 'canceled'
        };
      default:
        return {
          icon: '❓',
          title: 'Unknown Status',
          message: 'Registration status unclear.',
          className: 'pending'
        };
    }
  };

  if (loading) {
    return (
      <div className="registration-wrapper">
        <div className="registration-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading registration details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="registration-wrapper">
        <div className="registration-container">
          <div className="error-state">
            <span className="error-icon">&#9888;&#65039;</span>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="registration-wrapper">
        <div className="registration-container">
          <div className="error-state">
            <span className="error-icon">&#10060;</span>
            Registration not found.
          </div>
        </div>
      </div>
    );
  }

  const statusDetails = getStatusDetails(registration.status);

  return (
    <div className="registration-wrapper">
      <div className="registration-container">
        <div className="registration-header">
          <h1 className="registration-title">Registration Details</h1>
          <p className="registration-subtitle">
            Your complete registration information and ticket details
          </p>
        </div>

        <section className={`status-section ${registration.status === 'confirmed' ? 'success-animation' : ''}`}>
          <span className={`status-icon ${statusDetails.className}`}>
            {statusDetails.icon}
          </span>
          <div className="status-title">
            {statusDetails.title}
          </div>
          <p className="status-message">{statusDetails.message}</p>
          
          {registration.status === 'pending' && (
            <button onClick={handlePayment} className="payment-button">
              <span>&#128179;</span>
              Complete Payment
            </button>
          )}
        </section>

        {registration.status === 'confirmed' && (
          <>
            <div className="ticket-display">
              <div className="ticket-content">
                <div className="ticket-info">
                  <h3>&#127903;&#65039; Your Ticket</h3>
                  <p>Present this at the event entrance</p>
                </div>
                <div className="ticket-qr">
                  <img src="/image.png" alt="Ticket QR Code" className="qr-code-img" />
                </div>
              </div>
            </div>
          </>
        )}

        <section className="event-details-section">
          <h2 className="section-title">
            <span className="section-icon">&#127914;</span>
            Event Details
          </h2>
          <div className="details-grid">
            <div className="detail-card">
              <div className="detail-label">Event</div>
              <div className="detail-value">{event.title}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Date & Time</div>
              <div className="detail-value">{formatDate(event.start_datetime)}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Location</div>
              <div className="detail-value">{event.venue}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Ticket Type</div>
              <div className="detail-value">{ticket.name}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Total Price</div>
              <div className="detail-value price">${registration.total_price.toFixed(2)}</div>
            </div>
            <div className="detail-card">
              <div className="detail-label">Registration Date</div>
              <div className="detail-value">{formatDate(registration.created_at)}</div>
            </div>
          </div>
        </section>

        {registration.status !== 'canceled' && (
          <section className="cancel-section">
            <h2 className="section-title">
              <span className="section-icon">&#128683;</span>
              Need to Cancel?
            </h2>
            <p className="cancel-message">
              If you can't attend the event, you can cancel your registration. 
              Please note that cancellation policies may apply.
            </p>
            <button onClick={handleCancel} className="cancel-button">
              <span>&#10060;</span>
              Cancel Registration
            </button>
          </section>
        )}

        <div className="actions-section">
          <button 
            onClick={() => navigate('/profile')} 
            className="action-button primary"
          >
            <span>&#128100;</span>
            View All My Registrations
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="action-button secondary"
          >
            <span>&#127968;</span>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegistrationConfirmation;
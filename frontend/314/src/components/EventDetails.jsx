import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './EventDetails.css';

function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  const [feedbacks, setFeedbacks] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const fetchEventDetails = async () => {
    try {
      const eventResponse = await api.get(`/events/${id}`);
      setEvent(eventResponse.data);
      
      const ticketsResponse = await api.get(`/events/${id}/ticket-types`);
      setTicketTypes(ticketsResponse.data);
      
      try {
        const feedbackResponse = await api.get(`/events/${id}/feedback`);
        setFeedbacks(feedbackResponse.data.feedbacks || []);
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch event details:', err);
      setError('Failed to load event details. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    if (event && event.user_id === user?.id) {
      fetchRegistrations();
    }
  }, [event, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchEventDetails();
        if (event && event.user_id === user?.id) {
          fetchRegistrations();
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [id, loading, event, user]);

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSelectTicket = (ticketId) => {
    setSelectedTicket(ticketId);
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!selectedTicket) {
      setError('Please select a ticket type');
      return;
    }
    
    try {
      const response = await api.post('/registrations', {
        event_id: parseInt(id),
        ticket_type_id: selectedTicket
      });
      
      await fetchEventDetails();
      navigate(`/registrations/${response.data.registration.id}`);
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };
  
  const handlePublishEvent = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    setPublishing(true);
    try {
      const response = await api.put(`/events/${id}/publish`);
      console.log('Publish response:', response.data);
      setEvent(prev => ({ ...prev, is_published: true }));
      setError('');
      console.log('Event updated to published');
    } catch (err) {
      console.error('Failed to publish event:', err);
      setError(err.response?.data?.error || 'Failed to publish event. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    setCanceling(true);
    try {
      const response = await api.put(`/events/${id}/cancel`, { reason: 'Event canceled by organizer' });
      console.log('Cancel response:', response.data);
      setEvent(prev => ({ ...prev, is_canceled: true }));
      setError('');
      setShowCancelModal(false);
      console.log('Event updated to canceled');
    } catch (err) {
      console.error('Failed to cancel event:', err);
      setError(err.response?.data?.error || 'Failed to cancel event. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!event || event.user_id !== user?.id) return;
    
    setLoadingRegistrations(true);
    try {
      const response = await api.get(`/events/${id}/registrations`);
      console.log('Registrations response:', response.data);
      setRegistrations(response.data.registrations || []);
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleUpdateRegistrationStatus = async (registrationId, status) => {
    try {
      await api.put(`/registrations/${registrationId}/status`, { status });
      await fetchRegistrations();
      await fetchEventDetails();
    } catch (err) {
      console.error('Failed to update registration status:', err);
      setError(err.response?.data?.error || 'Failed to update registration status');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!comment.trim()) {
      setFeedbackError('Please enter a comment');
      return;
    }
    
    setSubmittingComment(true);
    setFeedbackError('');
    
    try {
      const response = await api.post(`/events/${id}/feedback`, {
        rating: rating,
        comment: comment
      });
      
      // add new comment to top of list without refetching
      setFeedbacks([
        {
          id: response.data.feedback.id,
          rating: rating,
          comment: comment,
          created_at: new Date().toISOString(),
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name
          }
        },
        ...feedbacks
      ]);
      
      setComment('');
      setRating(5);
      setSubmittingComment(false);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      if (err.response?.status === 403 && err.response?.data?.error?.includes('must have attended')) {
        setFeedbackError('You must have registered for this event to leave feedback.');
      } else {
        setFeedbackError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
      }
      setSubmittingComment(false);
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstInitial = user.first_name?.[0] || '';
    const lastInitial = user.last_name?.[0] || '';
    return (firstInitial + lastInitial).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < rating ? '' : 'empty'}`}>
        ★
      </span>
    ));
  };

  if (loading) {
    return (
      <div className="event-detail-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="event-detail-wrapper">
        <div className="error-message">
          <span className="error-icon">&#9888;&#65039;</span>
          {error}
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="event-detail-wrapper">
        <div className="error-message">
          <span className="error-icon">&#10060;</span>
          Event not found.
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail-wrapper">
      <div className="back-nav">
        <button onClick={() => navigate(-1)} className="back-button">
          <span className="back-icon">&#8592;</span>
          Back to Events
        </button>
      </div>
      <div className="event-content">
        <div className="main-content">
          <section className="description-section">
            {event.is_canceled && (
              <div className="event-status-banner">
                &#10060; This event has been canceled
              </div>
            )}
            
            <h1 className="event-title">{event.title}</h1>
            
            <div className="event-info-grid">
              <div className="info-row">
                <span className="info-label">Date & Time</span>
                <span className="info-value">{formatDate(event.start_datetime)} - {formatDate(event.end_datetime)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location</span>
                <span className="info-value">{event.venue}{event.address ? `, ${event.city}, ${event.state}` : ''}</span>
              </div>
            </div>
            
            <div className="event-description">
              <h2 className="section-subtitle">About This Event</h2>
              <p className="description-text">{event.description}</p>
            </div>
          </section>
        </div>
        
        <div className="sidebar-content">
          {!event.is_canceled && (
            <section className="tickets-section">
              <h2 className="section-title">
                <span className="section-icon">&#127903;&#65039;</span>
                Tickets
              </h2>
              
              {error && (
                <div className="error-message">
                  <span className="error-icon">&#9888;&#65039;</span>
                  {error}
                </div>
              )}
              
              {!ticketTypes || ticketTypes.length === 0 ? (
                <div className="no-tickets">
                  <div className="no-tickets-icon">&#127915;</div>
                  <p>No tickets available for this event.</p>
                </div>
              ) : (
                <>
                  <div className="tickets-grid">
                    {ticketTypes.map(ticket => (
                      <label 
                        key={ticket.id} 
                        className={`ticket-option ${selectedTicket === ticket.id ? 'selected' : ''}`}
                        htmlFor={`ticket-${ticket.id}`}
                      >
                        <input
                          type="radio"
                          id={`ticket-${ticket.id}`}
                          name="ticket"
                          value={ticket.id}
                          onChange={() => handleSelectTicket(ticket.id)}
                          checked={selectedTicket === ticket.id}
                          className="ticket-radio"
                        />
                        <div className="ticket-content">
                          <div className="ticket-info">
                            <h4>{ticket.name}</h4>
                            <p className="ticket-description">{ticket.description}</p>
                            <p className="ticket-availability">
                              {ticket.available_quantity} tickets available
                            </p>
                          </div>
                          <div className="ticket-price">
                            <span className="price-amount">${ticket.price.toFixed(2)}</span>
                            <span className="price-label">per ticket</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  <button 
                    onClick={handleRegister} 
                    disabled={!selectedTicket}
                    className="register-button"
                  >
                    {selectedTicket ? 'Register for Event' : 'Select a Ticket Type'}
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </div>
      <div className="event-content" style={{ marginTop: '4rem' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <section className="comments-section">
            <h2 className="section-title">
              <span className="section-icon">&#128172;</span>
              Comments & Feedback
            </h2>
            
            {isAuthenticated ? (
              <div className="comment-form">
                <h3>Leave a Comment</h3>
                
                {feedbackError && (
                  <div className="error-message">
                    <span className="error-icon">&#9888;&#65039;</span>
                    {feedbackError}
                  </div>
                )}
                
                <form onSubmit={handleSubmitFeedback}>
                  <div className="form-group">
                    <label htmlFor="rating">How was your experience?</label>
                    <select
                      id="rating"
                      value={rating}
                      onChange={(e) => setRating(parseInt(e.target.value))}
                      className="rating-select"
                    >
                      <option value={5}>&#11088;&#11088;&#11088;&#11088;&#11088; Excellent</option>
                      <option value={4}>&#11088;&#11088;&#11088;&#11088; Very Good</option>
                      <option value={3}>&#11088;&#11088;&#11088; Good</option>
                      <option value={2}>&#11088;&#11088; Fair</option>
                      <option value={1}>&#11088; Poor</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="comment">Share your thoughts</label>
                    <textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="comment-textarea"
                      placeholder="Tell others about your experience at this event..."
                      required
                    ></textarea>
                  </div>
                  
                  <button type="submit" disabled={submittingComment} className="submit-button">
                    {submittingComment ? 'Submitting...' : 'Submit Comment'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="login-prompt">
                <p>
                  <span 
                    onClick={() => navigate('/login')} 
                    className="login-link"
                  >
                    Log in
                  </span> to leave a comment and share your experience.
                </p>
              </div>
            )}
            
            <div className="comments-list-wrapper">
              <h3>What People Are Saying</h3>
              
              {feedbacks.length === 0 ? (
                <div className="no-comments">
                  <div className="no-comments-icon">&#128173;</div>
                  <p>No comments yet. Be the first to leave feedback!</p>
                </div>
              ) : (
                <div className="comments-list">
                  {feedbacks.map(item => (
                    <div key={item.id} className="comment-card">
                      <div className="comment-header">
                        <div className="comment-author">
                          <div className="author-avatar">
                            {getUserInitials(item.user)}
                          </div>
                          <div className="author-info">
                            <h4>{item.user.first_name} {item.user.last_name}</h4>
                            <span className="comment-date">{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                        <div className="comment-rating">
                          <div className="rating-stars">
                            {renderStars(item.rating)}
                          </div>
                        </div>
                      </div>
                      <p className="comment-text">{item.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      {isAuthenticated && event.user_id === user?.id && (
        <div className="event-content">
          <div style={{ gridColumn: '1 / -1' }}>
            <section className="management-section">
              <h2 className="section-title">
                <span className="section-icon">&#9881;&#65039;</span>
                Event Management
              </h2>
              
              <div className="management-actions">
                <button 
                  onClick={() => navigate(`/events/${id}/edit`)}
                  className="management-button secondary"
                >
                  <span>&#9999;&#65039;</span>
                  Edit Event
                </button>
                
                {!event.is_published && (
                  <button 
                    onClick={handlePublishEvent}
                    disabled={publishing}
                    className="management-button primary"
                  >
                    <span>{publishing ? '⏳' : '🚀'}</span>
                    {publishing ? 'Publishing...' : 'Publish Event'}
                  </button>
                )}
                
                {!event.is_canceled && (
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    className="management-button danger"
                  >
                    <span>&#10060;</span>
                    Cancel Event
                  </button>
                )}
                
                <button 
                  onClick={() => navigate(`/events/${id}/ticket-types/create`)}
                  className="management-button secondary"
                >
                  <span>&#127915;</span>
                  Add Ticket Type
                </button>
              </div>
            </section>

            {event && event.user_id === user?.id && (
              <section className="attendees-section">
                <h2 className="section-title">
                  <span className="section-icon">&#128101;</span>
                  Attendees ({registrations.filter(reg => reg.status === 'confirmed').length})
                </h2>
                
                {loadingRegistrations ? (
                  <div className="loading-state">
                    <div className="loading-spinner small"></div>
                    <p>Loading attendees...</p>
                  </div>
                ) : registrations.filter(reg => reg.status === 'confirmed').length === 0 ? (
                  <p className="no-attendees">No confirmed attendees yet.</p>
                ) : (
                  <div className="attendees-list">
                    {registrations.filter(reg => reg.status === 'confirmed').map(registration => (
                      <div key={registration.id} className="attendee-item">
                        <div className="attendee-info">
                          <div className="attendee-name">
                            {registration.user?.first_name || 'Unknown'} {registration.user?.last_name || 'User'}
                          </div>
                          <div className="attendee-email">{registration.user?.email || 'No email'}</div>
                          <div className="attendee-ticket">{registration.ticket_type?.name || 'Unknown ticket'}</div>
                        </div>
                        <div className="attendee-actions">
                          <button
                            onClick={() => handleUpdateRegistrationStatus(registration.id, 'canceled')}
                            className="attendee-action-button danger"
                          >
                            Cancel Registration
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
      
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Cancel Event</h2>
            <p>Are you sure you want to cancel this event? This action cannot be undone.</p>
            <p className="warning-text">All registered attendees will be notified of the cancellation.</p>
            <div className="modal-actions">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="modal-button secondary"
              >
                Keep Event
              </button>
              <button 
                onClick={handleCancelEvent}
                className="modal-button danger"
                disabled={canceling}
              >
                {canceling ? 'Canceling...' : 'Yes, Cancel Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetail;

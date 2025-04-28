// src/components/EventDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // State for new comment/feedback
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        // Fetch event details
        const eventResponse = await api.get(`/events/${id}`);
        setEvent(eventResponse.data);
        
        // Fetch ticket types
        const ticketsResponse = await api.get(`/events/${id}/ticket-types`);
        setTicketTypes(ticketsResponse.data);
        
        // Fetch feedback/comments
        try {
          const feedbackResponse = await api.get(`/events/${id}/feedback`);
          setFeedback(feedbackResponse.data.feedbacks || []);
        } catch (feedbackErr) {
          console.error('Failed to fetch feedback:', feedbackErr);
          // Don't fail the whole component if just feedback fails
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch event details:', err);
        setError('Failed to load event details. Please try again later.');
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle ticket selection
  const handleSelectTicket = (ticketId) => {
    setSelectedTicket(ticketId);
  };

  // Handle registration
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
      
      // Navigate to registration confirmation
      navigate(`/registrations/${response.data.registration.id}`);
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  // Handle submitting feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!newComment.trim()) {
      setFeedbackError('Please enter a comment');
      return;
    }
    
    setSubmittingFeedback(true);
    setFeedbackError('');
    
    try {
      const response = await api.post(`/events/${id}/feedback`, {
        rating: rating,
        comment: newComment
      });
      
      // Add the new feedback to the list
      setFeedback([
        {
          id: response.data.feedback.id,
          rating: rating,
          comment: newComment,
          created_at: new Date().toISOString(),
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name
          }
        },
        ...feedback
      ]);
      
      // Clear the form
      setNewComment('');
      setRating(5);
      setSubmittingFeedback(false);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setFeedbackError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
      setSubmittingFeedback(false);
    }
  };

  if (loading) return <div>Loading event details...</div>;
  if (error) return <div>{error}</div>;
  if (!event) return <div>Event not found.</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)}>Back</button>
      
      <h1>{event.title}</h1>
      
      {event.is_canceled && (
        <div>
          <h2>This event has been canceled</h2>
        </div>
      )}
      
      <div>
        <p><strong>Date:</strong> {formatDate(event.start_datetime)}</p>
        <p><strong>End Time:</strong> {formatDate(event.end_datetime)}</p>
        <p><strong>Location:</strong> {event.venue}</p>
        {event.address && (
          <p><strong>Address:</strong> {event.address}, {event.city}, {event.state} {event.zip_code}</p>
        )}
        <p><strong>Virtual Event:</strong> {event.is_virtual ? 'Yes' : 'No'}</p>
      </div>
      
      <div>
        <h2>Description</h2>
        <p>{event.description}</p>
      </div>
      
      {!event.is_canceled && (
        <div>
          <h2>Tickets</h2>
          {ticketTypes.length === 0 ? (
            <p>No tickets available for this event.</p>
          ) : (
            <div>
              {ticketTypes.map(ticket => (
                <div key={ticket.id}>
                  <input
                    type="radio"
                    id={`ticket-${ticket.id}`}
                    name="ticket"
                    value={ticket.id}
                    onChange={() => handleSelectTicket(ticket.id)}
                    checked={selectedTicket === ticket.id}
                  />
                  <label htmlFor={`ticket-${ticket.id}`}>
                    <h3>{ticket.name}</h3>
                    <p>{ticket.description}</p>
                    <p><strong>Price:</strong> ${ticket.price.toFixed(2)}</p>
                    <p><strong>Available:</strong> {ticket.quantity_available}</p>
                  </label>
                </div>
              ))}
              
              <button onClick={handleRegister} disabled={!selectedTicket}>
                Register for Event
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Event Comments/Feedback Section */}
      <div>
        <h2>Comments & Feedback</h2>
        
        {/* Feedback Form */}
        {isAuthenticated && (
          <div>
            <h3>Leave a Comment</h3>
            {feedbackError && <p>{feedbackError}</p>}
            
            <form onSubmit={handleSubmitFeedback}>
              <div>
                <label htmlFor="rating">Rating:</label>
                <select
                  id="rating"
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="comment">Your Comment:</label>
                <textarea
                  id="comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows="4"
                  required
                ></textarea>
              </div>
              
              <button type="submit" disabled={submittingFeedback}>
                {submittingFeedback ? 'Submitting...' : 'Submit Comment'}
              </button>
            </form>
          </div>
        )}
        
        {/* Display Feedback */}
        <div>
          <h3>What People Are Saying</h3>
          
          {feedback.length === 0 ? (
            <p>No comments yet. Be the first to leave feedback!</p>
          ) : (
            <div>
              {feedback.map(item => (
                <div key={item.id}>
                  <p>
                    <strong>Rating:</strong> {item.rating}/5 | 
                    <strong>From:</strong> {item.user.first_name} {item.user.last_name}
                  </p>
                  <p>{item.comment}</p>
                  <p><small>Posted on: {formatDate(item.created_at)}</small></p>
                  <hr />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Show event management options for event owner or admin */}
      {isAuthenticated && event.user_id === user?.id && (
        <div>
          <h2>Event Management</h2>
          <button onClick={() => navigate(`/events/${id}/edit`)}>
            Edit Event
          </button>
          {!event.is_published && (
            <button onClick={() => navigate(`/events/${id}/publish`)}>
              Publish Event
            </button>
          )}
          {!event.is_canceled && (
            <button onClick={() => navigate(`/events/${id}/cancel`)}>
              Cancel Event
            </button>
          )}
          <button onClick={() => navigate(`/events/${id}/ticket-types/create`)}>
            Add Ticket Type
          </button>
        </div>
      )}
    </div>
  );
}

export default EventDetail;
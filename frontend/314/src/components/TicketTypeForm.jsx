import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './TicketTypeForm.css';

function TicketTypeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity_available: '',
    is_vip: false,
    sale_start_date: '',
    sale_end_date: ''
  });
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    console.log('TicketTypeForm - Auth check:', { isAuthenticated, user });
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // somewhat legacy because user is automatically promoted to organizer
    // when user tries to create new event
    if (!user?.is_organizer && !user?.is_admin) {
      console.log('User is not organizer/admin, redirecting. User:', user);
      navigate('/');
      return;
    }
    
    fetchEventDetails();
  }, [isAuthenticated, user, navigate, id]);
  
  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      const eventData = response.data;
      
      if (eventData.user_id !== user.id && !user.is_admin) {
        navigate('/');
        return;
      }
      
      setEvent(eventData);
      setLoadingEvent(false);
    } catch (err) {
      console.error('Failed to fetch event:', err);
      setError('Failed to load event details.');
      setLoadingEvent(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Ticket name is required';
    }
    
    if (!formData.price || parseFloat(formData.price) < 0) {
      errors.price = 'Price must be 0 or greater';
    }
    
    if (!formData.quantity_available || parseInt(formData.quantity_available) <= 0) {
      errors.quantity_available = 'Quantity must be greater than zero';
    }
    
    if (formData.sale_start_date && formData.sale_end_date) {
      const start = new Date(formData.sale_start_date);
      const end = new Date(formData.sale_end_date);
      if (end <= start) {
        errors.sale_end_date = 'Sale end date must be after start date';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    const ticketData = {
      ...formData,
      price: parseFloat(formData.price),
      quantity_available: parseInt(formData.quantity_available)
    };
    
    if (formData.sale_start_date && formData.sale_start_date.trim() !== '') {
      const startDate = new Date(formData.sale_start_date);
      ticketData.sale_start_date = startDate.toISOString();
    } else {
      ticketData.sale_start_date = null;
    }
    
    if (formData.sale_end_date && formData.sale_end_date.trim() !== '') {
      const endDate = new Date(formData.sale_end_date);
      ticketData.sale_end_date = endDate.toISOString();
    } else {
      ticketData.sale_end_date = null;
    }

    // make an api request to the backend to create a ticket type throw
    // and append it to the DOM.
    try {
      await api.post(`/events/${id}/ticket-types`, ticketData);
      setSuccess('Ticket type created successfully!');
      
      setTimeout(() => {
        navigate(`/events/${id}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to create ticket type:', err);
      setError(err.response?.data?.error || 'Failed to create ticket type. Please try again.');
      setSaving(false);
    }
  };
  if (loadingEvent) {
    return (
      <div className="ticket-form-wrapper">
        <div className="ticket-form-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="ticket-form-wrapper">
      <div className="ticket-form-container">
        <div className="ticket-form-header">
          <h1 className="ticket-form-title">Add Ticket Type</h1>
          <p className="ticket-form-subtitle">
            Create different ticket options for your attendees
          </p>
        </div>
        
        {event && (
          <div className="event-info-card">
            <div className="event-info-content">
              <span className="event-icon">&#127914;</span>
              <div className="event-details">
                <h3>{event.title}</h3>
                <p>{formatDate(event.start_datetime)}</p>
              </div>
            </div>
          </div>
        )}
        
        {(formData.name || formData.price) && (
          <div className="ticket-preview">
            <div className="preview-header">
              <h3 className="preview-title">
                {formData.name || 'Ticket Name'}
              </h3>
              {formData.is_vip && (
                <span className="preview-badge">VIP</span>
              )}
            </div>
            <div className="preview-details">
              <div className="preview-info">
                {formData.description && (
                  <p className="preview-description">{formData.description}</p>
                )}
                <p className="preview-quantity">
                  {formData.quantity_available || '0'} tickets available
                </p>
              </div>
              <div className="preview-price">
                <span className="price-amount">
                  ${formData.price || '0.00'}
                </span>
                <span className="price-label">per ticket</span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <span className="error-icon">&#9888;&#65039;</span>
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {success}
          </div>
        )}
        
        <section className="ticket-form-section">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <span className="label-icon">&#127915;</span>
                  Ticket Name <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`form-input ${fieldErrors.name ? 'error' : ''}`}
                  placeholder="e.g., General Admission, Early Bird, VIP"
                  maxLength="100"
                />
                <span className="form-hint">{formData.name.length}/100 characters</span>
                {fieldErrors.name && (
                  <span className="field-error">
                    <span>&#9888;&#65039;</span> {fieldErrors.name}
                  </span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  <span className="label-icon">&#128221;</span>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-textarea"
                  placeholder="What's included with this ticket? Any special perks?"
                  rows="3"
                />
                <span className="form-hint">Help attendees understand what this ticket offers</span>
              </div>
              
              <div className="form-group">
                <label htmlFor="price" className="form-label">
                  <span className="label-icon">&#128176;</span>
                  Price <span className="required-asterisk">*</span>
                </label>
                <div className="price-input-group">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className={`form-input price-input ${fieldErrors.price ? 'error' : ''}`}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                {fieldErrors.price && (
                  <span className="field-error">
                    <span>&#9888;&#65039;</span> {fieldErrors.price}
                  </span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="quantity_available" className="form-label">
                  <span className="label-icon">&#128202;</span>
                  Quantity Available <span className="required-asterisk">*</span>
                </label>
                <input
                  type="number"
                  id="quantity_available"
                  name="quantity_available"
                  value={formData.quantity_available}
                  onChange={handleChange}
                  className={`form-input ${fieldErrors.quantity_available ? 'error' : ''}`}
                  placeholder="100"
                  min="1"
                />
                {fieldErrors.quantity_available && (
                  <span className="field-error">
                    <span>&#9888;&#65039;</span> {fieldErrors.quantity_available}
                  </span>
                )}
              </div>
              
              <div className="form-group">
                <div className="vip-toggle-group">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      name="is_vip"
                      checked={formData.is_vip}
                      onChange={handleChange}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div className="toggle-content">
                    <label className="toggle-label">
                      <span className="vip-icon">&#11088;</span>
                      VIP Ticket
                    </label>
                    <p className="toggle-description">
                      Mark this as a premium ticket with special benefits
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="datetime-row">
                <div className="form-group">
                  <label htmlFor="sale_start_date" className="form-label">
                    <span className="label-icon">&#128197;</span>
                    Sale Start Date
                  </label>
                  <input
                    type="datetime-local"
                    id="sale_start_date"
                    name="sale_start_date"
                    value={formData.sale_start_date}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <span className="form-hint">When ticket sales begin</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="sale_end_date" className="form-label">
                    <span className="label-icon">&#127937;</span>
                    Sale End Date
                  </label>
                  <input
                    type="datetime-local"
                    id="sale_end_date"
                    name="sale_end_date"
                    value={formData.sale_end_date}
                    onChange={handleChange}
                    className={`form-input ${fieldErrors.sale_end_date ? 'error' : ''}`}
                  />
                  <span className="form-hint">When ticket sales end</span>
                  {fieldErrors.sale_end_date && (
                    <span className="field-error">
                      <span>&#9888;&#65039;</span> {fieldErrors.sale_end_date}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => navigate(`/events/${id}`)}
                className="form-button button-secondary"
              >
                <span>&#8592;</span>
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="form-button button-primary"
              >
                {saving ? (
                  <>
                    <span>&#9203;</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span>&#127903;&#65039;</span>
                    Create Ticket Type
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default TicketTypeForm;
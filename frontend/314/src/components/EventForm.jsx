import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './EventForm.css';

function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    venue: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    is_virtual: false,
    max_attendees: '',
    tags: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  
  const [currentStep, setCurrentStep] = useState(1);
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (isEditMode) {
      fetchEventData();
    }
  }, [isAuthenticated, navigate, isEditMode, id]);
  
  const fetchEventData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/events/${id}`);
      const event = response.data;
      
      if (event.user_id !== user.id && !user.is_admin) {
        navigate('/');
        return;
      }
      
      setFormData({
        title: event.title || '',
        description: event.description || '',
        start_datetime: formatDateForInput(event.start_datetime),
        end_datetime: formatDateForInput(event.end_datetime),
        venue: event.venue || '',
        address: event.address || '',
        city: event.city || '',
        state: event.state || '',
        zip_code: event.zip_code || '',
        is_virtual: event.is_virtual || false,
        max_attendees: event.max_attendees || '',
        tags: event.tags || ''
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch event:', err);
      setError('Failed to load event data. Please try again.');
      setLoading(false);
    }
  };
  
  // convert date to format that datetime-local input expects
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Event title is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Event description is required';
    }
    
    if (!formData.start_datetime) {
      errors.start_datetime = 'Start date and time is required';
    }
    
    if (!formData.end_datetime) {
      errors.end_datetime = 'End date and time is required';
    }
    
    if (formData.start_datetime && formData.end_datetime) {
      const start = new Date(formData.start_datetime);
      const end = new Date(formData.end_datetime);
      if (end <= start) {
        errors.end_datetime = 'End time must be after start time';
      }
    }
    
    if (!formData.venue.trim()) {
      errors.venue = 'Venue is required';
    }
    
    if (!formData.is_virtual) {
      if (!formData.city.trim()) {
        errors.city = 'City is required for in-person events';
      }
      if (!formData.state.trim()) {
        errors.state = 'State is required for in-person events';
      }
      if (formData.zip_code && !/^\d{4}$/.test(formData.zip_code)) {
        errors.zip_code = 'Postcode must be 4 digits';
      }
    }
    
    if (formData.max_attendees && parseInt(formData.max_attendees) < 1) {
      errors.max_attendees = 'Maximum attendees must be at least 1';
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
    
    try {
      const eventData = {
        ...formData,
        start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : null,
        end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null
      };
      
      let response;
      if (isEditMode) {
        response = await api.put(`/events/${id}`, eventData);
        setSuccess('Event updated successfully!');
      } else {
        response = await api.post('/events/create', eventData);
        setSuccess('Event created successfully!');
      }
      
      console.log('Event response:', response.data);
      
      setTimeout(() => {
        const eventId = response.data.id || response.data.ID || response.data.Id;
        console.log('Navigating to event:', eventId);
        if (eventId) {
          navigate(`/events/${eventId}`);
        } else {
          console.error('No event ID found in response:', response.data);
          setError('Event created but unable to navigate to it. Please check your events list.');
        }
      }, 1500);
      
    } catch (err) {
      console.error('Failed to save event:', err);
      setError(err.response?.data?.error || 'Failed to save event. Please try again.');
      setSaving(false);
    }
  };
  
  

  const calculateProgress = () => {
    let filledFields = 0;
    const requiredFields = ['title', 'description', 'start_datetime', 'end_datetime', 'venue'];
    
    requiredFields.forEach(field => {
      if (formData[field]) filledFields++;
    });
    
    if (!formData.is_virtual && formData.city && formData.state) {
      filledFields++;
    }
    
    return Math.round((filledFields / (requiredFields.length + 1)) * 100);
  };
  
  if (loading) {
    return (
      <div className="event-form-wrapper">
        <div className="event-form-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="event-form-wrapper">
      <div className="event-form-container">
        <div className="form-header">
          <h1 className="form-title">
            {isEditMode ? 'Edit Event' : 'Create New Event'}
          </h1>
          <p className="form-subtitle">
            {isEditMode 
              ? 'Update your event details and settings'
              : 'Fill in the details below to create your amazing event'
            }
          </p>
        </div>
        
        <div className="progress-indicator">
          <div className="progress-step">
            <div className={`step-circle ${calculateProgress() >= 33 ? 'active' : ''} ${calculateProgress() === 100 ? 'completed' : ''}`}>
              1
            </div>
            <span className="step-label">Basic Info</span>
          </div>
          <div className="progress-step">
            <div className={`step-circle ${calculateProgress() >= 66 ? 'active' : ''} ${calculateProgress() === 100 ? 'completed' : ''}`}>
              2
            </div>
            <span className="step-label">Date & Location</span>
          </div>
          <div className="progress-step">
            <div className={`step-circle ${calculateProgress() === 100 ? 'completed' : ''}`}>
              3
            </div>
            <span className="step-label">Additional Details</span>
          </div>
        </div>
        
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
        
        <form onSubmit={handleSubmit}>
          <section className="form-section">
            <h2 className="section-title">
              <span className="section-icon">&#128221;</span>
              Basic Information
            </h2>
            
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="title" className="form-label">
                  Event Title <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`form-input ${fieldErrors.title ? 'error' : ''}`}
                  placeholder="Enter a catchy event title"
                  maxLength="200"
                />
                <span className="form-hint">{formData.title.length}/200 characters</span>
                {fieldErrors.title && (
                  <span className="field-error">
                    <span>&#9888;&#65039;</span> {fieldErrors.title}
                  </span>
                )}
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="description" className="form-label">
                  Event Description <span className="required-asterisk">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`form-textarea ${fieldErrors.description ? 'error' : ''}`}
                  placeholder="Describe what your event is about, what attendees can expect, and why they should attend..."
                  rows="6"
                />
                <span className="form-hint">Make it compelling! This is what will attract attendees.</span>
                {fieldErrors.description && (
                  <span className="field-error">
                    <span>&#9888;&#65039;</span> {fieldErrors.description}
                  </span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="tags" className="form-label">
                  Event Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., workshop, networking, tech"
                />
                <span className="form-hint">Separate tags with commas</span>
              </div>
              
              <div className="form-group">
                <label htmlFor="max_attendees" className="form-label">
                  Maximum Attendees
                </label>
                <input
                  type="number"
                  id="max_attendees"
                  name="max_attendees"
                  value={formData.max_attendees}
                  onChange={handleChange}
                  className={`form-input ${fieldErrors.max_attendees ? 'error' : ''}`}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
                {fieldErrors.max_attendees && (
                  <span className="field-error">
                    <span>&#9888;&#65039;</span> {fieldErrors.max_attendees}
                  </span>
                )}
              </div>
            </div>
          </section>
          
          <section className="form-section">
            <h2 className="section-title">
              <span className="section-icon">&#128197;</span>
              Date & Location
            </h2>
            
            <div className="form-grid">
              <div className="datetime-group full-width">
                <div className="form-group">
                  <label htmlFor="start_datetime" className="form-label">
                    Start Date & Time <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="start_datetime"
                    name="start_datetime"
                    value={formData.start_datetime}
                    onChange={handleChange}
                    className={`form-input ${fieldErrors.start_datetime ? 'error' : ''}`}
                  />
                  {fieldErrors.start_datetime && (
                    <span className="field-error">
                      <span>&#9888;&#65039;</span> {fieldErrors.start_datetime}
                    </span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="end_datetime" className="form-label">
                    End Date & Time <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="end_datetime"
                    name="end_datetime"
                    value={formData.end_datetime}
                    onChange={handleChange}
                    className={`form-input ${fieldErrors.end_datetime ? 'error' : ''}`}
                  />
                  {fieldErrors.end_datetime && (
                    <span className="field-error">
                      <span>&#9888;&#65039;</span> {fieldErrors.end_datetime}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="form-group full-width">
                <div className="toggle-group">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      name="is_virtual"
                      checked={formData.is_virtual}
                      onChange={handleChange}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div>
                    <label className="toggle-label">Virtual Event</label>
                    <p className="form-hint">Toggle on if this is an online event</p>
                  </div>
                </div>
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="venue" className="form-label">
                  Venue Name <span className="required-asterisk">*</span>
                </label>
                <input
                  type="text"
                  id="venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  className={`form-input ${fieldErrors.venue ? 'error' : ''}`}
                  placeholder={formData.is_virtual ? "e.g., Zoom, Google Meet" : "e.g., Conference Center, Room 101"}
                />
                {fieldErrors.venue && (
                  <span className="field-error">
                    <span>&#9888;&#65039;</span> {fieldErrors.venue}
                  </span>
                )}
              </div>
              
              {!formData.is_virtual && (
                <div className="address-section full-width">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label htmlFor="address" className="form-label">
                        Street Address
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="123 Main Street"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="city" className="form-label">
                        City <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`form-input ${fieldErrors.city ? 'error' : ''}`}
                        placeholder="Wollongong"
                      />
                      {fieldErrors.city && (
                        <span className="field-error">
                          <span>&#9888;&#65039;</span> {fieldErrors.city}
                        </span>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="state" className="form-label">
                        State <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className={`form-input ${fieldErrors.state ? 'error' : ''}`}
                        placeholder="NSW"
                      />
                      {fieldErrors.state && (
                        <span className="field-error">
                          <span>⚠️</span> {fieldErrors.state}
                        </span>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="zip_code" className="form-label">
                        Postcode
                      </label>
                      <input
                        type="text"
                        id="zip_code"
                        name="zip_code"
                        value={formData.zip_code}
                        onChange={handleChange}
                        className={`form-input ${fieldErrors.zip_code ? 'error' : ''}`}
                        placeholder="2500"
                        maxLength="4"
                        pattern="\d{4}"
                      />
                      {fieldErrors.zip_code && (
                        <span className="field-error">
                          <span>⚠️</span> {fieldErrors.zip_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
          
          
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="form-button button-secondary"
            >
              <span>←</span>
              Cancel
            </button>
            
            <div className="action-group">
              <button
                type="submit"
                className="form-button button-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span>⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>{isEditMode ? '💾' : '🎉'}</span>
                    {isEditMode ? 'Update Event' : 'Create Event'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventForm;
// src/components/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

function Profile() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  // State for different data sections
  const [registrations, setRegistrations] = useState([]);
  const [organizedEvents, setOrganizedEvents] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState({
    registrations: true,
    organized: true,
    feedback: true
  });
  const [error, setError] = useState({});
  
  // Form state for profile editing
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });
  
  // Password change form state
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Notification preferences
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
    
    // Fetch user's registrations
    const fetchData = async () => {
      try {
        // Fetch registrations
        const regResponse = await api.get('/registrations');
        setRegistrations(regResponse.data);
        setLoading(prev => ({ ...prev, registrations: false }));
      } catch (err) {
        console.error('Failed to fetch registrations:', err);
        setError(prev => ({ 
          ...prev, 
          registrations: 'Failed to load your event registrations' 
        }));
        setLoading(prev => ({ ...prev, registrations: false }));
      }
      
      // Fetch organized events (if user is an organizer)
      if (user.is_organizer) {
        try {
          const eventsResponse = await api.get('/events', { 
            params: { user_id: user.id } 
          });
          setOrganizedEvents(eventsResponse.data.events || []);
          setLoading(prev => ({ ...prev, organized: false }));
        } catch (err) {
          console.error('Failed to fetch organized events:', err);
          setError(prev => ({ 
            ...prev, 
            organized: 'Failed to load your organized events' 
          }));
          setLoading(prev => ({ ...prev, organized: false }));
        }
      } else {
        setLoading(prev => ({ ...prev, organized: false }));
      }
      
      // Fetch user's feedback history
      try {
        const feedbackResponse = await api.get('/feedback');
        setFeedbacks(feedbackResponse.data);
        setLoading(prev => ({ ...prev, feedback: false }));
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
        setError(prev => ({ 
          ...prev, 
          feedback: 'Failed to load your feedback history' 
        }));
        setLoading(prev => ({ ...prev, feedback: false }));
      }
    };

    fetchData();
  }, [isAuthenticated, user]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle notification preferences changes
  const handleNotifChange = (e) => {
    const { name, checked } = e.target;
    setNotifPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Update profile
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

  // Change password
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
  
  // Save notification preferences
  const handleNotifSubmit = async (e) => {
    e.preventDefault();
    // In a real app, you would send these preferences to the backend
    alert('Notification preferences saved.');
  };

  // Format date helper function
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

  if (!isAuthenticated) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div>
      <h2>My Profile</h2>
      
      {/* Profile Navigation Tabs */}
      <div>
        <button onClick={() => setActiveTab('profile')}>
          Personal Info
        </button>
        <button onClick={() => setActiveTab('events')}>
          My Events
        </button>
        {user.is_organizer && (
          <button onClick={() => setActiveTab('organized')}>
            Organized Events
          </button>
        )}
        <button onClick={() => setActiveTab('payments')}>
          Payments
        </button>
        <button onClick={() => setActiveTab('feedback')}>
          Feedback
        </button>
        <button onClick={() => setActiveTab('notifications')}>
          Notifications
        </button>
      </div>
      
      {/* Personal Information */}
      {activeTab === 'profile' && (
        <div>
          <h3>Account Information</h3>
          {error.profile && <div>{error.profile}</div>}
          
          {!editing ? (
            <div>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
              <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
              <p><strong>Account Type:</strong> {user.is_admin ? 'Admin' : user.is_organizer ? 'Organizer' : 'Regular User'}</p>
              
              <div>
                <button onClick={() => setEditing(true)}>Edit Profile</button>
                <button onClick={() => setChangingPassword(true)}>Change Password</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit}>
              <div>
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
              
              <div>
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
              
              <div>
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <button type="submit">Save Changes</button>
                <button type="button" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
          
          {/* Password Change Form */}
          {changingPassword && (
            <div>
              <h3>Change Password</h3>
              {error.password && <div>{error.password}</div>}
              
              <form onSubmit={handlePasswordSubmit}>
                <div>
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
                
                <div>
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
                
                <div>
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
                
                <div>
                  <button type="submit">Update Password</button>
                  <button type="button" onClick={() => setChangingPassword(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      
      {/* Event Registrations */}
      {activeTab === 'events' && (
        <div>
          <h3>My Events</h3>
          
          {/* Event List */}
          <div>
            <h4>My Registrations</h4>
            
            {loading.registrations ? (
              <p>Loading your events...</p>
            ) : error.registrations ? (
              <div>{error.registrations}</div>
            ) : registrations.length === 0 ? (
              <p>You haven't registered for any events yet.</p>
            ) : (
              <div>
                {registrations.map((reg) => (
                  <div key={reg.id}>
                    <h5>{reg.event_title}</h5>
                    <p><strong>Date:</strong> {formatDate(reg.event_start_date)}</p>
                    <p><strong>Ticket:</strong> {reg.ticket_name}</p>
                    <p><strong>Status:</strong> {reg.status}</p>
                    
                    <div>
                      <button onClick={() => navigate(`/events/${reg.event_id}`)}>
                        View Event
                      </button>
                      {reg.status !== 'canceled' && (
                        <button onClick={() => navigate(`/registrations/${reg.id}`)}>
                          View Registration
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Organized Events (for organizers) */}
      {activeTab === 'organized' && user.is_organizer && (
        <div>
          <h3>Events You've Organized</h3>
          
          {loading.organized ? (
            <p>Loading your organized events...</p>
          ) : error.organized ? (
            <div>{error.organized}</div>
          ) : organizedEvents.length === 0 ? (
            <div>
              <p>You haven't organized any events yet.</p>
              <button onClick={() => navigate('/events/create')}>Create Event</button>
            </div>
          ) : (
            <>
              <div>
                <div>
                  <h4>Total Events</h4>
                  <p>{organizedEvents.length}</p>
                </div>
                <div>
                  <h4>Published</h4>
                  <p>{organizedEvents.filter(e => e.is_published).length}</p>
                </div>
                <div>
                  <h4>Upcoming</h4>
                  <p>
                    {organizedEvents.filter(e => 
                      new Date(e.start_datetime) > new Date() && !e.is_canceled
                    ).length}
                  </p>
                </div>
              </div>
              
              <div>
                {organizedEvents.map((event) => (
                  <div key={event.id}>
                    <div>
                      {event.is_published ? (
                        event.is_canceled ? 
                          <span>Canceled</span> : 
                          <span>Published</span>
                      ) : (
                        <span>Draft</span>
                      )}
                    </div>
                    
                    <h5>{event.title}</h5>
                    <p><strong>Date:</strong> {formatDate(event.start_datetime)}</p>
                    <p><strong>Venue:</strong> {event.venue}</p>
                    
                    <div>
                      <button onClick={() => navigate(`/events/${event.id}`)}>
                        View
                      </button>
                      <button onClick={() => navigate(`/events/${event.id}/edit`)}>
                        Edit
                      </button>
                      {!event.is_published && (
                        <button onClick={() => navigate(`/events/${event.id}/publish`)}>
                          Publish
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <button onClick={() => navigate('/events/create')}>Create New Event</button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Payment History */}
      {activeTab === 'payments' && (
        <div>
          <h3>Payment History</h3>
          
          {loading.registrations ? (
            <p>Loading your payment history...</p>
          ) : error.registrations ? (
            <div>{error.registrations}</div>
          ) : registrations.length === 0 ? (
            <p>No payment history available.</p>
          ) : (
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id}>
                      <td>{reg.event_title}</td>
                      <td>{formatDate(reg.created_at)}</td>
                      <td>${reg.total_price?.toFixed(2) || '0.00'}</td>
                      <td>{reg.status}</td>
                      <td>
                        <button onClick={() => navigate(`/registrations/${reg.id}`)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Feedback History */}
      {activeTab === 'feedback' && (
        <div>
          <h3>Feedback History</h3>
          
          {loading.feedback ? (
            <p>Loading your feedback history...</p>
          ) : error.feedback ? (
            <div>{error.feedback}</div>
          ) : feedbacks.length === 0 ? (
            <p>You haven't provided feedback for any events yet.</p>
          ) : (
            <div>
              {feedbacks.map((feedback) => (
                <div key={feedback.id}>
                  <h5>{feedback.event?.title || 'Unknown Event'}</h5>
                  <div>
                    Rating: {feedback.rating}/5
                  </div>
                  <p>{feedback.comment}</p>
                  <p>Submitted on: {formatDate(feedback.created_at)}</p>
                  
                  <div>
                    <button onClick={() => navigate(`/events/${feedback.event_id}`)}>
                      View Event
                    </button>
                    <button onClick={() => navigate(`/feedback/${feedback.id}/edit`)}>
                      Edit Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Notification Preferences */}
      {activeTab === 'notifications' && (
        <div>
          <h3>Notification Preferences</h3>
          
          <form onSubmit={handleNotifSubmit}>
            <div>
              <input
                type="checkbox"
                id="email_updates"
                name="email_updates"
                checked={notifPreferences.email_updates}
                onChange={handleNotifChange}
              />
              <label htmlFor="email_updates">
                Receive email updates about my registrations
              </label>
            </div>
            
            <div>
              <input
                type="checkbox"
                id="event_reminders"
                name="event_reminders"
                checked={notifPreferences.event_reminders}
                onChange={handleNotifChange}
              />
              <label htmlFor="event_reminders">
                Receive event reminders
              </label>
            </div>
            
            <div>
              <input
                type="checkbox"
                id="marketing"
                name="marketing"
                checked={notifPreferences.marketing}
                onChange={handleNotifChange}
              />
              <label htmlFor="marketing">
                Receive marketing communications about other events
              </label>
            </div>
            
            <button type="submit">Save Preferences</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Profile;
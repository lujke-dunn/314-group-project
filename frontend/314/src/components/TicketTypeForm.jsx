// src/components/TicketTypeForm.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

function TicketTypeForm() {
  const { id } = useParams(); // Event ID from URL
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity_available: '',
    is_vip: false,
    sale_start_date: '',
    sale_end_date: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate inputs
    if (parseFloat(formData.price) < 0) {
      setError('Price cannot be negative');
      setLoading(false);
      return;
    }
    
    if (parseInt(formData.quantity_available) <= 0) {
      setError('Quantity must be greater than zero');
      setLoading(false);
      return;
    }
    
    // Create data object with correct types
    const ticketData = {
      ...formData,
      price: parseFloat(formData.price),
      quantity_available: parseInt(formData.quantity_available)
    };
    
    // Format dates if provided
    if (ticketData.sale_start_date) {
      const startDate = new Date(ticketData.sale_start_date);
      ticketData.sale_start_date = startDate.toISOString();
    }
    
    if (ticketData.sale_end_date) {
      const endDate = new Date(ticketData.sale_end_date);
      ticketData.sale_end_date = endDate.toISOString();
    }
    
    try {
      await api.post(`/events/${id}/ticket-types`, ticketData);
      // Redirect back to event page
      navigate(`/events/${id}`);
    } catch (err) {
      console.error('Failed to create ticket type:', err);
      setError(err.response?.data?.error || 'Failed to create ticket type. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>Add Ticket Type</h1>
      
      {error && <p>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Ticket Name*</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
          ></textarea>
        </div>
        
        <div>
          <label htmlFor="price">Price ($)*</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>
        
        <div>
          <label htmlFor="quantity_available">Quantity Available*</label>
          <input
            type="number"
            id="quantity_available"
            name="quantity_available"
            value={formData.quantity_available}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        
        <div>
          <label>
            <input
              type="checkbox"
              name="isVIP"
              checked={formData.isVIP}
              onChange={handleChange}
            />
            VIP Ticket
          </label>
        </div>
        
        <div>
          <label htmlFor="sale_start_date">Sale Start Date (Optional)</label>
          <input
            type="datetime-local"
            id="sale_start_date"
            name="sale_start_date"
            value={formData.sale_start_date}
            onChange={handleChange}
          />
        </div>
        
        <div>
          <label htmlFor="sale_end_date">Sale End Date (Optional)</label>
          <input
            type="datetime-local"
            id="sale_end_date"
            name="sale_end_date"
            value={formData.sale_end_date}
            onChange={handleChange}
          />
        </div>
        
        <div>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Ticket Type'}
          </button>
          <button type="button" onClick={() => navigate(`/events/${id}`)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default TicketTypeForm;
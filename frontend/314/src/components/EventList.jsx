import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import './EventList.css';

function EventList() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    start_date: '',
    end_date: '',
    category_id: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchEvents();
  }, [currentPage, searchQuery, filters]);
  
  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '10'
      });
      
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }
      
      if (filters.city.trim()) {
        params.append('city', filters.city.trim());
      }
      
      if (filters.start_date) {
        params.append('start_date', new Date(filters.start_date).toISOString());
      }
      
      if (filters.end_date) {
        params.append('end_date', new Date(filters.end_date).toISOString());
      }
      
      if (filters.category_id) {
        params.append('category_id', filters.category_id);
      }
      
      const response = await api.get(`/events?${params.toString()}`);
      setEvents(response.data.events || []);
      setTotalPages(response.data.total_pages || 1);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load events. Please try again.');
      setLoading(false);
    }
  };
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };
  
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      city: '',
      start_date: '',
      end_date: '',
      category_id: ''
    });
    setCurrentPage(1);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  if (loading && events.length === 0) {
    return (
      <div className="events-list-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="events-list-wrapper">
      {/* Back Navigation */}
      <div className="back-nav">
        <button onClick={() => navigate(-1)} className="back-button">
          <span className="back-icon">&#8592;</span>
          Back
        </button>
      </div>
      
      {/* Header */}
      <div className="events-header">
        <h1 className="page-title">Discover Events</h1>
        <p className="page-subtitle">Find exciting events happening near you</p>
      </div>
      
      {/* Search and Filters */}
      <div className="search-filters-section">
        <div className="search-bar">
          <div className="search-input-group">
            <span className="search-icon">&#128269;</span>
            <input
              type="text"
              placeholder="Search events by title or description..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="city-filter">City:</label>
            <input
              id="city-filter"
              type="text"
              placeholder="Enter city"
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="start-date-filter">From Date:</label>
            <input
              id="start-date-filter"
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="end-date-filter">To Date:</label>
            <input
              id="end-date-filter"
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <button
            onClick={handleClearFilters}
            className="clear-filters-button"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span className="error-icon">&#9888;&#65039;</span>
          {error}
        </div>
      )}
      
      {/* Events Grid */}
      {events.length === 0 && !loading ? (
        <div className="no-events">
          <div className="no-events-icon">&#128197;</div>
          <h3>No Events Found</h3>
          <p>
            {searchQuery || Object.values(filters).some(f => f)
              ? 'Try adjusting your search criteria or filters.'
              : 'No events are currently available.'}
          </p>
          {isAuthenticated && (
            <button
              onClick={() => navigate('/events/create')}
              className="create-event-button"
            >
              <span>&#127881;</span>
              Create Your First Event
            </button>
          )}
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <div
              key={event.id}
              className="event-card"
              onClick={() => handleEventClick(event.id)}
            >
              <div className="event-card-header">
                <h3 className="event-title">{event.title}</h3>
                <div className="event-type">
                  <span className={`type-badge ${event.is_virtual ? 'virtual' : 'in-person'}`}>
                    {event.is_virtual ? '&#128187; Virtual' : '&#128205; In-Person'}
                  </span>
                </div>
              </div>
              
              <div className="event-details">
                <div className="event-datetime">
                  <span className="detail-icon">&#128197;</span>
                  <span>{formatDate(event.start_datetime)}</span>
                </div>
                
                <div className="event-location">
                  <span className="detail-icon">{event.is_virtual ? '&#128187;' : '&#128205;'}</span>
                  <span>
                    {event.is_virtual 
                      ? event.venue 
                      : `${event.venue}${event.city ? `, ${event.city}` : ''}`
                    }
                  </span>
                </div>
              </div>
              
              <div className="event-description">
                <p>{event.description.length > 150 
                    ? `${event.description.substring(0, 150)}...` 
                    : event.description}
                </p>
              </div>
              
              <div className="event-card-footer">
                <div className="event-tags">
                  {event.is_virtual && (
                    <span className="event-tag virtual">&#128187; Virtual</span>
                  )}
                  {event.is_canceled && (
                    <span className="event-tag canceled">&#10060; Canceled</span>
                  )}
                </div>
                
                <button className="view-event-button">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            &#8592; Previous
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, current, and adjacent pages
                return page === 1 || 
                       page === totalPages || 
                       Math.abs(page - currentPage) <= 1;
              })
              .map((page, index, array) => {
                // Add ellipsis if there's a gap
                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                return (
                  <div key={page}>
                    {showEllipsis && <span className="pagination-ellipsis">...</span>}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next →
          </button>
        </div>
      )}
      
      {/* Loading indicator for pagination */}
      {loading && events.length > 0 && (
        <div className="pagination-loading">
          <div className="loading-spinner small"></div>
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
}

export default EventList;
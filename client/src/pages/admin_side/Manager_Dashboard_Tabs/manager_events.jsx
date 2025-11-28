import React, { useState, useEffect } from 'react';
import { eventApi } from '../../../lib/managerApi';
import Header from '../../../assets/header_after/header_after.jsx';
import '../manager_dashboard.css';
import './events_modal.css';

function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await eventApi.getAllEvents();
      console.log('Fetched events:', data);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      await eventApi.deleteEvent(eventId);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to delete event');
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="manager-dashboard" style={{ paddingTop: '100px', maxWidth: '1600px', width: '100%' }}>
          <div>Loading Events...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="manager-dashboard" style={{ paddingTop: '100px', maxWidth: '1600px', width: '100%' }}>
        <div className="events-tab">
          <div className="events-header">
            <h3>Event Management</h3>
            <div className="events-header-actions">
              <div className="view-toggle">
                <button 
                  className={viewMode === 'calendar' ? 'active' : ''}
                  onClick={() => setViewMode('calendar')}
                >
                  Calendar
                </button>
                <button 
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                >
                  List
                </button>
              </div>
              <button className="create-event-btn" onClick={() => setShowModal(true)}>
                Create New Event
              </button>
            </div>
          </div>
          
          {viewMode === 'calendar' ? (
            <CalendarView events={events} />
          ) : (
            <ListView 
              events={events} 
              onDelete={handleDelete}
              onEdit={(event) => {
                setEditingEvent(event);
                setShowEditModal(true);
              }}
            />
          )}
        </div>
      </div>

      {showModal && (
        <CreateEventModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchEvents();
          }}
        />
      )}

      {showEditModal && editingEvent && (
        <EditEventModal 
          event={editingEvent}
          onClose={() => {
            setShowEditModal(false);
            setEditingEvent(null);
          }} 
          onSuccess={() => {
            setShowEditModal(false);
            setEditingEvent(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}

// Calendar View Component
function CalendarView({ events }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInLastMonth = new Date(year, month, 0).getDate();
  
  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      // Handle both string and Date object formats
      let eventDate = event.date;
      if (eventDate instanceof Date) {
        eventDate = eventDate.toISOString().split('T')[0];
      } else if (typeof eventDate === 'string' && eventDate.includes('T')) {
        // Handle ISO date strings from database
        eventDate = eventDate.split('T')[0];
      }
      return eventDate === dateStr;
    });
  };
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, daysInLastMonth - i);
    calendarDays.push({ date, isCurrentMonth: false });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    calendarDays.push({ date, isCurrentMonth: true });
  }
  
  // Next month days to fill the calendar
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    calendarDays.push({ date, isCurrentMonth: false });
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  return (
    <>
      <div className="calendar-container">
        <div className="calendar-header">
          <button onClick={prevMonth} className="calendar-nav-btn">‹</button>
          <h2 className="calendar-month-year">{monthNames[month]} {year}</h2>
          <button onClick={nextMonth} className="calendar-nav-btn">›</button>
        </div>
        
        <div className="calendar-grid">
          <div className="calendar-weekdays">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          
          <div className="calendar-days">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dateStr = date.toISOString().split('T')[0];
              const today = new Date().toISOString().split('T')[0];
              const dayEvents = getEventsForDate(date);
              
              return (
                <div 
                  key={index} 
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${dateStr === today ? 'today' : ''}`}
                >
                  <div className="calendar-day-number">{date.getDate()}</div>
                  {dayEvents.length > 0 && (
                    <div className="calendar-events">
                      {dayEvents.map(event => (
                        <div 
                          key={event.id} 
                          className={`calendar-event ${event.urgency?.toLowerCase() || ''}`}
                          title={event.eventName}
                          onClick={() => setSelectedEvent(event)}
                        >
                          {event.eventName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Event Details</h2>
              <button className="modal-close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className="event-details-content">
              <div className="event-detail-row">
                <strong>Event Name:</strong>
                <span>{selectedEvent.eventName}</span>
              </div>
              {selectedEvent.description && (
                <div className="event-detail-row">
                  <strong>Description:</strong>
                  <span>{selectedEvent.description}</span>
                </div>
              )}
              <div className="event-detail-row">
                <strong>Date:</strong>
                <span>
                  {selectedEvent.date.includes('T') 
                    ? selectedEvent.date.split('T')[0] 
                    : selectedEvent.date}
                </span>
              </div>
              <div className="event-detail-row">
                <strong>Time:</strong>
                <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
              </div>
              <div className="event-detail-row">
                <strong>Location:</strong>
                <span>{selectedEvent.location}</span>
              </div>
              {selectedEvent.skills && (
                <div className="event-detail-row">
                  <strong>Required Skills:</strong>
                  <span>{typeof selectedEvent.skills === 'string' ? selectedEvent.skills : selectedEvent.skills.join(', ')}</span>
                </div>
              )}
              {selectedEvent.urgency && (
                <div className="event-detail-row">
                  <strong>Urgency:</strong>
                  <span className={`urgency ${selectedEvent.urgency.toLowerCase()}`}>
                    {selectedEvent.urgency}
                  </span>
                </div>
              )}
              <div className="event-detail-row">
                <strong>Volunteers Needed:</strong>
                <span>{selectedEvent.volunteerNeeded}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// List View Component
function ListView({ events, onDelete, onEdit }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString;
    }
  };

  // Format time to 12-hour format
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      // Handle time in HH:MM:SS or HH:MM format
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = minutes || '00';
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minute} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  // Filter events based on search query
  const filteredEvents = events.filter(event => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const eventName = (event.eventName || '').toLowerCase();
    const location = (event.location || '').toLowerCase();
    const dateStr = (event.date || '').toLowerCase();
    
    // Check event name
    if (eventName.includes(query)) return true;
    
    // Check location
    if (location.includes(query)) return true;
    
    // Check date
    if (dateStr.includes(query)) return true;
    
    // Check skills
    if (event.skills) {
      const skillsStr = Array.isArray(event.skills) 
        ? event.skills.join(' ').toLowerCase() 
        : event.skills.toLowerCase();
      if (skillsStr.includes(query)) return true;
    }
    
    return false;
  });

  return (
    <>
      {/* Search Bar */}
      <div className="event-search-bar-container">
        <div className="event-search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="event-search-input"
            placeholder="Search events by name, date, location, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            style={{
              color: '#2A3642',
              WebkitTextFillColor: '#2A3642',
              backgroundColor: 'white',
              opacity: 1,
              flex: 1
            }}
          />
          {searchQuery && (
            <button 
              className="event-search-clear-btn" 
              onClick={() => setSearchQuery('')}
              style={{
                flexShrink: 0,
                width: 'auto'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No events match your search.</p>
        </div>
      ) : (
        <div className="events-list">
          {filteredEvents.map(event => (
            <div key={event.id} className="event-card">
              <div className="event-header">
                <h4>{event.eventName}</h4>
                <span className={`urgency ${event.urgency?.toLowerCase() || ''}`}>
                  {event.urgency}
                </span>
              </div>
              <div className="event-details">
                <p><strong>Date:</strong> {formatDate(event.date)}</p>
                <p><strong>Time:</strong> {formatTime(event.startTime)} - {formatTime(event.endTime)}</p>
                <p><strong>Location:</strong> {event.location}</p>
                <p><strong>Skills Required:</strong> {Array.isArray(event.skills) ? event.skills.join(', ') : event.skills}</p>
              </div>
              <div className="event-actions">
                <button className="edit-btn" onClick={() => onEdit(event)}>Edit</button>
                <button className="delete-btn" onClick={() => onDelete(event.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Create Event Modal Component
function CreateEventModal({ onClose, onSuccess }) {
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState([]);
  const [urgency, setUrgency] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [volunteerNeeded, setVolunteerNeeded] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const allSkills = [
    "First Aid", "CPR", "Teaching", "Event Setup", "Food Service",
    "Crowd Control", "Logistics", "Cooking", "Cleaning", "Organizing"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!eventName || !location || !eventDate || !startTime || !endTime) {
      alert("Please fill out all required fields.");
      setSubmitting(false);
      return;
    }
    
    const formData = {
      event_name: eventName,
      event_description: eventDescription,
      location: location,
      required_skills: skills,
      urgency: urgency,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      volunteer_needed: volunteerNeeded
    };

    try {
      await eventApi.createEvent(formData);
      alert("Event created successfully!");
      onSuccess();
      
      // Reset form
      setEventName("");
      setEventDescription("");
      setLocation("");
      setSkills([]);
      setUrgency("");
      setEventDate("");
      setStartTime("");
      setEndTime("");
      setVolunteerNeeded(0);
    } catch (error) {
      console.error("Error creating event:", error);
      alert(`Failed to create event: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillChange = (e) => {
    const selectedSkill = e.target.value;
    if (selectedSkill && !skills.includes(selectedSkill)) {
      setSkills([...skills, selectedSkill]);
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Event</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <label>Event Name *</label>
            <input 
              type="text" 
              value={eventName} 
              onChange={(e) => setEventName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-row">
            <label>Event Description</label>
            <textarea 
              value={eventDescription} 
              onChange={(e) => setEventDescription(e.target.value)} 
            />
          </div>

          <div className="form-row">
            <label>Location *</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              required 
            />
          </div>

          <div className="form-row">
            <label>Required Skills</label>
            <select onChange={handleSkillChange} defaultValue="">
              <option value="">-- Select skills --</option>
              {allSkills.map((skill, i) => (
                <option key={i} value={skill}>{skill}</option>
              ))}
            </select>
            
            <div className="selected-skills">
              {skills.map((skill, index) => (
                <span key={index} className="skill-tag">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Urgency</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="">-- Select --</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="form-row">
            <label>Event Date *</label>
            <input 
              type="date" 
              value={eventDate} 
              onChange={(e) => setEventDate(e.target.value)} 
              required 
            />
          </div>

          <div className="form-row-group">
            <div className="form-row">
              <label>Start Time *</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
                required 
              />
            </div>

            <div className="form-row">
              <label>End Time *</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <label>Volunteers Needed</label>
            <input 
              type="number" 
              value={volunteerNeeded} 
              onChange={(e) => setVolunteerNeeded(parseInt(e.target.value) || 0)} 
              min="0"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Event Modal Component
function EditEventModal({ event, onClose, onSuccess }) {
  // Initialize form state with existing event data
  const [eventName, setEventName] = useState(event?.eventName || "");
  const [eventDescription, setEventDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [skills, setSkills] = useState(() => {
    if (!event?.skills) return [];
    if (Array.isArray(event.skills)) return event.skills;
    if (typeof event.skills === 'string') {
      return event.skills.split(',').map(s => s.trim()).filter(s => s);
    }
    return [];
  });
  const [urgency, setUrgency] = useState(event?.urgency ? event.urgency.charAt(0).toUpperCase() + event.urgency.slice(1).toLowerCase() : "");
  const [eventDate, setEventDate] = useState(() => {
    if (!event?.date) return "";
    // Handle ISO date strings
    if (event.date.includes('T')) {
      return event.date.split('T')[0];
    }
    return event.date;
  });
  const [startTime, setStartTime] = useState(event?.startTime || "");
  const [endTime, setEndTime] = useState(event?.endTime || "");
  const [volunteerNeeded, setVolunteerNeeded] = useState(event?.volunteerNeeded || 0);
  const [submitting, setSubmitting] = useState(false);

  const allSkills = [
    "First Aid", "CPR", "Teaching", "Event Setup", "Food Service",
    "Crowd Control", "Logistics", "Cooking", "Cleaning", "Organizing"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!eventName || !location || !eventDate || !startTime || !endTime) {
      alert("Please fill out all required fields.");
      setSubmitting(false);
      return;
    }
    
    const formData = {
      event_name: eventName,
      event_description: eventDescription,
      location: location,
      required_skills: skills,
      urgency: urgency,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      volunteer_needed: volunteerNeeded
    };

    try {
      await eventApi.updateEvent(event.id, formData);
      alert("Event updated successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error updating event:", error);
      alert(`Failed to update event: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillChange = (e) => {
    const selectedSkill = e.target.value;
    if (selectedSkill && !skills.includes(selectedSkill)) {
      setSkills([...skills, selectedSkill]);
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Event</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <label>Event Name *</label>
            <input 
              type="text" 
              value={eventName} 
              onChange={(e) => setEventName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-row">
            <label>Event Description</label>
            <textarea 
              value={eventDescription} 
              onChange={(e) => setEventDescription(e.target.value)} 
            />
          </div>

          <div className="form-row">
            <label>Location *</label>
            <input 
              type="text" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              required 
            />
          </div>

          <div className="form-row">
            <label>Required Skills</label>
            <select onChange={handleSkillChange} defaultValue="">
              <option value="">-- Select skills --</option>
              {allSkills.map((skill, i) => (
                <option key={i} value={skill}>{skill}</option>
              ))}
            </select>
            
            <div className="selected-skills">
              {skills.map((skill, index) => (
                <span key={index} className="skill-tag">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Urgency</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="">-- Select --</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="form-row">
            <label>Event Date *</label>
            <input 
              type="date" 
              value={eventDate} 
              onChange={(e) => setEventDate(e.target.value)} 
              required 
            />
          </div>

          <div className="form-row-group">
            <div className="form-row">
              <label>Start Time *</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
                required 
              />
            </div>

            <div className="form-row">
              <label>End Time *</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <label>Volunteers Needed</label>
            <input 
              type="number" 
              value={volunteerNeeded} 
              onChange={(e) => setVolunteerNeeded(parseInt(e.target.value) || 0)} 
              min="0"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventsTab;

import React, { useState, useEffect } from 'react';
import {matchingApi, eventApi} from '../../../lib/managerApi';
import Header from '../../../assets/header_after/header_after.jsx';
import '../manager_dashboard.css'
import './events_modal.css';

function MatchingTab() {
  const [matches, setMatches] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [generatedMatches, setGeneratedMatches] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Show 6 events per page

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reset to page 1 when events change
  useEffect(() => {
    setCurrentPage(1);
  }, [events.length]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [matchesData, eventsData] = await Promise.all([
        matchingApi.getAllMatches(),
        eventApi.getAllEvents()
      ]);
      setMatches(Array.isArray(matchesData) ? matchesData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setMatches([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const data = await matchingApi.getAllMatches();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setMatches([]);
    }
  };

  const handleGenerateMatches = async () => {
    if (!selectedEvent) {
      alert('Please select an event first');
      return;
    }

    setLoadingMatches(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';
      const token = localStorage.getItem('token');
      
      // Get event details
      const eventDetails = events.find(e => e.id === parseInt(selectedEvent));
      setSelectedEventDetails(eventDetails);
      
      const response = await fetch(`${API_BASE_URL}/volunteer-matching/generate/${selectedEvent}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to generate matches');
      
      const matchesData = await response.json();
      
      // Filter out volunteers who are already assigned to this event
      const existingAssignments = matches.filter(m => m.eventId === parseInt(selectedEvent));
      const existingVolunteerIds = existingAssignments.map(m => m.volunteerId);
      
      const filteredMatches = Array.isArray(matchesData) 
        ? matchesData.filter(match => !existingVolunteerIds.includes(match.volunteer.id))
        : [];
      
      setGeneratedMatches(filteredMatches);
      setShowGenerateModal(true);
      
      if (filteredMatches.length === 0 && matchesData.length > 0) {
        alert('All compatible volunteers are already assigned to this event.');
      }
    } catch (err) {
      console.error('Error generating matches:', err);
      alert('Failed to generate matches: ' + err.message);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleAssignMatch = async (volunteerId, eventId, matchScore) => {
    try {
      // Find the volunteer and event details for confirmation
      const match = generatedMatches.find(m => m.volunteer.id === volunteerId);
      const volunteerName = match ? `${match.volunteer.first_name} ${match.volunteer.last_name}` : 'this volunteer';
      const eventName = events.find(e => e.id === parseInt(eventId))?.name || 'this event';
      
      if (!window.confirm(`Are you sure you want to assign ${volunteerName} to "${eventName}"?\n\nMatch Score: ${matchScore}%`)) {
        return;
      }
      
      const notes = `Assigned through matching interface with ${matchScore}% match score`;
      const result = await matchingApi.assignVolunteer(volunteerId, eventId, notes);
      
      // Show detailed success message
      alert(
        `Volunteer Assigned Successfully!\n\n` +
        `Volunteer: ${volunteerName}\n` +
        `Event: ${eventName}\n` +
        `Match Score: ${matchScore}%\n` +
        `Status: assigned\n\n` +
        `This match has been recorded in the volunteer_matches table.`
      );
      
      setShowGenerateModal(false);
      setGeneratedMatches([]);
      setSelectedEvent(null);
      fetchMatches();
    } catch (err) {
      console.error('Error assigning match:', err);
      const errorMessage = err.message.includes('already assigned') 
        ? 'This volunteer is already assigned to this event.'
        : err.message;
      alert('Failed to assign volunteer: ' + errorMessage);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await matchingApi.updateMatchStatus(id, status);
      fetchMatches();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
          <div>Loading Matches...</div>
        </div>
      </div>
    );
  }

  // Filter events to show only upcoming ones
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));

  // Get assigned volunteer counts for each event
  const getAssignedVolunteers = (eventId) => {
    return matches.filter(m => m.eventId === eventId && m.status === 'assigned');
  };

  // Pagination logic
  const totalPages = Math.ceil(upcomingEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = upcomingEvents.slice(startIndex, endIndex);

  return (
    <div>
      <Header />
      <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
        <div className="matching-tab">
          <div style={{ marginBottom: '30px', marginTop: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ marginBottom: '10px', color: '#2A3642' }}>Volunteer Matching</h3>
                <p style={{ color: '#6A89A7', margin: '0', fontSize: '0.95em' }}>
                  Select an event to find matching volunteers based on skills, availability, and location
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {upcomingEvents.length > 0 && (
                  <div style={{ 
                    color: '#6A89A7', 
                    fontSize: '0.9em', 
                    fontWeight: '600',
                    background: '#F9FAFB',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    Showing {startIndex + 1}-{Math.min(endIndex, upcomingEvents.length)} of {upcomingEvents.length} events
                  </div>
                )}
                <button 
                  className="refresh-btn" 
                  onClick={fetchInitialData}
                  disabled={loading}
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h4 style={{ marginBottom: '10px', color: '#2A3642', fontSize: '1.3em' }}>No Upcoming Events</h4>
              <p style={{ color: '#39424e', maxWidth: '500px', margin: '0 auto' }}>
                Create events in the Events tab to start matching volunteers.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', 
              gap: '20px',
              marginBottom: '20px'
            }}>
              {paginatedEvents.map(event => {
                const assignedVolunteers = getAssignedVolunteers(event.id);
                const isSelected = selectedEvent === String(event.id);
                
                return (
                  <div 
                    key={event.id} 
                    style={{
                      background: isSelected ? '#F4EDE4' : 'white',
                      border: isSelected ? '3px solid #FFBB00' : '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(255, 187, 0, 0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
                      position: 'relative'
                    }}
                    onClick={() => setSelectedEvent(String(event.id))}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: '#FFBB00',
                        color: '#2A3642',
                        padding: '5px 12px',
                        borderRadius: '12px',
                        fontSize: '0.7em',
                        fontWeight: 'bold'
                      }}>
                        SELECTED
                      </div>
                    )}

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '6px' }}>
                        EVENT NAME
                      </div>
                      <h4 style={{ 
                        margin: '0', 
                        color: '#2A3642', 
                        fontSize: '1.3em',
                        fontWeight: 'bold',
                        paddingRight: isSelected ? '90px' : '0'
                      }}>
                        {event.name || 'Unnamed Event'}
                      </h4>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '4px' }}>
                          DATE
                        </div>
                        <div style={{ color: '#39424e', fontWeight: '600' }}>
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '4px' }}>
                          LOCATION
                        </div>
                        <div style={{ color: '#39424e' }}>{event.location || 'Location TBD'}</div>
                      </div>
                    </div>

                    {/* Required Skills Section - Prominent Display */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '0.75em', 
                        color: '#6A89A7', 
                        fontWeight: '600', 
                        marginBottom: '8px' 
                      }}>
                        <span>REQUIRED SKILLS</span>
                        <span style={{ 
                          fontSize: '0.9em', 
                          color: '#FFBB00',
                          background: '#FFF7E0',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontWeight: 'bold'
                        }}>
                          60% of match score
                        </span>
                      </div>
                      {event.required_skills ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {(typeof event.required_skills === 'string' 
                            ? event.required_skills.split(',') 
                            : Array.isArray(event.required_skills) 
                              ? event.required_skills 
                              : []
                          ).map((skill, idx) => (
                            <span key={idx} style={{
                              background: '#FFBB00',
                              color: '#2A3642',
                              padding: '6px 12px',
                              borderRadius: '12px',
                              fontSize: '0.85em',
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(255, 187, 0, 0.3)',
                              border: '1px solid #e6a600'
                            }}>
                              {typeof skill === 'string' ? skill.trim() : skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ 
                          color: '#95a5a6', 
                          fontSize: '0.85em',
                          fontStyle: 'italic',
                          padding: '8px',
                          background: isSelected ? 'white' : '#F9FAFB',
                          borderRadius: '8px'
                        }}>
                          No specific skills required
                        </div>
                      )}
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '10px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ 
                        background: isSelected ? 'white' : '#F9FAFB',
                        padding: '10px',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '4px' }}>
                          VOLUNTEERS NEEDED
                        </div>
                        <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: '#2A3642' }}>
                          {event.maxVolunteers || 'N/A'}
                        </div>
                      </div>

                      <div style={{ 
                        background: isSelected ? 'white' : '#F9FAFB',
                        padding: '10px',
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '4px' }}>
                          VOLUNTEERS ASSIGNED
                        </div>
                        <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: assignedVolunteers.length > 0 ? '#10b981' : '#95a5a6' }}>
                          {assignedVolunteers.length}
                        </div>
                      </div>
                    </div>

                    {/* Urgency Badge */}
                    {event.urgency && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '6px' }}>
                          URGENCY LEVEL
                        </div>
                        <span style={{ 
                          padding: '6px 14px', 
                          borderRadius: '12px', 
                          fontSize: '0.8em', 
                          fontWeight: 'bold',
                          display: 'inline-block',
                          background: event.urgency === 'high' ? '#FFE5E8' : 
                                     event.urgency === 'medium' ? '#FFF7E0' : '#E0F2FE',
                          color: event.urgency === 'high' ? '#B91C1C' : 
                                 event.urgency === 'medium' ? '#B7791F' : '#155724'
                        }}>
                          {(event.urgency || 'low').toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Event Description */}
                    {event.description && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '6px' }}>
                          DESCRIPTION
                        </div>
                        <div style={{ 
                          padding: '12px', 
                          background: isSelected ? 'white' : '#F9FAFB',
                          borderRadius: '8px',
                          fontSize: '0.85em',
                          color: '#39424e',
                          lineHeight: '1.5',
                          border: '1px solid #e5e7eb'
                        }}>
                          {event.description}
                        </div>
                      </div>
                    )}

                    {assignedVolunteers.length > 0 && (
                      <div style={{ 
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '2px solid ' + (isSelected ? '#ddd' : '#e5e7eb')
                      }}>
                        <div style={{ fontSize: '0.75em', color: '#6A89A7', fontWeight: '600', marginBottom: '10px' }}>
                          ASSIGNED VOLUNTEERS ({assignedVolunteers.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {assignedVolunteers.map(match => (
                            <div key={match.id} style={{
                              background: isSelected ? 'white' : '#F9FAFB',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              fontSize: '0.85em',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <strong style={{ color: '#2A3642' }}>{match.volunteer?.name}</strong>
                                <span style={{ color: '#6A89A7', marginLeft: '8px' }}>• {match.status}</span>
                              </div>
                              <span style={{ 
                                color: '#10b981', 
                                fontWeight: 'bold',
                                background: '#D1FAE5',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                fontSize: '0.9em'
                              }}>
                                {match.matchScore}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(String(event.id));
                        handleGenerateMatches();
                      }}
                      disabled={loadingMatches && selectedEvent === String(event.id)}
                      style={{
                        width: '100%',
                        marginTop: '15px',
                        padding: '12px 24px',
                        background: '#FFBB00',
                        color: '#2A3642',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(255, 187, 0, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#e6a600';
                        e.target.style.color = '#fff';
                        e.target.style.boxShadow = '0 4px 12px rgba(255, 187, 0, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#FFBB00';
                        e.target.style.color = '#2A3642';
                        e.target.style.boxShadow = '0 2px 8px rgba(255, 187, 0, 0.3)';
                      }}
                    >
                      {loadingMatches && selectedEvent === String(event.id) ? 'Generating...' : 'Find Matching Volunteers'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              marginTop: '30px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '10px 20px',
                  background: currentPage === 1 ? '#bdc3c7' : '#6A89A7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  boxShadow: currentPage === 1 ? 'none' : '0 3px 10px rgba(106, 137, 167, 0.3)'
                }}
                onMouseOver={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#2A3642';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 5px 15px rgba(42, 54, 66, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.background = '#6A89A7';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(106, 137, 167, 0.3)';
                  }
                }}
              >
                Previous
              </button>

              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = pageNum === 1 || 
                                   pageNum === totalPages || 
                                   Math.abs(pageNum - currentPage) <= 1;
                  
                  const showEllipsis = (pageNum === 2 && currentPage > 3) || 
                                       (pageNum === totalPages - 1 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return <span key={`ellipsis-${pageNum}`} style={{ color: '#666', padding: '0 5px' }}>...</span>;
                  }

                  if (!showPage && pageNum !== 2 && pageNum !== totalPages - 1) {
                    return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: '10px 16px',
                        background: currentPage === pageNum ? '#FFBB00' : 'white',
                        color: currentPage === pageNum ? '#2A3642' : '#6A89A7',
                        border: currentPage === pageNum ? '2px solid #FFBB00' : '2px solid #e5e7eb',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: currentPage === pageNum ? 'bold' : '600',
                        transition: 'all 0.3s',
                        minWidth: '45px',
                        boxShadow: currentPage === pageNum ? '0 3px 10px rgba(255, 187, 0, 0.3)' : 'none'
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.background = '#F4EDE4';
                          e.currentTarget.style.borderColor = '#6A89A7';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== pageNum) {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '10px 20px',
                  background: currentPage === totalPages ? '#bdc3c7' : '#6A89A7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s',
                  boxShadow: currentPage === totalPages ? 'none' : '0 3px 10px rgba(106, 137, 167, 0.3)'
                }}
                onMouseOver={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#2A3642';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 5px 15px rgba(42, 54, 66, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.background = '#6A89A7';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 10px rgba(106, 137, 167, 0.3)';
                  }
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Matches Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
            <div className="modal-header">
              <div style={{ flex: 1 }}>
                <h2>Volunteer Matches</h2>
                {selectedEventDetails && (
                  <p>{selectedEventDetails.name}</p>
                )}
              </div>
              <button className="modal-close-btn" onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            
            {/* Event Details Section */}
            {selectedEventDetails && (
              <div className="event-details-content" style={{ 
                padding: '25px 30px', 
                background: '#F4EDE4', 
                borderBottom: '3px solid #FFBB00'
              }}>
                <div className="event-detail-row">
                  <strong>Date</strong>
                  <span>{new Date(selectedEventDetails.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>

                <div className="event-detail-row">
                  <strong>Location</strong>
                  <span>{selectedEventDetails.location || 'N/A'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div className="event-detail-row" style={{ marginBottom: 0 }}>
                    <strong>Volunteers Needed</strong>
                    <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#6A89A7' }}>
                      {selectedEventDetails.maxVolunteers || 'N/A'}
                    </span>
                  </div>

                  <div className="event-detail-row" style={{ marginBottom: 0 }}>
                    <strong>Urgency Level</strong>
                    <span style={{ 
                      padding: '6px 14px', 
                      borderRadius: '12px', 
                      fontSize: '0.85em', 
                      fontWeight: 'bold',
                      display: 'inline-block',
                      marginTop: '5px',
                      background: selectedEventDetails.urgency === 'high' ? '#FFE5E8' : 
                                 selectedEventDetails.urgency === 'medium' ? '#FFF7E0' : '#E0F2FE',
                      color: selectedEventDetails.urgency === 'high' ? '#B91C1C' : 
                             selectedEventDetails.urgency === 'medium' ? '#B7791F' : '#155724'
                    }}>
                      {(selectedEventDetails.urgency || 'low').toUpperCase()}
                    </span>
                  </div>
                </div>

                {selectedEventDetails.required_skills && (
                  <div className="event-detail-row">
                    <strong>Required Skills</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {(typeof selectedEventDetails.required_skills === 'string'
                        ? selectedEventDetails.required_skills.split(',')
                        : Array.isArray(selectedEventDetails.required_skills)
                          ? selectedEventDetails.required_skills
                          : []
                      ).map((skill, idx) => (
                        <span key={idx} className="skill-tag" style={{
                          background: 'linear-gradient(135deg, #FFBB00 0%, #e6a600 100%)',
                          color: '#2A3642',
                          padding: '6px 14px',
                          borderRadius: '12px',
                          fontSize: '0.85em',
                          fontWeight: 'bold',
                          border: 'none'
                        }}>
                          {typeof skill === 'string' ? skill.trim() : skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEventDetails.description && (
                  <div className="event-detail-row">
                    <strong>Description</strong>
                    <span style={{ lineHeight: '1.6' }}>{selectedEventDetails.description}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="event-details-content" style={{ padding: '30px', maxHeight: '60vh', overflowY: 'auto' }}>
              {generatedMatches.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '50px 30px', 
                  background: 'linear-gradient(135deg, #F4EDE4 0%, #fff 100%)', 
                  borderRadius: '15px',
                  border: '2px dashed #6A89A7'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '15px' }}>🔍</div>
                  <p style={{ color: '#2A3642', fontSize: '1.2em', fontWeight: 700, marginBottom: '12px' }}>
                    No Suitable Matches Found
                  </p>
                  <p style={{ fontSize: '0.95em', color: '#6A89A7', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                    Volunteers need at least a 50% match score based on skills, availability, and preferences. Try adjusting the event requirements or check back later for new volunteers.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    marginBottom: '25px', 
                    padding: '20px 25px', 
                    background: 'linear-gradient(135deg, #FFF7E0 0%, #FFFBEB 100%)', 
                    borderRadius: '12px',
                    border: '2px solid #FFBB00',
                    boxShadow: '0 3px 10px rgba(255, 187, 0, 0.15)'
                  }}>
                    <p style={{ margin: '0 0 12px 0', color: '#2A3642', fontWeight: 'bold', fontSize: '1.1em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        background: '#FFBB00', 
                        color: '#2A3642', 
                        padding: '4px 12px', 
                        borderRadius: '20px',
                        fontSize: '0.9em',
                        fontWeight: 'bold'
                      }}>
                        {generatedMatches.length}
                      </span>
                      Compatible Volunteer{generatedMatches.length !== 1 ? 's' : ''} Found
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9em', color: '#39424e', lineHeight: '1.5' }}>
                      Matches are scored based on: <strong>Skills (60%)</strong>, <strong>Availability (25%)</strong>, <strong>Location (10%)</strong>, and <strong>Preferences (5%)</strong>.
                    </p>
                  </div>
                  {generatedMatches.map((match, index) => (
                    <div key={index} className="event-detail-row" style={{
                      border: match.matchScore >= 80 ? '3px solid #FFBB00' : '2px solid #e5e7eb',
                      borderLeft: match.matchScore >= 80 ? '6px solid #FFBB00' : '6px solid #6A89A7',
                      borderRadius: '12px',
                      padding: '25px',
                      marginBottom: '20px',
                      background: match.matchScore >= 80 
                        ? 'linear-gradient(135deg, #FFF7E0 0%, white 100%)' 
                        : 'white',
                      position: 'relative',
                      boxShadow: match.matchScore >= 80 
                        ? '0 6px 20px rgba(255, 187, 0, 0.25)' 
                        : '0 3px 10px rgba(106, 137, 167, 0.1)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = match.matchScore >= 80 
                        ? '0 10px 30px rgba(255, 187, 0, 0.35)' 
                        : '0 8px 20px rgba(106, 137, 167, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = match.matchScore >= 80 
                        ? '0 6px 20px rgba(255, 187, 0, 0.25)' 
                        : '0 3px 10px rgba(106, 137, 167, 0.1)';
                    }}
                    >
                      {match.matchScore >= 80 && (
                        <div style={{
                          position: 'absolute',
                          top: '20px',
                          right: '20px',
                          background: 'linear-gradient(135deg, #FFBB00 0%, #e6a600 100%)',
                          color: '#2A3642',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '0.75em',
                          fontWeight: 'bold',
                          boxShadow: '0 3px 10px rgba(255, 187, 0, 0.4)',
                          letterSpacing: '0.5px',
                          border: '2px solid rgba(255, 255, 255, 0.5)'
                        }}>
                          ⭐ TOP MATCH
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'inline-block',
                            background: '#6A89A7',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.75em',
                            fontWeight: 'bold',
                            marginBottom: '10px'
                          }}>
                            #{index + 1}
                          </div>
                          <h4 style={{ 
                            margin: '0 0 12px 0', 
                            color: '#2A3642',
                            fontSize: '1.3em',
                            fontWeight: 'bold',
                            letterSpacing: '-0.3px'
                          }}>
                            {match.volunteer?.first_name} {match.volunteer?.last_name}
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '0.9em', color: '#6A89A7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong>Email:</strong> <span style={{ color: '#2A3642' }}>{match.volunteer?.email}</span>
                            </div>
                            <div style={{ fontSize: '0.9em', color: '#6A89A7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong>Location:</strong> <span style={{ color: '#2A3642' }}>{match.volunteer?.city || 'N/A'}, {match.volunteer?.state_code || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ 
                          textAlign: 'center',
                          background: match.matchScore >= 80 ? 'linear-gradient(135deg, #FFBB00 0%, #e6a600 100%)' : 
                                     match.matchScore >= 60 ? 'linear-gradient(135deg, #6A89A7 0%, #2A3642 100%)' : 
                                     '#95a5a6',
                          color: 'white',
                          padding: '15px 20px',
                          borderRadius: '15px',
                          minWidth: '120px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                          <div style={{ 
                            fontSize: '2.2em', 
                            fontWeight: 'bold',
                            marginBottom: '5px',
                            lineHeight: '1'
                          }}>
                            {match.matchScore}%
                          </div>
                          <div style={{ 
                            fontSize: '0.75em', 
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            opacity: 0.95
                          }}>
                            Match Score
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        marginBottom: '18px',
                        padding: '15px',
                        background: 'rgba(106, 137, 167, 0.05)',
                        borderRadius: '10px',
                        border: '1px solid rgba(106, 137, 167, 0.1)'
                      }}>
                        <strong style={{ 
                          display: 'block', 
                          marginBottom: '10px', 
                          color: '#2A3642',
                          fontSize: '0.85em',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: 800
                        }}>
                          Volunteer Skills
                        </strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {match.volunteer?.skills?.length > 0 ? (
                            match.volunteer.skills.map((skill, idx) => (
                              <span key={idx} className="skill-tag" style={{
                                background: 'linear-gradient(135deg, #6A89A7 0%, #2A3642 100%)',
                                color: 'white',
                                padding: '7px 14px',
                                borderRadius: '12px',
                                fontSize: '0.85em',
                                fontWeight: 700,
                                boxShadow: '0 3px 8px rgba(106, 137, 167, 0.35)',
                                border: 'none'
                              }}>
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#95a5a6', fontSize: '0.9em', fontStyle: 'italic' }}>No skills listed</span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ 
                        marginBottom: '20px',
                        padding: '15px',
                        background: 'rgba(255, 187, 0, 0.05)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 187, 0, 0.2)'
                      }}>
                        <strong style={{ 
                          display: 'block', 
                          marginBottom: '10px', 
                          color: '#2A3642',
                          fontSize: '0.85em',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: 800
                        }}>
                          Availability
                        </strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {match.volunteer?.availability?.length > 0 ? (
                            match.volunteer.availability.map((date, idx) => {
                              const isEventDate = new Date(date).toDateString() === new Date(match.event.date).toDateString();
                              return (
                                <span key={idx} style={{
                                  background: isEventDate 
                                    ? 'linear-gradient(135deg, #FFBB00 0%, #e6a600 100%)' 
                                    : '#bdc3c7',
                                  color: isEventDate ? '#2A3642' : 'white',
                                  padding: '7px 14px',
                                  borderRadius: '12px',
                                  fontSize: '0.85em',
                                  fontWeight: isEventDate ? 'bold' : '600',
                                  boxShadow: isEventDate 
                                    ? '0 3px 8px rgba(255, 187, 0, 0.35)' 
                                    : '0 2px 4px rgba(0,0,0,0.1)',
                                  border: isEventDate ? '2px solid rgba(255, 255, 255, 0.5)' : 'none',
                                  position: 'relative'
                                }}>
                                  {isEventDate && (
                                    <span style={{ marginRight: '5px' }}>✓</span>
                                  )}
                                  {new Date(date).toLocaleDateString()}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: '#95a5a6', fontSize: '0.9em', fontStyle: 'italic' }}>No availability listed</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAssignMatch(match.volunteer.id, match.event.id, match.matchScore)}
                        className="submit-btn"
                        style={{
                          width: '100%',
                          padding: '16px 24px',
                          background: 'linear-gradient(135deg, #FFBB00 0%, #e6a600 100%)',
                          color: '#2A3642',
                          border: '2px solid transparent',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: '700',
                          boxShadow: '0 4px 12px rgba(255, 187, 0, 0.3)',
                          transition: 'all 0.3s ease',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #6A89A7 0%, #2A3642 100%)';
                          e.target.style.color = 'white';
                          e.target.style.transform = 'translateY(-3px)';
                          e.target.style.boxShadow = '0 6px 20px rgba(106, 137, 167, 0.45)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'linear-gradient(135deg, #FFBB00 0%, #e6a600 100%)';
                          e.target.style.color = '#2A3642';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(255, 187, 0, 0.3)';
                        }}
                      >
                        ✓ Assign Volunteer to Event
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => {
                setShowGenerateModal(false);
                setGeneratedMatches([]);
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchingTab;
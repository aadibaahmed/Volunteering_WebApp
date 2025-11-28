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

  useEffect(() => {
    fetchInitialData();
  }, []);

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

  return (
    <div>
      <Header />
      <div className="manager-dashboard" style={{ paddingTop: '100px' }}>
        <div className="matching-tab">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h3>Volunteer Matching</h3>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <select
                value={selectedEvent || ''}
                onChange={(e) => setSelectedEvent(e.target.value)}
                style={{ 
                  padding: '10px 15px', 
                  borderRadius: '5px', 
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  minWidth: '300px'
                }}
              >
                <option value="">-- Select Event to Match --</option>
                {events.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0))).map(event => {
                  const assignedCount = matches.filter(m => m.eventId === event.id && m.status === 'assigned').length;
                  return (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString()} ({assignedCount} assigned)
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleGenerateMatches}
                disabled={!selectedEvent || loadingMatches}
                style={{
                  padding: '12px 24px',
                  background: selectedEvent ? '#FFBB00' : '#95a5a6',
                  color: selectedEvent ? '#2A3642' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedEvent ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: selectedEvent ? '0 2px 8px rgba(255, 187, 0, 0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (selectedEvent) {
                    e.target.style.background = '#e6a600';
                    e.target.style.color = '#fff';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 187, 0, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedEvent) {
                    e.target.style.background = '#FFBB00';
                    e.target.style.color = '#2A3642';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(255, 187, 0, 0.3)';
                  }
                }}
              >
                {loadingMatches ? 'Generating...' : 'Find Matches'}
              </button>
            </div>
          </div>

          {selectedEvent && matches.filter(m => m.eventId === parseInt(selectedEvent)).length > 0 && (
            <div style={{ 
              marginBottom: '25px', 
              padding: '20px', 
              background: '#F4EDE4', 
              borderRadius: '10px',
              border: '2px solid #6A89A7'
            }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#2A3642', fontSize: '1.1em' }}>
                Currently Assigned Volunteers ({matches.filter(m => m.eventId === parseInt(selectedEvent)).length})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {matches.filter(m => m.eventId === parseInt(selectedEvent)).map(match => (
                  <div key={match.id} style={{
                    background: 'white',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #6A89A7',
                    fontSize: '0.9em',
                    boxShadow: '0 2px 4px rgba(106, 137, 167, 0.15)'
                  }}>
                    <strong style={{ color: '#2A3642' }}>{match.volunteer?.name}</strong>
                    <span style={{ color: '#6A89A7', marginLeft: '8px' }}>• {match.status}</span>
                    <span style={{ color: '#39424e', marginLeft: '8px' }}>({match.matchScore}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h4 style={{ marginBottom: '10px', color: '#2A3642', fontSize: '1.3em' }}>No Matches Yet</h4>
              <p style={{ color: '#39424e', maxWidth: '500px', margin: '0 auto' }}>
                Select an event above and click "Find Matches" to generate volunteer matches based on skills, availability, and preferences.
              </p>
            </div>
          ) : (
            <div className="matches-list">
              {matches.map(match => (
                <div key={match.id} className="match-card">
                  <div className="match-info">
                    <div className="volunteer-info">
                      <h4>{match.volunteer?.name || 'Unknown Volunteer'}</h4>
                      <p>Skills: {match.volunteer?.skills?.join(', ') || 'N/A'}</p>
                    </div>
                    <div className="event-info">
                      <h4>{match.event?.name || 'Unknown Event'}</h4>
                      <p>Date: {match.event?.date ? new Date(match.event.date).toLocaleDateString() : 'N/A'}</p>
                      <p>Location: {match.event?.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="match-details">
                    <div className="match-score">
                      <span className="label">Match Score:</span>
                      <span className={`value score-${match.matchScore >= 80 ? 'high' : match.matchScore >= 60 ? 'medium' : 'low'}`}>
                        {match.matchScore}%
                      </span>
                    </div>
                    <div className="match-status">
                      <span className="label">Status:</span>
                      <span className={`status ${match.status}`}>{match.status}</span>
                    </div>
                    {match.notes && (
                      <div className="match-notes">
                        <span className="label">Notes:</span>
                        <span className="value">{match.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="match-actions">
                    <select 
                      value={match.status} 
                      onChange={(e) => handleStatusUpdate(match.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate Matches Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '950px' }}>
            <div className="modal-header">
              <div style={{ flex: 1 }}>
                <h2 style={{ color: '#2A3642' }}>Volunteer Matches</h2>
                {selectedEventDetails && (
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.95em', color: '#6A89A7', fontWeight: 600 }}>
                    {selectedEventDetails.name}
                  </p>
                )}
              </div>
              <button className="modal-close-btn" onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            
            {/* Event Details Section */}
            {selectedEventDetails && (
              <div style={{ 
                padding: '20px', 
                background: '#F4EDE4', 
                borderBottom: '2px solid #6A89A7',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                <div>
                  <strong style={{ color: '#2A3642', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>Date</strong>
                  <span style={{ color: '#39424e' }}>{new Date(selectedEventDetails.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div>
                  <strong style={{ color: '#2A3642', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>Location</strong>
                  <span style={{ color: '#39424e' }}>{selectedEventDetails.location || 'N/A'}</span>
                </div>
                <div>
                  <strong style={{ color: '#2A3642', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>Volunteers Needed</strong>
                  <span style={{ color: '#39424e' }}>{selectedEventDetails.maxVolunteers || 'N/A'}</span>
                </div>
                <div>
                  <strong style={{ color: '#2A3642', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>Urgency</strong>
                  <span style={{ 
                    padding: '3px 10px', 
                    borderRadius: '12px', 
                    fontSize: '0.75em', 
                    fontWeight: 'bold',
                    background: selectedEventDetails.urgency === 'high' ? '#FFE5E8' : 
                               selectedEventDetails.urgency === 'medium' ? '#FFF7E0' : '#E0F2FE',
                    color: selectedEventDetails.urgency === 'high' ? '#B91C1C' : 
                           selectedEventDetails.urgency === 'medium' ? '#B7791F' : '#155724'
                  }}>
                    {(selectedEventDetails.urgency || 'low').toUpperCase()}
                  </span>
                </div>
                {selectedEventDetails.required_skills && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong style={{ color: '#2A3642', fontSize: '0.85em', display: 'block', marginBottom: '8px' }}>Required Skills</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedEventDetails.required_skills.split(',').map((skill, idx) => (
                        <span key={idx} style={{
                          background: '#6A89A7',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.85em',
                          fontWeight: 600
                        }}>
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedEventDetails.description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong style={{ color: '#2A3642', fontSize: '0.85em', display: 'block', marginBottom: '5px' }}>Description</strong>
                    <span style={{ color: '#39424e', fontSize: '0.9em' }}>{selectedEventDetails.description}</span>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              {generatedMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#F4EDE4', borderRadius: '10px' }}>
                  <p style={{ color: '#2A3642', fontSize: '1.1em', fontWeight: 600, marginBottom: '10px' }}>
                    No suitable matches found for this event.
                  </p>
                  <p style={{ fontSize: '0.9em', color: '#39424e' }}>
                    Volunteers need at least a 50% match score based on skills, availability, and preferences.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    marginBottom: '25px', 
                    padding: '18px', 
                    background: '#FFF7E0', 
                    borderRadius: '8px',
                    border: '2px solid #FFBB00'
                  }}>
                    <p style={{ margin: '0 0 10px 0', color: '#2A3642', fontWeight: 'bold', fontSize: '1.05em' }}>
                      {generatedMatches.length} Compatible Volunteer{generatedMatches.length !== 1 ? 's' : ''} Found
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9em', color: '#39424e' }}>
                      Matches are scored based on: <strong>Skills (60%)</strong>, <strong>Availability (25%)</strong>, <strong>Location (10%)</strong>, and <strong>Preferences (5%)</strong>.
                      Click "Assign Volunteer to Event" to add them to the volunteer_matches table.
                    </p>
                  </div>
                  {generatedMatches.map((match, index) => (
                    <div key={index} style={{
                      border: match.matchScore >= 80 ? '2px solid #6A89A7' : '1px solid #ddd',
                      borderRadius: '10px',
                      padding: '20px',
                      marginBottom: '15px',
                      background: match.matchScore >= 80 ? '#F4EDE4' : 'white',
                      position: 'relative',
                      boxShadow: match.matchScore >= 80 ? '0 4px 12px rgba(106, 137, 167, 0.2)' : '0 2px 6px rgba(0,0,0,0.05)'
                    }}>
                      {match.matchScore >= 80 && (
                        <div style={{
                          position: 'absolute',
                          top: '15px',
                          right: '15px',
                          background: '#FFBB00',
                          color: '#2A3642',
                          padding: '6px 14px',
                          borderRadius: '12px',
                          fontSize: '0.75em',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 6px rgba(255, 187, 0, 0.3)'
                        }}>
                          TOP MATCH
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 10px 0', color: '#2A3642' }}>
                            #{index + 1} {match.volunteer?.first_name} {match.volunteer?.last_name}
                          </h4>
                          <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#39424e' }}>
                            Email: {match.volunteer?.email}
                          </p>
                          <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#39424e' }}>
                            Location: {match.volunteer?.city || 'N/A'}, {match.volunteer?.state_code || 'N/A'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            fontSize: '28px', 
                            fontWeight: 'bold',
                            marginBottom: '5px',
                            color: match.matchScore >= 80 ? '#FFBB00' : match.matchScore >= 60 ? '#6A89A7' : '#95a5a6'
                          }}>
                            {match.matchScore}%
                          </div>
                          <div style={{ fontSize: '0.85em', color: '#6A89A7', fontWeight: 600 }}>Match</div>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <strong style={{ display: 'block', marginBottom: '8px', color: '#2A3642' }}>Skills:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {match.volunteer?.skills?.length > 0 ? (
                            match.volunteer.skills.map((skill, idx) => (
                              <span key={idx} style={{
                                background: '#6A89A7',
                                color: 'white',
                                padding: '5px 12px',
                                borderRadius: '12px',
                                fontSize: '0.85em',
                                fontWeight: 600,
                                boxShadow: '0 2px 4px rgba(106, 137, 167, 0.3)'
                              }}>
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#95a5a6', fontSize: '0.9em' }}>No skills listed</span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <strong style={{ display: 'block', marginBottom: '8px', color: '#2A3642' }}>Availability:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {match.volunteer?.availability?.length > 0 ? (
                            match.volunteer.availability.map((date, idx) => {
                              const isEventDate = new Date(date).toDateString() === new Date(match.event.date).toDateString();
                              return (
                                <span key={idx} style={{
                                  background: isEventDate ? '#FFBB00' : '#95a5a6',
                                  color: isEventDate ? '#2A3642' : 'white',
                                  padding: '5px 12px',
                                  borderRadius: '12px',
                                  fontSize: '0.85em',
                                  fontWeight: isEventDate ? 'bold' : '600',
                                  boxShadow: isEventDate ? '0 2px 4px rgba(255, 187, 0, 0.3)' : 'none'
                                }}>
                                  {new Date(date).toLocaleDateString()}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: '#95a5a6', fontSize: '0.9em' }}>No availability listed</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAssignMatch(match.volunteer.id, match.event.id, match.matchScore)}
                        className="assign-volunteer-btn"
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: '#6A89A7',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(106, 137, 167, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#2A3642';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(106, 137, 167, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#6A89A7';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(106, 137, 167, 0.3)';
                        }}
                      >
                        Assign Volunteer to Event
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
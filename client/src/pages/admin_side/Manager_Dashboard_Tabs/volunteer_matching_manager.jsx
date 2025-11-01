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
      
      const response = await fetch(`${API_BASE_URL}/volunteer-matching/generate/${selectedEvent}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to generate matches');
      
      const matchesData = await response.json();
      setGeneratedMatches(Array.isArray(matchesData) ? matchesData : []);
      setShowGenerateModal(true);
    } catch (err) {
      console.error('Error generating matches:', err);
      alert('Failed to generate matches: ' + err.message);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleAssignMatch = async (volunteerId, eventId) => {
    try {
      await matchingApi.assignVolunteer(volunteerId, eventId, 'Assigned through matching interface');
      alert('Volunteer assigned successfully!');
      setShowGenerateModal(false);
      setGeneratedMatches([]);
      fetchMatches();
    } catch (err) {
      console.error('Error assigning match:', err);
      alert('Failed to assign volunteer: ' + err.message);
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
                  minWidth: '250px'
                }}
              >
                <option value="">-- Select Event to Match --</option>
                {events.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0))).map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {new Date(event.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateMatches}
                disabled={!selectedEvent || loadingMatches}
                style={{
                  padding: '10px 20px',
                  background: selectedEvent ? '#27ae60' : '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: selectedEvent ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {loadingMatches ? 'Generating...' : 'Find Matches'}
              </button>
            </div>
          </div>

          {matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7f8c8d' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
              <h4 style={{ marginBottom: '10px', color: '#2c3e50' }}>No Matches Yet</h4>
              <p>Select an event above and click "Find Matches" to generate volunteer matches based on skills, availability, and preferences.</p>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2>Generated Matches</h2>
              <button className="modal-close-btn" onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              {generatedMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                  <p>No suitable matches found for this event.</p>
                  <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
                    Volunteers need at least a 50% match score based on skills, availability, and preferences.
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ marginBottom: '20px', color: '#2c3e50' }}>
                    <strong>Top {generatedMatches.length} volunteer matches:</strong>
                  </p>
                  {generatedMatches.map((match, index) => (
                    <div key={index} style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '15px',
                      background: index < 3 ? '#f8f9fa' : 'white'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
                            #{index + 1} {match.volunteer?.first_name} {match.volunteer?.last_name}
                          </h4>
                          <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#34495e' }}>
                            Email: {match.volunteer?.email}
                          </p>
                          <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#34495e' }}>
                            Location: {match.volunteer?.city || 'N/A'}, {match.volunteer?.state_code || 'N/A'}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className={`score-${match.matchScore >= 80 ? 'high' : match.matchScore >= 60 ? 'medium' : 'low'}`}
                               style={{ 
                                 fontSize: '24px', 
                                 fontWeight: 'bold',
                                 marginBottom: '5px'
                               }}>
                            {match.matchScore}%
                          </div>
                          <div style={{ fontSize: '0.85em', color: '#7f8c8d' }}>Match</div>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <strong style={{ display: 'block', marginBottom: '8px', color: '#2c3e50' }}>Skills:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {match.volunteer?.skills?.length > 0 ? (
                            match.volunteer.skills.map((skill, idx) => (
                              <span key={idx} style={{
                                background: '#3498db',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.85em'
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
                        <strong style={{ display: 'block', marginBottom: '8px', color: '#2c3e50' }}>Availability:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {match.volunteer?.availability?.length > 0 ? (
                            match.volunteer.availability.map((date, idx) => (
                              <span key={idx} style={{
                                background: '#27ae60',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.85em'
                              }}>
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#95a5a6', fontSize: '0.9em' }}>No availability listed</span>
                          )}
                        </div>
                      </div>

                      {index < 3 && (
                        <button
                          onClick={() => handleAssignMatch(match.volunteer.id, match.event.id)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          Assign Volunteer to Event
                        </button>
                      )}
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
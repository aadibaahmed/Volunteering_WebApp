import React, { useState, useEffect } from 'react';
import {matchingApi} from '../../../lib/managerApi';
import Header from '../../../assets/header_after/header_after.jsx';
import '../manager_dashboard.css'

function MatchingTab() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await matchingApi.getAllMatches();
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await matchingApi.updateMatchStatus(id, status);
      fetchMatches();
    } catch (err) {
      console.error(err);
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
          <h3>Volunteer Matching</h3>
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
                    <p>Date: {match.event?.date || 'N/A'}</p>
                    <p>Location: {match.event?.location || 'N/A'}</p>
                  </div>
                </div>
                <div className="match-details">
                  <div className="match-score">
                    <span className="label">Match Score:</span>
                    <span className="value">{match.matchScore}%</span>
                  </div>
                  <div className="match-status">
                    <span className="label">Status:</span>
                    <span className={`status ${match.status}`}>{match.status}</span>
                  </div>
                  <div className="match-notes">
                    <span className="label">Notes:</span>
                    <span className="value">{match.notes || 'No notes'}</span>
                  </div>
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
        </div>
      </div>
    </div>
  );
}

export default MatchingTab;

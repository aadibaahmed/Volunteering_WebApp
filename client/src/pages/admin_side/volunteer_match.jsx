import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import './volunteer_match.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

const MOCK_VOLUNTEERS = [
  {
    id: 1, name: 'Jessica Nguyen', email: 'jessica@example.com',
    skills: ['CPR','Logistics','Spanish'],
    availability: ['2025-09-18','2025-09-20','2025-09-26'],
    city: 'Houston', state_code: 'TX'
  },
  {
    id: 2, name: 'Alex Chen', email: 'alex@example.com',
    skills: ['Event Setup','Food Service'],
    availability: ['2025-09-18','2025-09-21'],
    city: 'Austin', state_code: 'TX'
  }
];

const MOCK_EVENTS = [
  {
    id: 101, name: 'Food Bank Saturday',
    description: 'Sort and pack donations.',
    location: 'Houston, TX',
    required_skills: ['Food Service','Logistics'],
    urgency: 'Medium',
    date: '2025-09-20'
  },
  {
    id: 102, name: 'Community Health Fair',
    description: 'Basic triage and visitor flow.',
    location: 'Houston, TX',
    required_skills: ['CPR','Crowd Control','Spanish'],
    urgency: 'High',
    date: '2025-09-26'
  },
  {
    id: 103, name: 'Park Cleanup',
    description: 'Setup, trash pickup.',
    location: 'Austin, TX',
    required_skills: ['Event Setup'],
    urgency: 'Low',
    date: '2025-09-21'
  }
];

const uniq = (arr) => [...new Set(arr)];
const scoreMatch = (vol, evt) => {
  const skills = vol.skills || [];
  const req = evt.required_skills || [];
  const overlap = req.filter(r => skills.includes(r)).length;
  const skillScore = req.length ? overlap / req.length : 0;

  const dateScore = (vol.availability || []).includes(evt.date) ? 1 : 0;
  const locScore = evt.location?.includes(vol.state_code || '') ? 1 : 0;

  return Math.round((skillScore*0.7 + dateScore*0.25 + locScore*0.05) * 100);
};

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' });

export default function VolunteerMatch() {
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr('');
      try {
        const [vRes, eRes] = await Promise.allSettled([
          fetch(`${API}/volunteers`).then(r => r.ok ? r.json() : Promise.reject()),
          fetch(`${API}/events`).then(r => r.ok ? r.json() : Promise.reject())
        ]);

        const V = vRes.status === 'fulfilled' && Array.isArray(vRes.value) && vRes.value.length
          ? vRes.value.map(v => ({
              id: v.id,
              name: v.first_name && v.last_name ? `${v.first_name} ${v.last_name}` : (v.name || v.email),
              email: v.email,
              skills: v.skills || [],
              availability: v.availability || [],
              city: v.city || '',
              state_code: v.state_code || ''
            }))
          : MOCK_VOLUNTEERS;

        const E = eRes.status === 'fulfilled' && Array.isArray(eRes.value) && eRes.value.length
          ? eRes.value.map(e => ({
              id: e.id, name: e.name, description: e.description,
              location: e.location, required_skills: e.required_skills || [],
              urgency: e.urgency || 'Medium', date: e.date
            }))
          : MOCK_EVENTS;

        if (!alive) return;
        setVolunteers(V);
        setEvents(E);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setVolunteers(MOCK_VOLUNTEERS);
        setEvents(MOCK_EVENTS);
        setErr('Using sample data (API unavailable)');
        setLoading(false);
      }
    })();
    return () => { alive = false };
  }, []);

  const volunteerOptions = useMemo(() => volunteers.map(v => ({ value: v.id, label: v.name })), [volunteers]);

  const matches = useMemo(() => {
    if (!selectedVolunteer) return [];
    const vol = volunteers.find(v => v.id === selectedVolunteer.value);
    if (!vol) return [];
    return events
      .map(evt => ({ evt, score: scoreMatch(vol, evt) }))
      .sort((a, b) => b.score - a.score);
  }, [selectedVolunteer, volunteers, events]);

  const topMatch = matches[0];

  const assign = () => {
    if (!selectedVolunteer || !topMatch) return;
    alert(`Assigned ${selectedVolunteer.label} to "${topMatch.evt.name}" (${topMatch.score}%)`);
  };

  return (
    <div className="vm-shell">
      <div className="vm-card">
        <div className="vm-header">
          <h1>Volunteer Matching</h1>
          {loading && <div className="spinner" aria-label="loading"/>}
          {err && <div className="notice warn">{err}</div>}
        </div>

        <div className="vm-row">
          <div className="vm-col">
            <label>Volunteer</label>
            <Select
              classNamePrefix="rs"
              options={volunteerOptions}
              value={selectedVolunteer}
              onChange={setSelectedVolunteer}
              placeholder="Choose a volunteer…"
            />
          </div>
          <div className="vm-col">
            <label>Matched Event</label>
            <input
              className="vm-input"
              type="text"
              readOnly
              value={topMatch ? `${topMatch.evt.name} — ${fmt(topMatch.evt.date)}` : ''}
              placeholder="Select a volunteer to see best match"
            />
          </div>
        </div>

        {/* volunteer and event preview */}
        {selectedVolunteer && (
          <div className="vm-panels">
            <VolunteerPanel volunteer={volunteers.find(v => v.id === selectedVolunteer.value)} />
            <EventPanel event={topMatch?.evt} score={topMatch?.score} />
          </div>
        )}

        {/* top matches */}
        {selectedVolunteer && (
          <>
            <div className="vm-subtitle">Top Matches</div>
            <div className="vm-table">
              <div className="vm-thead">
                <div>Event</div><div>Date</div><div>Required Skills</div><div>Urgency</div><div>Score</div>
              </div>
              <div className="vm-tbody">
                {matches.map(({ evt, score }) => (
                  <div key={evt.id} className="vm-rowline">
                    <div className="evt">{evt.name}</div>
                    <div>{fmt(evt.date)}</div>
                    <div className="req">{evt.required_skills.join(', ') || '—'}</div>
                    <div><span className={`pill urg-${(evt.urgency||'').toLowerCase()}`}>{evt.urgency}</span></div>
                    <div><span className={`score ${score>=80?'hi':score>=60?'mid':'lo'}`}>{score}%</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="vm-actions">
              <button disabled={!topMatch} onClick={assign}>Assign Best Match</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VolunteerPanel({ volunteer }) {
  if (!volunteer) return null;
  return (
    <div className="panel">
      <div className="panel-title">Volunteer</div>
      <div className="kv"><span>Name</span><b>{volunteer.name}</b></div>
      <div className="kv"><span>Email</span><b>{volunteer.email}</b></div>
      <div className="kv"><span>Location</span><b>{volunteer.city || '—'}, {volunteer.state_code || '—'}</b></div>
      <div className="kv"><span>Skills</span>
        <div className="chips">{(volunteer.skills||[]).map(s => <span key={s} className="chip">{s}</span>)}</div>
      </div>
      <div className="kv"><span>Availability</span>
        <div className="chips">{(uniq(volunteer.availability||[])).map(d => <span key={d} className="chip">{fmt(d)}</span>)}</div>
      </div>
    </div>
  );
}

function EventPanel({ event, score }) {
  if (!event) return (
    <div className="panel empty">
      <div className="panel-title">Matched Event</div>
      <div className="muted">Select a volunteer to see a match.</div>
    </div>
  );
  return (
    <div className="panel">
      <div className="panel-title">Matched Event</div>
      <div className="kv"><span>Event</span><b>{event.name}</b></div>
      <div className="kv"><span>Date</span><b>{fmt(event.date)}</b></div>
      <div className="kv"><span>Location</span><b>{event.location}</b></div>
      <div className="kv"><span>Urgency</span><b><span className={`pill urg-${(event.urgency||'').toLowerCase()}`}>{event.urgency}</span></b></div>
      <div className="kv"><span>Required</span>
        <div className="chips">{(event.required_skills||[]).map(s => <span key={s} className="chip ghost">{s}</span>)}</div>
      </div>
      <div className="scorebox">
        Match Score <span className={`score ${score>=80?'hi':score>=60?'mid':'lo'}`}>{(score??0)}%</span>
      </div>
    </div>
  );
}

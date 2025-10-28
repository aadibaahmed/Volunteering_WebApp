// Volunteer Matching Module
// Implements logic to match volunteers to events based on their profiles and event requirements

export let volunteerMatches = [
  {
    id: 1,
    eventId: 1,
    volunteerId: 1,
    matchScore: 95,
    status: 'assigned',
    assignedDate: '2024-01-15',
    notes: 'Perfect match - has all required skills'
  },
  {
    id: 2,
    eventId: 2,
    volunteerId: 2,
    matchScore: 88,
    status: 'pending',
    assignedDate: '2024-01-16',
    notes: 'Good match - missing one skill but has experience'
  }
];

export let volunteers = [
  {
    id: 1,
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@volunteer.com',
    skills: ['Management', 'Leadership', 'Organization'],
    availability: ['2024-01-20', '2024-01-21', '2024-01-22'],
    location: 'Admin City',
    preferences: ['Management', 'Leadership'],
    completed: true
  },
  {
    id: 2,
    first_name: 'John',
    last_name: 'Doe',
    email: 'volunteer@volunteer.com',
    skills: ['First Aid', 'CPR', 'Teaching'],
    availability: ['2024-01-18', '2024-01-19', '2024-01-20'],
    location: 'Volunteer City',
    preferences: ['Education', 'Healthcare'],
    completed: true
  },
  {
    id: 3,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    skills: ['Event Setup', 'Food Service', 'Crowd Control'],
    availability: ['2024-01-18', '2024-01-19', '2024-01-20'],
    location: 'Los Angeles',
    preferences: ['Community Service', 'Food'],
    completed: true
  },
  {
    id: 4,
    first_name: 'Mike',
    last_name: 'Johnson',
    email: 'mike@example.com',
    skills: ['Logistics', 'Cooking', 'Cleaning'],
    availability: ['2024-01-22', '2024-01-23', '2024-01-24'],
    location: 'Chicago',
    preferences: ['Food', 'Environment'],
    completed: true
  }
];

export let events = [
  {
    id: 1,
    eventName: 'Community Health Fair',
    description: 'Free health screenings and education',
    location: 'Central Park, New York',
    requiredSkills: ['First Aid', 'CPR', 'Teaching'],
    urgency: 'High',
    date: '2024-01-20',
    startTime: '09:00',
    endTime: '17:00',
    maxVolunteers: 10,
    currentVolunteers: 3
  },
  {
    id: 2,
    eventName: 'Food Bank Distribution',
    description: 'Distribute food to families in need',
    location: 'Downtown LA Food Bank',
    requiredSkills: ['Food Service', 'Logistics'],
    urgency: 'Medium',
    date: '2024-01-18',
    startTime: '08:00',
    endTime: '14:00',
    maxVolunteers: 15,
    currentVolunteers: 8
  }
];

// Calculate match score between volunteer and event
export function calculateMatchScore(volunteer, event) {
  let score = 0;
  
  // Skills match (60% of score)
  const matchingSkills = volunteer.skills.filter(skill => 
    event.requiredSkills.includes(skill)
  );
  const skillScore = (matchingSkills.length / event.requiredSkills.length) * 60;
  score += skillScore;
  
  // Availability match (25% of score)
  const hasAvailability = volunteer.availability.includes(event.date);
  if (hasAvailability) {
    score += 25;
  }
  
  // Location proximity (10% of score) - simplified for demo
  if (volunteer.location && event.location) {
    score += 10; // Assume all matches for demo
  }
  
  // Preferences match (5% of score)
  const matchingPreferences = volunteer.preferences.filter(pref => 
    event.description.toLowerCase().includes(pref.toLowerCase()) ||
    event.eventName.toLowerCase().includes(pref.toLowerCase())
  );
  if (matchingPreferences.length > 0) {
    score += 5;
  }
  
  return Math.round(score);
}

// Find best matches for an event
export function findMatchesForEvent(eventId) {
  const event = events.find(e => e.id === eventId);
  if (!event) return [];
  
  const matches = volunteers
    .filter(volunteer => volunteer.completed)
    .map(volunteer => ({
      volunteer,
      event,
      matchScore: calculateMatchScore(volunteer, event)
    }))
    .filter(match => match.matchScore >= 50) // Minimum 50% match
    .sort((a, b) => b.matchScore - a.matchScore);
  
  return matches;
}

// Find best events for a volunteer
export function findMatchesForVolunteer(volunteerId) {
  const volunteer = volunteers.find(v => v.id === volunteerId);
  if (!volunteer || !volunteer.completed) return [];
  
  const matches = events
    .map(event => ({
      volunteer,
      event,
      matchScore: calculateMatchScore(volunteer, event)
    }))
    .filter(match => match.matchScore >= 50)
    .sort((a, b) => b.matchScore - a.matchScore);
  
  return matches;
}

// Assign volunteer to event
export function assignVolunteerToEvent(volunteerId, eventId, notes = '') {
  const volunteer = volunteers.find(v => v.id === volunteerId);
  const event = events.find(e => e.id === eventId);
  
  if (!volunteer || !event) {
    throw new Error('Volunteer or event not found');
  }
  
  if (event.currentVolunteers >= event.maxVolunteers) {
    throw new Error('Event is full');
  }
  
  const matchScore = calculateMatchScore(volunteer, event);
  
  const assignment = {
    id: volunteerMatches.length + 1,
    eventId,
    volunteerId,
    matchScore,
    status: 'assigned',
    assignedDate: new Date().toISOString().split('T')[0],
    notes
  };
  
  volunteerMatches.push(assignment);
  event.currentVolunteers++;
  
  return assignment;
}

// Get all matches
export function getAllMatches() {
  return volunteerMatches.map(match => {
    const volunteer = volunteers.find(v => v.id === match.volunteerId);
    const event = events.find(e => e.id === match.eventId);
    
    return {
      ...match,
      volunteer: volunteer ? {
        id: volunteer.id,
        name: `${volunteer.first_name} ${volunteer.last_name}`,
        email: volunteer.email,
        skills: volunteer.skills
      } : null,
      event: event ? {
        id: event.id,
        name: event.eventName,
        date: event.date,
        location: event.location
      } : null
    };
  });
}

// Update match status
export function updateMatchStatus(matchId, status) {
  const match = volunteerMatches.find(m => m.id === matchId);
  if (!match) {
    throw new Error('Match not found');
  }
  
  match.status = status;
  return match;
}

// Get volunteer history
export function getVolunteerHistory(volunteerId) {
  return volunteerMatches
    .filter(match => match.volunteerId === volunteerId)
    .map(match => {
      const event = events.find(e => e.id === match.eventId);
      return {
        ...match,
        event: event ? {
          id: event.id,
          name: event.eventName,
          date: event.date,
          location: event.location,
          description: event.description
        } : null
      };
    });
}

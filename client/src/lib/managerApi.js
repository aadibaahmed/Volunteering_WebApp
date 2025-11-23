// Manager API Integration
// Centralized API calls for manager dashboard functionality

const API_BASE_URL = 'http://localhost:3000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Event Management API
export const eventApi = {
  // Get all events
  getAllEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  // Create new event
  createEvent: async (eventData) => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  // Update event
  updateEvent: async (eventId, eventData) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  // Delete event
  deleteEvent: async (eventId) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete event');
    return response.json();
  }
};

// Volunteer Management API
export const volunteerApi = {
  // Get all volunteers
  getAllVolunteers: async () => {
    const response = await fetch(`${API_BASE_URL}/volunteer-history`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch volunteers');
    return response.json();
  },

  // Get volunteer history
  getVolunteerHistory: async (volunteerId) => {
    const response = await fetch(`${API_BASE_URL}/volunteer-history/${volunteerId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch volunteer history');
    return response.json();
  },

  // Get my volunteer history
  getMyHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/volunteer-history/my-history`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch my history');
    return response.json();
  },

  // Create new volunteer
  createVolunteer: async (volunteerData) => {
    const response = await fetch(`${API_BASE_URL}/volunteers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(volunteerData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create volunteer');
    }
    return response.json();
  },

  // Update volunteer
  updateVolunteer: async (volunteerId, volunteerData) => {
    const response = await fetch(`${API_BASE_URL}/volunteers/${volunteerId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(volunteerData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update volunteer');
    }
    return response.json();
  },

  // Delete volunteer (deactivate)
  deleteVolunteer: async (volunteerId) => {
    const response = await fetch(`${API_BASE_URL}/volunteers/${volunteerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete volunteer');
    }
    return response.json();
  },

  // Get volunteer profile
  getVolunteerProfile: async (volunteerId) => {
    const response = await fetch(`${API_BASE_URL}/volunteers/${volunteerId}/profile`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch volunteer profile');
    }
    return response.json();
  }
};

// Volunteer Matching API
export const matchingApi = {
  // Get all matches
  getAllMatches: async () => {
    const response = await fetch(`${API_BASE_URL}/volunteer-matching/all`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch matches');
    return response.json();
  },

  // Get matches for specific event
  getMatchesForEvent: async (eventId) => {
    const response = await fetch(`${API_BASE_URL}/volunteer-matching/event/${eventId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch event matches');
    return response.json();
  },

  // Get matches for specific volunteer
  getMatchesForVolunteer: async (volunteerId) => {
    const response = await fetch(`${API_BASE_URL}/volunteer-matching/volunteer/${volunteerId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch volunteer matches');
    return response.json();
  },

  // Assign volunteer to event
  assignVolunteer: async (volunteerId, eventId, notes = '') => {
    const response = await fetch(`${API_BASE_URL}/volunteer-matching/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ volunteerId, eventId, notes })
    });
    if (!response.ok) throw new Error('Failed to assign volunteer');
    return response.json();
  },

  // Update match status
  updateMatchStatus: async (matchId, status) => {
    const response = await fetch(`${API_BASE_URL}/volunteer-matching/${matchId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Failed to update match status');
    return response.json();
  }
};

// Notifications API
export const notificationApi = {
  // Get all notifications (managers only)
  getAllNotifications: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  // Get my notifications
  getMyNotifications: async () => {
    const response = await fetch(`${API_BASE_URL}/my-notifications`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch my notifications');
    return response.json();
  },

  // Get unread notifications
  getUnreadNotifications: async () => {
    const response = await fetch(`${API_BASE_URL}/unread`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch unread notifications');
    return response.json();
  },

  // Create notification (managers only)
  createNotification: async (userId, message, type = 'update', eventId = null, priority = 'medium') => {
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, message, type, eventId, priority })
    });
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await fetch(`${API_BASE_URL}/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return response.json();
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await fetch(`${API_BASE_URL}/mark-all-read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
    return response.json();
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await fetch(`${API_BASE_URL}/${notificationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete notification');
    return response.json();
  },

  // Get notification statistics
  getNotificationStats: async () => {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch notification stats');
    return response.json();
  }
};

// User Profile API
export const profileApi = {
  // Get my profile
  getMyProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/profile/me`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  // Update profile
  updateProfile: async (profileData) => {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  // Update skills
  updateSkills: async (skills) => {
    const response = await fetch(`${API_BASE_URL}/profile/skills`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(skills)
    });
    if (!response.ok) throw new Error('Failed to update skills');
    return response.json();
  },

  // Update availability
  updateAvailability: async (availability) => {
    const response = await fetch(`${API_BASE_URL}/profile/availability`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(availability)
    });
    if (!response.ok) throw new Error('Failed to update availability');
    return response.json();
  },

  // Complete profile
  completeProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/profile/complete`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to complete profile');
    return response.json();
  }
};

// Authentication API
export const authApi = {
  // Login
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  // Register
  register: async (email, password, role = 'user', first_name = '', last_name = '') => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, first_name, last_name })
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  }
};

// Dashboard API - Combined data fetching
export const dashboardApi = {
  // Get manager dashboard data
  getManagerDashboardData: async () => {
    try {
  
      const events = await eventApi.getAllEvents();
  
      let matches = [];
      try {
        matches = await matchingApi.getAllMatches();
      } catch (e) {
        console.warn("Matches failed:", e.message);
      }
  
      let notifications = [];
      try {
        notifications = await notificationApi.getMyNotifications();
      } catch (e) {
        console.warn("Notifications failed:", e.message);
      }
  
      let volunteers = [];
      try {
        volunteers = await volunteerApi.getAllVolunteers();
      } catch (e) {
        console.warn("Volunteers failed:", e.message);
      }
  
      return {
        events,
        matches,
        notifications,
        volunteers,
        stats: {
          totalEvents: events.length,
          totalVolunteers: volunteers.length,
          activeMatches: matches.filter(m => m.status === 'assigned').length,
          pendingAssignments: matches.filter(m => m.status === 'pending').length
        }
      };
  
    } catch (error) {
      console.error('Dashboard failure:', error);
      throw error;
    }
  },
    // Get volunteer dashboard data
  getVolunteerDashboardData: async () => {
    try {
      const [profile, history, notifications, events] = await Promise.all([
        profileApi.getMyProfile(),
        volunteerApi.getMyHistory(),
        notificationApi.getMyNotifications(),
        eventApi.getAllEvents()
      ]);

      return {
        profile,
        history,
        notifications,
        events
      };
    } catch (error) {
      console.error('Error fetching volunteer dashboard data:', error);
      throw error;
    }
  }
};

export default {
  eventApi,
  volunteerApi,
  matchingApi,
  notificationApi,
  profileApi,
  authApi,
  dashboardApi
};

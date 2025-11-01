import React, { useState, useEffect } from 'react';
import { volunteerApi } from '../../lib/managerApi';
import Header from '../../assets/header_after/header_after.jsx';
import './volunteerlist.css';
import './Manager_Dashboard_Tabs/events_modal.css';

function VolunteerList() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [viewingVolunteer, setViewingVolunteer] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await volunteerApi.getAllVolunteers();
      setVolunteers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching volunteers:', err);
      setError('Failed to load volunteers. Please try again.');
      setVolunteers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (volunteerId) => {
    if (!window.confirm('Are you sure you want to delete this volunteer? This will deactivate their account.')) {
      return;
    }
    
    try {
      await volunteerApi.deleteVolunteer(volunteerId);
      alert('Volunteer deleted successfully!');
      fetchVolunteers();
    } catch (err) {
      console.error('Error deleting volunteer:', err);
      alert(`Failed to delete volunteer: ${err.message}`);
    }
  };

  const handleViewDetails = async (volunteer) => {
    setViewingVolunteer(volunteer);
    setLoadingProfile(true);
    setShowDetailsModal(true);
    
    try {
      const profile = await volunteerApi.getVolunteerProfile(volunteer.volunteerId);
      setProfileData(profile);
    } catch (err) {
      console.error('Error fetching volunteer profile:', err);
      alert(`Failed to load profile: ${err.message}`);
      setProfileData(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleEdit = (volunteer) => {
    setEditingVolunteer(volunteer);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="volunteer-list-container" style={{ paddingTop: '100px' }}>
          <div className="loading-message">Loading volunteers...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="volunteer-list-container" style={{ paddingTop: '100px' }}>
          <div className="error-message">{error}</div>
          <button onClick={fetchVolunteers} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="volunteer-list-container">
        <div className="volunteer-list-header">
          <h2>Volunteer Management</h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div className="volunteer-count">
              <span className="count-number">{volunteers.length}</span>
              <span className="count-label">Volunteers</span>
            </div>
            <button className="create-event-btn" onClick={() => setShowModal(true)}>
              Add Volunteer
            </button>
          </div>
        </div>

        {volunteers.length === 0 ? (
          <div className="no-volunteers">
            <p>No volunteers found.</p>
          </div>
        ) : (
          <div className="volunteers-grid">
            {volunteers.map(volunteer => (
              <div key={volunteer.volunteerId} className="volunteer-card">
                <div className="volunteer-card-header">
                  <div className="volunteer-avatar">
                    {volunteer.volunteerName ? volunteer.volunteerName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="volunteer-basic-info">
                    <h3 className="volunteer-name">{volunteer.volunteerName || 'Unknown'}</h3>
                    <p className="volunteer-email">{volunteer.email}</p>
                  </div>
                </div>
                <div className="volunteer-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Events</span>
                    <span className="stat-value">{volunteer.totalEvents || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Completed</span>
                    <span className="stat-value">{volunteer.completedEvents || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Hours</span>
                    <span className="stat-value">{volunteer.totalHours || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Last Activity</span>
                    <span className="stat-value" style={{ fontSize: '0.9rem' }}>
                      {volunteer.lastActivity === 'N/A' || !volunteer.lastActivity 
                        ? 'N/A' 
                        : new Date(volunteer.lastActivity).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="volunteer-actions">
                  <button className="action-btn view-btn" onClick={() => handleViewDetails(volunteer)}>
                    View Details
                  </button>
                  <button className="edit-btn" onClick={() => handleEdit(volunteer)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(volunteer.volunteerId)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Volunteer Modal */}
      {showModal && (
        <CreateVolunteerModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchVolunteers();
          }}
        />
      )}

      {/* Edit Volunteer Modal */}
      {showEditModal && editingVolunteer && (
        <EditVolunteerModal 
          volunteer={editingVolunteer}
          onClose={() => {
            setShowEditModal(false);
            setEditingVolunteer(null);
          }} 
          onSuccess={() => {
            setShowEditModal(false);
            setEditingVolunteer(null);
            fetchVolunteers();
          }}
        />
      )}

      {/* View Details Modal */}
      {showDetailsModal && viewingVolunteer && (
        <ViewDetailsModal 
          volunteer={viewingVolunteer}
          profileData={profileData}
          loadingProfile={loadingProfile}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingVolunteer(null);
            setProfileData(null);
          }}
        />
      )}
    </div>
  );
}

// Create Volunteer Modal Component
function CreateVolunteerModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!email || !password) {
      alert("Please fill out all required fields.");
      setSubmitting(false);
      return;
    }

    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    if (password.length < 8 || password.length > 12) {
      alert("Password must be between 8 and 12 characters.");
      setSubmitting(false);
      return;
    }
    
    const formData = {
      email: email,
      password: password
    };

    try {
      await volunteerApi.createVolunteer(formData);
      alert("Volunteer created successfully!");
      onSuccess();
      
      // Reset form
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Error creating volunteer:", error);
      alert(`Failed to create volunteer: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Volunteer</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <label>Email *</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="volunteer@example.com"
            />
          </div>

          <div className="form-row">
            <label>Password *</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="8-12 characters"
              minLength={8}
              maxLength={12}
            />
            <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
              Password must be 8-12 characters long
            </small>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Volunteer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Volunteer Modal Component
function EditVolunteerModal({ volunteer, onClose, onSuccess }) {
  const [email, setEmail] = useState(volunteer?.email || "");
  const [password, setPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState(null);
  
  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [preferences, setPreferences] = useState("");
  const [skills, setSkills] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [newAvailabilityDate, setNewAvailabilityDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allSkills = [
    "First Aid", "CPR", "Teaching", "Event Setup", "Food Service",
    "Crowd Control", "Logistics", "Cooking", "Cleaning", "Organizing"
  ];

  const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

  // Load profile data when modal opens
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const profile = await volunteerApi.getVolunteerProfile(volunteer.volunteerId);
        setProfileData(profile);
        setEmail(profile.email || volunteer.email || "");
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setAddress1(profile.address1 || "");
        setAddress2(profile.address2 || "");
        setCity(profile.city || "");
        setStateCode(profile.state_code || "");
        setZipCode(profile.zip_code || "");
        setPreferences(profile.preferences || "");
        setSkills(profile.skills || []);
        setAvailability(profile.availability || []);
      } catch (err) {
        console.error('Error loading profile:', err);
        // Set defaults from volunteer data if profile doesn't exist
        setEmail(volunteer.email || "");
      } finally {
        setLoadingProfile(false);
      }
    };
    
    if (volunteer) {
      loadProfile();
    }
  }, [volunteer]);

  const handleSkillChange = (e) => {
    const selectedSkill = e.target.value;
    if (selectedSkill && !skills.includes(selectedSkill)) {
      setSkills([...skills, selectedSkill]);
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addAvailabilityDate = () => {
    if (newAvailabilityDate && !availability.includes(newAvailabilityDate)) {
      setAvailability([...availability, newAvailabilityDate]);
      setNewAvailabilityDate("");
    }
  };

  const removeAvailabilityDate = (dateToRemove) => {
    setAvailability(availability.filter(date => date !== dateToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!email) {
      alert("Please provide an email address.");
      setSubmitting(false);
      return;
    }

    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    if (password && (password.length < 8 || password.length > 12)) {
      alert("Password must be between 8 and 12 characters (or leave blank to keep current password).");
      setSubmitting(false);
      return;
    }
    
    const formData = {
      email: email,
      first_name: firstName || null,
      last_name: lastName || null,
      address1: address1 || null,
      address2: address2 || null,
      city: city || null,
      state_code: stateCode || null,
      zip_code: zipCode || null,
      preferences: preferences || null,
      skills: skills,
      availability: availability
    };

    // Only include password if it's provided
    if (password) {
      formData.password = password;
    }

    try {
      await volunteerApi.updateVolunteer(volunteer.volunteerId, formData);
      alert("Volunteer updated successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error updating volunteer:", error);
      alert(`Failed to update volunteer: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit Volunteer</h2>
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Edit Volunteer</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Account Information</h3>
          
          <div className="form-row">
            <label>Email *</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="volunteer@example.com"
            />
          </div>

          <div className="form-row">
            <label>New Password (optional)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Leave blank to keep current password"
              minLength={8}
              maxLength={12}
            />
            <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
              Leave blank to keep current password. If changing, must be 8-12 characters long.
            </small>
          </div>

          <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#2c3e50' }}>Profile Information</h3>

          <div className="form-row-group">
            <div className="form-row">
              <label>First Name</label>
              <input 
                type="text" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="First name"
                maxLength={50}
              />
            </div>

            <div className="form-row">
              <label>Last Name</label>
              <input 
                type="text" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="Last name"
                maxLength={50}
              />
            </div>
          </div>

          <div className="form-row">
            <label>Address Line 1</label>
            <input 
              type="text" 
              value={address1} 
              onChange={(e) => setAddress1(e.target.value)} 
              placeholder="Street address"
              maxLength={100}
            />
          </div>

          <div className="form-row">
            <label>Address Line 2</label>
            <input 
              type="text" 
              value={address2} 
              onChange={(e) => setAddress2(e.target.value)} 
              placeholder="Apartment, suite, etc. (optional)"
              maxLength={100}
            />
          </div>

          <div className="form-row-group">
            <div className="form-row">
              <label>City</label>
              <input 
                type="text" 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                placeholder="City"
                maxLength={100}
              />
            </div>

            <div className="form-row">
              <label>State</label>
              <select value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
                <option value="">-- Select --</option>
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>ZIP Code</label>
              <input 
                type="text" 
                value={zipCode} 
                onChange={(e) => setZipCode(e.target.value)} 
                placeholder="12345"
                maxLength={9}
              />
            </div>
          </div>

          <div className="form-row">
            <label>Preferences</label>
            <textarea 
              value={preferences} 
              onChange={(e) => setPreferences(e.target.value)} 
              placeholder="Volunteer preferences..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <label>Skills</label>
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
            <label>Availability</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input 
                type="date" 
                value={newAvailabilityDate} 
                onChange={(e) => setNewAvailabilityDate(e.target.value)} 
                style={{ flex: 1 }}
              />
              <button type="button" onClick={addAvailabilityDate} style={{ padding: '10px 20px', background: '#6A89A7', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Add Date
              </button>
            </div>
            {availability.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {availability.map((date, index) => (
                    <span key={index} className="skill-tag" style={{ background: '#27ae60' }}>
                      {new Date(date).toLocaleDateString()}
                      <button type="button" onClick={() => removeAvailabilityDate(date)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Volunteer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Details Modal Component
function ViewDetailsModal({ volunteer, profileData, loadingProfile, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Volunteer Profile Details</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="event-details-content">
          {loadingProfile ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading profile...</div>
          ) : profileData ? (
            <>
              <div className="event-detail-row">
                <strong>Email:</strong>
                <span>{profileData.email || 'N/A'}</span>
              </div>
              
              <div className="event-detail-row">
                <strong>Name:</strong>
                <span>
                  {profileData.first_name || profileData.last_name
                    ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
                    : 'Not provided'}
                </span>
              </div>

              {profileData.address1 && (
                <>
                  <div className="event-detail-row">
                    <strong>Address:</strong>
                    <span>
                      {profileData.address1}
                      {profileData.address2 ? `, ${profileData.address2}` : ''}
                    </span>
                  </div>
                  
                  <div className="event-detail-row">
                    <strong>City, State ZIP:</strong>
                    <span>
                      {profileData.city || ''}
                      {profileData.state_code ? `, ${profileData.state_code}` : ''}
                      {profileData.zip_code ? ` ${profileData.zip_code}` : ''}
                    </span>
                  </div>
                </>
              )}

              {profileData.preferences && (
                <div className="event-detail-row">
                  <strong>Preferences:</strong>
                  <span>{profileData.preferences}</span>
                </div>
              )}

              {profileData.skills && profileData.skills.length > 0 && (
                <div className="event-detail-row">
                  <strong>Skills:</strong>
                  <span>{profileData.skills.join(', ')}</span>
                </div>
              )}

              {profileData.availability && profileData.availability.length > 0 && (
                <div className="event-detail-row">
                  <strong>Availability:</strong>
                  <span>
                    {profileData.availability.map(date => 
                      new Date(date).toLocaleDateString()
                    ).join(', ')}
                  </span>
                </div>
              )}

              <div className="event-detail-row">
                <strong>Profile Completed:</strong>
                <span>{profileData.completed ? 'Yes' : 'No'}</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No profile information available for this volunteer.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VolunteerList;

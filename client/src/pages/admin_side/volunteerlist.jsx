import React, { useState, useEffect } from 'react';
import { volunteerApi } from '../../lib/managerApi';
import Header from '../../assets/header_after/header_after.jsx';
import './volunteer_modal.css';
import './volunteerlist.css';
import './manager_dashboard.css';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [volunteerToDelete, setVolunteerToDelete] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Show 12 volunteers per page

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await volunteerApi.getAllVolunteers();
      const volunteersArray = Array.isArray(data) ? data : [];
      
      // Fetch profiles for each volunteer to enable search by location and skills
      const volunteersWithProfiles = await Promise.all(
        volunteersArray.map(async (volunteer) => {
          try {
            const profile = await volunteerApi.getVolunteerProfile(volunteer.volunteerId);
            return {
              ...volunteer,
              profile: profile
            };
          } catch (err) {
            // If profile fetch fails, just return volunteer without profile
            return volunteer;
          }
        })
      );
      
      setVolunteers(volunteersWithProfiles);
    } catch (err) {
      console.error('Error fetching volunteers:', err);
      setError('Failed to load volunteers. Please try again.');
      setVolunteers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (volunteerId) => {
    setVolunteerToDelete(volunteerId);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!volunteerToDelete) return;
    
    try {
      await volunteerApi.deleteVolunteer(volunteerToDelete);
      setSuccessMessage('Volunteer deleted successfully!');
      setShowSuccessMessage(true);
      setShowConfirmDelete(false);
      setVolunteerToDelete(null);
      fetchVolunteers();
    } catch (err) {
      console.error('Error deleting volunteer:', err);
      setErrorMessage(`Failed to delete volunteer: ${err.message}`);
      setShowErrorMessage(true);
      setShowConfirmDelete(false);
      setVolunteerToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setVolunteerToDelete(null);
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
      setErrorMessage(`Failed to load profile: ${err.message}`);
      setShowErrorMessage(true);
      setProfileData(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleEdit = (volunteer) => {
    setEditingVolunteer(volunteer);
    setShowEditModal(true);
  };

  // Filter volunteers based on search query
  const filteredVolunteers = volunteers.filter(volunteer => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const volunteerName = (volunteer.volunteerName || '').toLowerCase();
    const email = (volunteer.email || '').toLowerCase();
    
    // Check if name matches (full name or parts)
    if (volunteerName.includes(query)) return true;
    
    // Check if email matches
    if (email.includes(query)) return true;
    
    // Check profile data if available
    if (volunteer.profile) {
      const firstName = (volunteer.profile.first_name || '').toLowerCase();
      const lastName = (volunteer.profile.last_name || '').toLowerCase();
      const city = (volunteer.profile.city || '').toLowerCase();
      const state = (volunteer.profile.state_code || '').toLowerCase();
      const address = (volunteer.profile.address1 || '').toLowerCase();
      
      // Check first name or last name
      if (firstName.includes(query) || lastName.includes(query)) return true;
      
      // Check location (city, state, or address)
      if (city.includes(query) || state.includes(query) || address.includes(query)) return true;
      
      // Check skills
      if (volunteer.profile.skills && Array.isArray(volunteer.profile.skills)) {
        const hasMatchingSkill = volunteer.profile.skills.some(skill => 
          skill.toLowerCase().includes(query)
        );
        if (hasMatchingSkill) return true;
      }
    }
    
    return false;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredVolunteers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVolunteers = filteredVolunteers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              <span className="count-number">
                {searchQuery ? filteredVolunteers.length : volunteers.length}
              </span>
              <span className="count-label">
                {searchQuery ? 'Found' : 'Volunteers'}
              </span>
            </div>
            <button 
              className="refresh-btn" 
              onClick={fetchVolunteers}
            >
              Refresh Data
            </button>
            <button className="create-event-btn" onClick={() => setShowModal(true)}>
              Add Volunteer
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-bar-container">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="volunteer-search-input"
              placeholder="Search volunteers by name, email, location, or skills..."
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
                className="volunteer-search-clear-btn" 
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

        {volunteers.length === 0 ? (
          <div className="no-volunteers">
            <p>No volunteers found.</p>
          </div>
        ) : filteredVolunteers.length === 0 ? (
          <div className="no-volunteers">
            <p>No volunteers match your search.</p>
          </div>
        ) : (
          <>
            {/* Volunteer Count Info */}
            <div style={{ 
              textAlign: 'center', 
              margin: '20px 0',
              color: '#2A3642',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredVolunteers.length)} of {filteredVolunteers.length} volunteers
            </div>

            <div className="volunteers-grid">
              {paginatedVolunteers.map(volunteer => (
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
                  <button 
                    className="volunteer-view-details-btn" 
                    onClick={() => handleViewDetails(volunteer)}
                    style={{
                      backgroundColor: '#FFBB00',
                      color: '#2A3642',
                      border: 'none'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#e6a600';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFBB00';
                      e.currentTarget.style.color = '#2A3642';
                    }}
                  >
                    View Details
                  </button>
                  <button className="volunteer-edit-btn" onClick={() => handleEdit(volunteer)}>Edit</button>
                  <button className="volunteer-delete-btn" onClick={() => handleDelete(volunteer.volunteerId)}>Delete</button>
                </div>
              </div>
            ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                marginTop: '40px',
                marginBottom: '40px'
              }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
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
                  ← Previous
                </button>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
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
                        onClick={() => handlePageChange(pageNum)}
                        className="pagination-number"
                        style={{
                          padding: '10px 15px',
                          background: pageNum === currentPage 
                            ? 'linear-gradient(135deg, #FFBB00 0%, #e6a600 100%)' 
                            : 'white',
                          color: pageNum === currentPage ? '#2A3642' : '#6A89A7',
                          border: `2px solid ${pageNum === currentPage ? '#FFBB00' : '#6A89A7'}`,
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          minWidth: '45px',
                          transition: 'all 0.3s',
                          boxShadow: pageNum === currentPage 
                            ? '0 3px 10px rgba(255, 187, 0, 0.3)' 
                            : '0 2px 5px rgba(106, 137, 167, 0.2)'
                        }}
                        onMouseOver={(e) => {
                          if (pageNum !== currentPage) {
                            e.currentTarget.style.background = '#F4EDE4';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (pageNum !== currentPage) {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
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
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Volunteer Modal */}
      {showModal && (
        <CreateVolunteerModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            setSuccessMessage('Volunteer created successfully!');
            setShowSuccessMessage(true);
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
            setSuccessMessage('Volunteer updated successfully!');
            setShowSuccessMessage(true);
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

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <ConfirmModal 
          title="Delete Volunteer"
          message="Are you sure you want to delete this volunteer? This will deactivate their account."
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* Success Message Modal */}
      {showSuccessMessage && (
        <MessageModal 
          type="success"
          message={successMessage}
          onClose={() => setShowSuccessMessage(false)}
        />
      )}

      {/* Error Message Modal */}
      {showErrorMessage && (
        <MessageModal 
          type="error"
          message={errorMessage}
          onClose={() => setShowErrorMessage(false)}
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
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setValidationError("");

    if (!email || !password) {
      setValidationError("Please fill out all required fields.");
      setSubmitting(false);
      return;
    }

    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    if (password.length < 8 || password.length > 12) {
      setValidationError("Password must be between 8 and 12 characters.");
      setSubmitting(false);
      return;
    }
    
    const formData = {
      email: email,
      password: password
    };

    try {
      await volunteerApi.createVolunteer(formData);
      onSuccess();
      
      // Reset form
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Error creating volunteer:", error);
      setValidationError(`Failed to create volunteer: ${error.message}`);
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
          {validationError && (
            <div style={{
              padding: '15px',
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #C92A2A 100%)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: '600',
              border: '2px solid #B91C1C',
              boxShadow: '0 3px 10px rgba(185, 28, 28, 0.3)'
            }}>
              ⚠ {validationError}
            </div>
          )}
          
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
  const [validationError, setValidationError] = useState("");

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
    setValidationError("");

    if (!email) {
      setValidationError("Please provide an email address.");
      setSubmitting(false);
      return;
    }

    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    if (password && (password.length < 8 || password.length > 12)) {
      setValidationError("Password must be between 8 and 12 characters (or leave blank to keep current password).");
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
      onSuccess();
    } catch (error) {
      console.error("Error updating volunteer:", error);
      setValidationError(`Failed to update volunteer: ${error.message}`);
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
          {validationError && (
            <div style={{
              padding: '15px',
              marginBottom: '20px',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #C92A2A 100%)',
              color: 'white',
              borderRadius: '12px',
              fontWeight: '600',
              border: '2px solid #B91C1C',
              boxShadow: '0 3px 10px rgba(185, 28, 28, 0.3)'
            }}>
              ⚠ {validationError}
            </div>
          )}
          
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

// Confirm Modal Component
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-btn" onClick={onCancel}>×</button>
        </div>
        <div style={{ padding: '30px', fontSize: '16px', color: '#2A3642', lineHeight: '1.6', fontWeight: '500' }}>
          {message}
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="submit-btn" onClick={onConfirm}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// Message Modal Component  
function MessageModal({ type, message, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content message-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>{type === 'success' ? '✓ Success' : '⚠ Error'}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div style={{ 
          padding: '30px', 
          fontSize: '16px', 
          color: '#2A3642', 
          lineHeight: '1.6', 
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {message}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="submit-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default VolunteerList;

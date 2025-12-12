import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import API from '../api'
import Calendar from '../components/Calendar'
import '../styles/GroupDetail.css'

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [activityTitle, setActivityTitle] = useState('')
  const [activityDesc, setActivityDesc] = useState('')
  const [activityPoints, setActivityPoints] = useState(0)
  const [adding, setAdding] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [submissionDesc, setSubmissionDesc] = useState('')
  const [proofImages, setProofImages] = useState([])
  const [userSubmissions, setUserSubmissions] = useState({})
  const [editingActivity, setEditingActivity] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPoints, setEditPoints] = useState(0)
  const [pendingReviews, setPendingReviews] = useState([])
  const [openMenu, setOpenMenu] = useState(null)
  const [openMemberMenu, setOpenMemberMenu] = useState(null)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [editingMemberPoints, setEditingMemberPoints] = useState(0)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setCurrentUser(user)
    fetchGroupDetails()
    
    // Call fetchActivities with the user data
    fetchActivitiesWithUser(user)
    fetchPendingReviews()
    
    // Set up polling to check for status updates every 5 seconds
    const interval = setInterval(() => {
      fetchActivitiesWithUser(user)
      fetchPendingReviews()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.activity-menu-container')) {
        setOpenMenu(null)
      }
      if (!e.target.closest('.member-menu-container')) {
        setOpenMemberMenu(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const fetchGroupDetails = async () => {
    try {
      setLoading(true)
      const res = await API.get(`/groups/${id}`)
      setGroup(res.data)

      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userIsAdmin = res.data.memberships.some(
        m => m.userId === user.id && m.role === 'ADMIN'
      )
      setIsAdmin(userIsAdmin)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to load group'
      setError(errorMsg)
      
      // If not a member (403) or group not found (404), redirect after a moment
      if (err.response?.status === 403 || err.response?.status === 404) {
        setTimeout(() => navigate('/groups'), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchActivities = async () => {
    if (!currentUser || !currentUser.id) {
      console.error('currentUser not set')
      return
    }
    fetchActivitiesWithUser(currentUser)
  }

  const fetchPendingReviews = async () => {
    try {
      const res = await API.get('/reviews/user/pending')
      // Filter to only show reviews for the current group
      const groupPendingReviews = res.data.filter(
        submission => submission.activity.group.id === parseInt(id)
      )
      console.log('[GroupDetail] Pending reviews:', groupPendingReviews)
      if (groupPendingReviews.length > 0) {
        console.log('[GroupDetail] First submission proofImages:', groupPendingReviews[0].proofImages)
      }
      setPendingReviews(groupPendingReviews)
    } catch (err) {
      console.error('Error fetching pending reviews:', err)
    }
  }

  const fetchActivitiesWithUser = async (user) => {
    try {
      const res = await API.get(`/activities/${id}/activities`)
      setActivities(res.data)
      
      // Fetch user's submissions for each activity
      const userSubmissionMap = {}
      for (const activity of res.data) {
        try {
          const subRes = await API.get(`/submissions/${activity.id}/user/${user.id}`)
          if (subRes.data) {
            userSubmissionMap[activity.id] = subRes.data
            console.log(`[GroupDetail] Activity ${activity.id} submission:`, subRes.data.status)
          }
        } catch (err) {
          console.error(`Error fetching submission for activity ${activity.id}:`, err)
        }
      }
      setUserSubmissions(userSubmissionMap)
    } catch (err) {
      // If not a member, error will be caught in fetchGroupDetails
      if (err.response?.status !== 403) {
        console.error('Failed to load activities:', err)
      }
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setError('')
    setAdding(true)

    try {
      await API.post(`/groups/${id}/members`, { email: memberEmail })
      setMemberEmail('')
      setShowAddMember(false)
      fetchGroupDetails()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member')
    } finally {
      setAdding(false)
    }
  }

  const handleAddActivity = async (e) => {
    e.preventDefault()
    setError('')
    setAdding(true)

    try {
      await API.post(`/activities/${id}/activities`, {
        title: activityTitle,
        description: activityDesc,
        points: parseInt(activityPoints) || 0
      })
      setActivityTitle('')
      setActivityDesc('')
      setActivityPoints(0)
      setShowAddActivity(false)
      fetchActivities()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create activity')
    } finally {
      setAdding(false)
    }
  }

  const handleReview = async (submissionId, approved) => {
    try {
      await API.post(`/reviews/${submissionId}/reviews`, {
        approved,
        comment: approved ? 'Approved' : 'Rejected'
      })
      // Refresh pending reviews, activities, and group details to update points
      fetchPendingReviews()
      fetchActivitiesWithUser(currentUser)
      fetchGroupDetails()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review')
      setTimeout(() => setError(''), 3000)
    }
  }

  const openEditActivity = (activity) => {
    setEditingActivity(activity.id)
    setEditTitle(activity.title)
    setEditDesc(activity.description)
    setEditPoints(activity.points)
  }

  const handleEditActivity = async (e) => {
    e.preventDefault()
    if (!editingActivity) return
    setError('')

    try {
      await API.put(`/activities/${editingActivity}`, {
        title: editTitle,
        description: editDesc,
        points: editPoints
      })
      setEditingActivity(null)
      fetchActivitiesWithUser(currentUser)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update activity')
    }
  }

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return

    try {
      await API.delete(`/activities/${activityId}`)
      fetchActivities()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete activity')
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return

    try {
      await API.delete(`/groups/${id}/members/${memberId}`)
      fetchGroupDetails()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member')
    }
  }

  const handleUpdateMemberPoints = async (e) => {
    e.preventDefault()
    try {
      await API.put(`/groups/${id}/members/${editingMemberId}/points`, {
        points: editingMemberPoints
      })
      setEditingMemberId(null)
      fetchGroupDetails()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update points')
    }
  }

  const openSubmitModal = (activity) => {
    setSelectedActivity(activity)
    setSubmissionDesc('')
    setProofImages([])
    setShowSubmitModal(true)
  }

  const handleSubmitActivity = async (e) => {
    e.preventDefault()
    if (!selectedActivity) return
    setError('')
    setAdding(true)

    try {
      // Convert file objects to base64 data URLs
      const proofImageData = await Promise.all(
        proofImages.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result
              })
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        })
      )
      
      const response = await API.post(`/submissions/${selectedActivity.id}/submissions`, {
        description: submissionDesc,
        proofImages: proofImageData.length > 0 ? proofImageData : null,
        taggedUsers: []
      })
      
      // Immediately update the userSubmissions state with the new submission
      setUserSubmissions(prev => ({
        ...prev,
        [selectedActivity.id]: response.data
      }))
      
      setShowSubmitModal(false)
      setSubmissionDesc('')
      setProofImages([])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit activity')
      console.error('Error:', err)
    } finally {
      setAdding(false)
    }
  }

  const getPriorityLevel = (points) => {
    if (points >= 100) return 'critical'
    if (points >= 50) return 'high'
    if (points >= 20) return 'medium'
    return 'low'
  }

  if (loading) return <div className="page-container"><p>Loading group...</p></div>
  
  if (!group) {
    return (
      <div className="page-container">
        {error && <p className="error-message">{error}</p>}
        <p>Redirecting to groups...</p>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="app-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/')}>← Home</button>
          <h2 style={{margin: 0, marginLeft: '1rem'}}>{group.name}</h2>
        </div>
        <div className="user-section">
          <span>{currentUser.name || currentUser.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="group-detail-content">
        {error && <p className="error-message">{error}</p>}

        <div className="group-actions">
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowAddActivity(true)}>
              Add Activity
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAddMember(true)}>
            Add Member
          </button>
        </div>

        <div className="group-content">
        <section className="members-section">
          <h2>Members & Rankings ({group.memberships.length})</h2>
          <div className="members-list">
            {group.memberships
              .slice()
              .sort((a, b) => (b.user.points || 0) - (a.user.points || 0))
              .map((member, index) => (
              <div key={member.id} className="member-item">
                <div className="member-rank">
                  <span className="rank-badge">#{index + 1}</span>
                </div>
                <div className="member-info">
                  <div className="member-avatar">
                    {member.user.name ? member.user.name[0] : member.user.email[0]}
                  </div>
                  <div className="member-details">
                    <p className="member-name">{member.user.name || 'Unknown'}</p>
                    <p className="member-email">{member.user.email}</p>
                  </div>
                </div>
                <div className="member-actions">
                  <span className="points-display">{member.user.points || 0} pts</span>
                  <span className={`role-badge ${member.role.toLowerCase()}`}>
                    {member.role}
                  </span>
                  {isAdmin && (
                    <div className="member-menu-container">
                      <button
                        className="btn-menu"
                        onClick={() => setOpenMemberMenu(openMemberMenu === member.id ? null : member.id)}
                        title="More actions"
                      >
                        ⋯
                      </button>
                      {openMemberMenu === member.id && (
                        <div className="member-dropdown">
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setEditingMemberId(member.userId)
                              setEditingMemberPoints(member.user.points || 0)
                              setOpenMemberMenu(null)
                            }}
                          >
                            📊 Update Points
                          </button>
                          {member.userId !== currentUser.id && (
                            <button
                              className="dropdown-item delete"
                              onClick={() => {
                                handleRemoveMember(member.id)
                                setOpenMemberMenu(null)
                              }}
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="activities-section">
          <h2>Activities ({activities.length})</h2>
          {activities.length === 0 ? (
            <p className="empty-text">No activities yet</p>
          ) : (
            <div className="activities-list">
              {activities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-header">
                    <div>
                      <div className="activity-title-row">
                        <h4>{activity.title}</h4>
                        <span className={`points-badge points-${getPriorityLevel(activity.points)}`}>
                          {activity.points} pts
                        </span>
                      </div>
                      <p className="activity-desc">{activity.description}</p>
                    </div>
                    {isAdmin && (
                      <div className="activity-menu-container">
                        <button
                          className="btn-menu"
                          onClick={() => setOpenMenu(openMenu === activity.id ? null : activity.id)}
                          title="More actions"
                        >
                          ⋯
                        </button>
                        {openMenu === activity.id && (
                          <div className="activity-dropdown">
                            <button
                              className="dropdown-item"
                              onClick={() => {
                                openEditActivity(activity)
                                setOpenMenu(null)
                              }}
                            >
                              ✎ Edit
                            </button>
                            <button
                              className="dropdown-item delete"
                              onClick={() => {
                                handleDeleteActivity(activity.id)
                                setOpenMenu(null)
                              }}
                            >
                              ✕ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="activity-footer">
                    <p className="activity-submissions">
                      {activity.submissions.length} submission(s)
                    </p>
                    {userSubmissions[activity.id] && userSubmissions[activity.id].status ? (
                      <div className="submission-actions">
                        <span className={`submission-status status-${userSubmissions[activity.id].status.toLowerCase()}`}>
                          {userSubmissions[activity.id].status === 'APPROVED' ? '✓ Approved' : 
                           userSubmissions[activity.id].status === 'UNDER_REVIEW' ? '◉ Under Review' :
                           userSubmissions[activity.id].status === 'REJECTED' ? '✗ Rejected' : 'Pending'}
                        </span>
                        {userSubmissions[activity.id].status === 'REJECTED' && (
                          <button
                            className="btn-resubmit"
                            onClick={() => openSubmitModal(activity)}
                          >
                            Re-submit
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        className="btn-submit"
                        onClick={() => openSubmitModal(activity)}
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="pending-reviews-section">
          <h2>Pending Reviews ({pendingReviews.length})</h2>
          {pendingReviews.length === 0 ? (
            <p className="empty-text">No pending reviews</p>
          ) : (
            <div className="pending-reviews-list">
              {pendingReviews.map(submission => (
                <div key={submission.id} className="review-item">
                  <div className="review-header">
                    <div>
                      <h4>{submission.activity.title}</h4>
                      <p className="review-submitter">
                        Submitted by {submission.user.name || submission.user.email}
                      </p>
                    </div>
                    <span className="points-badge points-medium">
                      {submission.activity.points} pts
                    </span>
                  </div>
                  {submission.description && (
                    <p className="review-description">{submission.description}</p>
                  )}
                  {submission.proofImages && submission.proofImages.length > 0 && (
                    <div className="proof-images">
                      {submission.proofImages.map((proof, idx) => (
                        <div key={idx} className="proof-item">
                          {proof && proof.data && proof.data.startsWith('data:image') ? (
                            <img src={proof.data} alt={proof.name || `Proof ${idx + 1}`} className="proof-image" />
                          ) : (
                            <div className="proof-placeholder">
                              <span className="proof-name">{proof?.name || `Image ${idx + 1}`}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="review-actions">
                    <button
                      className="btn-approve"
                      onClick={() => handleReview(submission.id, true)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReview(submission.id, false)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </div>

        <section className="calendar-section">
          <Calendar groupId={id} />
        </section>
      </div>

      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Member</h2>
            <form onSubmit={handleAddMember}>
              <input
                type="email"
                placeholder="User email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" disabled={adding}>{adding ? 'Adding...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingActivity && (
        <div className="modal-overlay" onClick={() => setEditingActivity(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Activity</h2>
            <form onSubmit={handleEditActivity}>
              <input
                type="text"
                placeholder="Activity title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Activity description"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows="3"
              />
              <input
                type="number"
                min="1"
                placeholder="Points"
                value={editPoints}
                onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingActivity(null)}>Cancel</button>
                <button type="submit">Update Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddActivity && (
        <div className="modal-overlay" onClick={() => setShowAddActivity(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Activity</h2>
            <form onSubmit={handleAddActivity}>
              <input
                type="text"
                placeholder="Activity title"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Activity description (optional)"
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                rows="4"
              />
              <div className="form-group">
                <label htmlFor="points">Points (Priority):</label>
                <input
                  id="points"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={activityPoints}
                  onChange={(e) => setActivityPoints(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddActivity(false)}>Cancel</button>
                <button type="submit" disabled={adding}>{adding ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubmitModal && selectedActivity && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Submit Activity: {selectedActivity.title}</h2>
            <form onSubmit={handleSubmitActivity}>
              <textarea
                placeholder="Describe how you completed this activity..."
                value={submissionDesc}
                onChange={(e) => setSubmissionDesc(e.target.value)}
                rows="4"
                required
              />
              <div className="form-group">
                <label htmlFor="proof">Proof (optional):</label>
                <input
                  id="proof"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setProofImages(Array.from(e.target.files || []))}
                />
                {proofImages.length > 0 && (
                  <p className="form-hint">{proofImages.length} file(s) selected</p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" disabled={adding}>{adding ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingMemberId && (
        <div className="modal-overlay" onClick={() => setEditingMemberId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Update Member Points</h2>
            <form onSubmit={handleUpdateMemberPoints}>
              <div className="form-group">
                <label htmlFor="memberPoints">Points:</label>
                <input
                  id="memberPoints"
                  type="number"
                  min="0"
                  value={editingMemberPoints}
                  onChange={(e) => setEditingMemberPoints(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingMemberId(null)}>Cancel</button>
                <button type="submit">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


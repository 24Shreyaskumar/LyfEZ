import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import '../styles/PendingReviews.css'

export default function PendingReviews() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [pendingSubmissions, setPendingSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState({})
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [reviewComment, setReviewComment] = useState('')
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    console.log('[PendingReviews] Mounted, user:', user)
    setCurrentUser(user)
    fetchPendingReviews()
    
    // Poll every 5 seconds
    const interval = setInterval(fetchPendingReviews, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const fetchPendingReviews = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('[PendingReviews] Fetching pending reviews...')
      const res = await API.get('/reviews/user/pending')
      console.log('[PendingReviews] Got response:', res.status, 'count:', res.data?.length)
      
      // Parse JSON fields in each submission
      const parsed = res.data.map(sub => ({
        ...sub,
        proofImages: sub.proofImages ? (typeof sub.proofImages === 'string' ? JSON.parse(sub.proofImages) : sub.proofImages) : [],
        taggedUsers: sub.taggedUsers ? (typeof sub.taggedUsers === 'string' ? JSON.parse(sub.taggedUsers) : sub.taggedUsers) : []
      }))
      
      setPendingSubmissions(parsed)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load pending reviews'
      setError(msg)
      console.error('[PendingReviews] Fetch error:', msg, err)
    } finally {
      setLoading(false)
    }
  }

  const openReviewModal = (submission) => {
    setSelectedSubmission(submission)
    setReviewComment('')
    setShowReviewModal(true)
  }

  const handleApprove = async () => {
    if (!selectedSubmission) return
    setError('')
    setApproving(true)

    try {
      await API.post(`/reviews/${selectedSubmission.id}/reviews`, {
        approved: true,
        comment: reviewComment
      })
      setShowReviewModal(false)
      fetchPendingReviews()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!selectedSubmission) return
    setError('')
    setApproving(true)

    try {
      await API.post(`/reviews/${selectedSubmission.id}/reviews`, {
        approved: false,
        comment: reviewComment
      })
      setShowReviewModal(false)
      fetchPendingReviews()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject')
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <p>Loading pending reviews...</p>
      </div>
    )
  }

  return (
    <div className="page-container">
      <header className="app-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/')}>← Home</button>
          <h2 style={{margin: 0, marginLeft: '1rem'}}>Pending Reviews</h2>
        </div>
        <div className="user-section">
          <span>{currentUser && (currentUser.name || currentUser.email)}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {error && <p className="error-message">{error}</p>}
      {console.log('[PendingReviews] Render: pendingSubmissions=', pendingSubmissions, 'length=', pendingSubmissions?.length)}
      <div className="reviews-content">
        {pendingSubmissions.length === 0 ? (
          <div className="empty-state">
            <p>No pending reviews at the moment</p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="submissions-list">
            {pendingSubmissions.map(submission => (
              <div key={submission.id} className="submission-card">
                <div className="submission-header">
                  <div>
                    <h3>{submission.activity.title}</h3>
                    <p className="submission-group">
                      Group: <strong>{submission.activity.group.name}</strong>
                    </p>
                    <p className="submission-user">
                      Submitted by: <strong>{submission.user.name || submission.user.email}</strong>
                    </p>
                  </div>
                  <span className={`points-label points-${getPriorityLevel(submission.activity.points)}`}>
                    {submission.activity.points} pts
                  </span>
                </div>

                <div className="submission-details">
                  <h4>Description:</h4>
                  <p>{submission.description}</p>

                  {submission.proofImages && submission.proofImages.length > 0 && (
                    <div className="proof-section">
                      <h4>Proofs ({submission.proofImages.length}):</h4>
                      <div className="proofs-gallery">
                        {submission.proofImages.map((proof, idx) => (
                          <div key={idx} className="proof-item">
                            {proof && proof.data && proof.data.startsWith('data:image') ? (
                              <img src={proof.data} alt={proof.name} className="proof-image" />
                            ) : proof && proof.name ? (
                              <span className="proof-name">{proof.name}</span>
                            ) : (
                              <span className="proof-name">Image {idx + 1}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {submission.reviews && submission.reviews.length > 0 && (
                    <div className="reviews-section">
                      <h4>Reviews ({submission.reviews.length}):</h4>
                      {submission.reviews.map(review => (
                        <div key={review.id} className="review-item">
                          <div className="review-header">
                            <span className={`review-badge ${review.approved ? 'approved' : 'rejected'}`}>
                              {review.approved ? '✓ Approved' : '✕ Rejected'}
                            </span>
                            <span className="review-author">By {review.reviewer.name || review.reviewer.email}</span>
                          </div>
                          {review.comment && <p className="review-comment">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="btn-review"
                  onClick={() => openReviewModal(submission)}
                >
                  Review This
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showReviewModal && selectedSubmission && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Review Submission</h2>
            <div className="review-details">
              <p><strong>Activity:</strong> {selectedSubmission.activity.title}</p>
              <p><strong>Submitted by:</strong> {selectedSubmission.user.name || selectedSubmission.user.email}</p>
              <p><strong>Description:</strong></p>
              <p className="submission-desc">{selectedSubmission.description}</p>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              <textarea
                placeholder="Add a comment (optional)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows="4"
              />

              <div className="modal-actions review-actions">
                <button type="button" onClick={() => setShowReviewModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn-reject"
                  onClick={handleReject}
                  disabled={approving}
                >
                  {approving ? 'Processing...' : '✕ Reject'}
                </button>
                <button
                  type="button"
                  className="btn-approve"
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? 'Processing...' : '✓ Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function getPriorityLevel(points) {
  if (points >= 100) return 'critical'
  if (points >= 50) return 'high'
  if (points >= 20) return 'medium'
  return 'low'
}

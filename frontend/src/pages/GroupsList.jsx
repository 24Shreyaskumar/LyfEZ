import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import '../styles/Groups.css'

export default function GroupsList() {
  const [currentUser, setCurrentUser] = useState(null)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setCurrentUser(user)
    fetchGroups()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const res = await API.get('/groups')
      setGroups(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      await API.post('/groups', { name: groupName })
      setGroupName('')
      setShowModal(false)
      fetchGroups()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="page-container"><p>Loading groups...</p></div>

  return (
    <div className="page-container">
      <header className="app-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/')}>← Home</button>
          <h2 style={{margin: 0, marginLeft: '1rem'}}>My Groups</h2>
        </div>
        <div className="user-section">
          <span>{currentUser && (currentUser.name || currentUser.email)}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <div className="groups-header">
        <h1>My Groups</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          Create Group
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {groups.length === 0 ? (
        <div className="empty-state">
          <p>No groups yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map(group => (
            <div key={group.id} className="group-card" onClick={() => navigate(`/groups/${group.id}`)}>
              <h3>{group.name}</h3>
              <p className="member-count">{group.memberships.length} members</p>
              <div className="group-members">
                {group.memberships.slice(0, 3).map(m => (
                  <span key={m.id} className="member-badge" title={m.user.name || m.user.email}>
                    {m.user.name ? m.user.name[0] : m.user.email[0]}
                  </span>
                ))}
                {group.memberships.length > 3 && (
                  <span className="member-badge">+{group.memberships.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

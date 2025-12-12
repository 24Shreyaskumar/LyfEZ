import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Dashboard.css'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(storedUser))
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>LyfEZ Dashboard</h1>
        <div className="user-section">
          <span>Welcome, {user.name || user.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        <h2>Your Groups & Activities</h2>
        <p>Welcome to LyfEZ! Manage your groups and track activities below.</p>
        
        <section className="quick-actions">
          <h3>Quick Actions</h3>
          <button onClick={() => navigate('/groups')}>View Groups</button>
          <button onClick={() => navigate('/groups')}>Create Group</button>
          <button onClick={() => navigate('/reviews')}>Pending Reviews</button>
        </section>
      </main>
    </div>
  )
}

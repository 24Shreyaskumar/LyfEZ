import { useState, useEffect } from 'react'
import API from '../api'
import '../styles/Calendar.css'

export default function Calendar({ groupId }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dailyStatus, setDailyStatus] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDailyStatus()
  }, [currentDate, groupId])

  const fetchDailyStatus = async () => {
    try {
      setLoading(true)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      const response = await API.get(`/api/calendar/groups/${groupId}/daily-status`, {
        params: { year, month }
      })
      setDailyStatus(response.data.dailyStatus || {})
    } catch (err) {
      console.error('Failed to fetch daily status:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = []

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const status = dailyStatus[dateStr] || 'gray'
    days.push({ day, status, dateStr })
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="nav-button">← Prev</button>
        <h2>{monthName}</h2>
        <button onClick={handleNextMonth} className="nav-button">Next →</button>
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color green"></span>
          <span>All Approved</span>
        </div>
        <div className="legend-item">
          <span className="legend-color yellow"></span>
          <span>Partially Done</span>
        </div>
        <div className="legend-item">
          <span className="legend-color red"></span>
          <span>Not Done</span>
        </div>
      </div>

      <div className="weekdays">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {loading ? (
        <div className="calendar-loading">Loading...</div>
      ) : (
        <div className="calendar-days">
          {days.map((dayObj, idx) => (
            <div key={idx} className={`day ${dayObj ? `status-${dayObj.status}` : 'empty'}`}>
              {dayObj && <span className="day-number">{dayObj.day}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

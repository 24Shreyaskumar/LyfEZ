import { useState, useEffect } from 'react'
import API from '../api'
import '../styles/Calendar.css'

export default function Calendar({ groupId }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dailyStatus, setDailyStatus] = useState({})
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayDetails, setDayDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

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

  const handleDayClick = async (dateStr) => {
    setSelectedDay(dateStr)
    setDayDetails(null)
    setDetailsLoading(true)
    try {
      const resp = await API.get(`/api/calendar/groups/${groupId}/day/${dateStr}`)
      setDayDetails(resp.data)
    } catch (err) {
      console.error('Failed to fetch day details:', err)
    } finally {
      setDetailsLoading(false)
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
    // Map status labels to CSS classes: 'all done' -> 'green', 'partially done' -> 'yellow', 'not done' -> 'red'
    let cssClass = 'gray';
    if (status === 'all done') cssClass = 'green';
    else if (status === 'partially done') cssClass = 'yellow';
    else if (status === 'not done') cssClass = 'red';
    else if (status === 'gray') cssClass = 'gray';
    days.push({ day, status, dateStr, cssClass })
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
          <span>All Done</span>
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
            <div
              key={idx}
              className={`day ${dayObj ? `status-${dayObj.cssClass}` : 'empty'}`}
              onClick={dayObj ? () => handleDayClick(dayObj.dateStr) : undefined}
              role={dayObj ? 'button' : undefined}
            >
              {dayObj && <span className="day-number">{dayObj.day}</span>}
            </div>
          ))}
        </div>
      )}

      {selectedDay && (
        <div className="calendar-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Details for {selectedDay}</h3>
              <button className="close-btn" onClick={() => setSelectedDay(null)}>✕</button>
            </div>
            {detailsLoading ? (
              <p>Loading day details...</p>
            ) : dayDetails ? (
              <div className="modal-body">
                <p><strong>Status:</strong> <span style={{textTransform: 'capitalize'}}>{dayDetails.status}</span></p>
                {dayDetails.submissions && dayDetails.submissions.length > 0 ? (
                  <ul className="submission-list">
                    {dayDetails.submissions.map(s => (
                      <li key={s.id} className="submission-item">
                        <div className="submission-line">
                          <span className="submission-title">{s.activity.title}</span>
                          <span className={`submission-status ${s.status.toLowerCase()}`}>{s.status}</span>
                        </div>
                        {s.reviews && s.reviews.length > 0 && (
                          <div className="reviews">
                            <span>Reviews:</span>
                            <ul>
                              {s.reviews.map(r => (
                                <li key={r.id}>
                                  {r.approved ? '✅' : '❌'} by {r.reviewer.name || r.reviewer.email}{r.comment ? ` — ${r.comment}` : ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No submissions for this date.</p>
                )}

                {/* Submission is disabled for non-today dates */}
                <div className="submit-hint">
                  <em>Note: You cannot submit for past or future dates from here.</em>
                </div>
              </div>
            ) : (
              <p>No details available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

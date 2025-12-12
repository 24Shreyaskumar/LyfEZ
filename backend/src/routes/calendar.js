const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get daily activity status for a user in a group for a specific month
router.get('/groups/:groupId/daily-status', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { year, month } = req.query;
    const groupIdNum = parseInt(groupId);

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month required' });
    }

    const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    // Get all activities for the group
    const activities = await prisma.activity.findMany({
      where: { groupId: groupIdNum }
    });

    if (activities.length === 0) {
      return res.json({ activities: [], dailyStatus: {} });
    }

    // Get all submissions for the user in this group for the month
    const submissions = await prisma.activitySubmission.findMany({
      where: {
        userId: req.userId,
        activity: {
          groupId: groupIdNum
        },
        submissionDate: {
          gte: startDate.toISOString().split('T')[0],
          lte: endDate.toISOString().split('T')[0]
        }
      },
      include: {
        activity: true,
        reviews: true
      }
    });

    // Calculate daily status
    const dailyStatus = {};
    const daysInMonth = endDate.getDate();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
       // Only color days that have passed (before or on today)
       if (dateStr > todayStr) {
         dailyStatus[dateStr] = 'gray'; // Future dates only - no status yet
         continue;
       }

       const daySubmissions = submissions.filter(s => s.submissionDate === dateStr);

       if (daySubmissions.length === 0) {
         dailyStatus[dateStr] = 'red'; // No activities
       } else {
         const approvedCount = daySubmissions.filter(s => s.status === 'APPROVED').length;
         const totalCount = daySubmissions.length;

         if (approvedCount === totalCount) {
           dailyStatus[dateStr] = 'green'; // All approved
         } else if (approvedCount > 0) {
           dailyStatus[dateStr] = 'yellow'; // Partially approved
         } else {
           dailyStatus[dateStr] = 'red'; // None approved
         }
       }
    }

    res.json({
      activities: activities.map(a => ({ id: a.id, title: a.title, points: a.points })),
      dailyStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

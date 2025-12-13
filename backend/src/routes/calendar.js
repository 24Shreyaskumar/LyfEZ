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

       // Check status against ALL activities in the group
       let approvedActivitiesCount = 0;
       let pendingActivitiesCount = 0;

       for (const activity of activities) {
         const submission = daySubmissions.find(s => s.activityId === activity.id);
         if (!submission) {
           // Not submitted for this activity
           continue;
         } else if (submission.status === 'APPROVED') {
           approvedActivitiesCount++;
         } else if (submission.status === 'UNDER_REVIEW' || submission.status === 'PENDING') {
           pendingActivitiesCount++;
         }
       }

       // All activities approved
       if (approvedActivitiesCount === activities.length) {
         dailyStatus[dateStr] = 'all done';
       }
       // Some approved or some pending
       else if (approvedActivitiesCount > 0 || pendingActivitiesCount > 0) {
         dailyStatus[dateStr] = 'partially done';
       }
       // None approved
       else {
         dailyStatus[dateStr] = 'not done';
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
// Get detailed status for a specific day in a group for current user
router.get('/groups/:groupId/day/:date', authMiddleware, async (req, res) => {
  try {
    const { groupId, date } = req.params;
    const groupIdNum = parseInt(groupId);

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Ensure the group exists
    const group = await prisma.group.findUnique({ where: { id: groupIdNum } });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check membership
    const membership = await prisma.membership.findFirst({
      where: { groupId: groupIdNum, userId: req.userId }
    });
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get all group activities
    const allActivities = await prisma.activity.findMany({
      where: { groupId: groupIdNum }
    });

    // Fetch all submissions by the user for that date in the group
    const submissions = await prisma.activitySubmission.findMany({
      where: {
        userId: req.userId,
        submissionDate: date,
        activity: { groupId: groupIdNum }
      },
      include: {
        activity: true,
        reviews: { include: { reviewer: { select: { id: true, name: true, email: true } } } }
      }
    });

    // Aggregate status based on ALL activities
    let approvedActivitiesCount = 0;
    let pendingActivitiesCount = 0;

    for (const activity of allActivities) {
      const submission = submissions.find(s => s.activityId === activity.id);
      if (submission && submission.status === 'APPROVED') {
        approvedActivitiesCount++;
      } else if (submission && (submission.status === 'UNDER_REVIEW' || submission.status === 'PENDING')) {
        pendingActivitiesCount++;
      }
    }

    let status = 'not done';
    if (approvedActivitiesCount === allActivities.length) {
      status = 'all done';
    } else if (approvedActivitiesCount > 0 || pendingActivitiesCount > 0) {
      status = 'partially done';
    }

    res.json({
      date,
      groupId: groupIdNum,
      status,
      submissions: submissions.map(s => ({
        id: s.id,
        activity: { id: s.activity.id, title: s.activity.title, points: s.activity.points },
        description: s.description,
        status: s.status,
        reviews: s.reviews.map(r => ({ id: r.id, approved: r.approved, reviewer: r.reviewer, comment: r.comment }))
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Create an activity (admin only)
router.post('/:groupId/activities', authMiddleware, async (req, res) => {
  try {
    const { title, description, points } = req.body;
    const groupId = parseInt(req.params.groupId);

    if (!title) {
      return res.status(400).json({ error: 'Activity title is required' });
    }

    // Check if user is admin of the group
    const adminMembership = await prisma.membership.findFirst({
      where: {
        groupId,
        userId: req.userId,
        role: 'ADMIN'
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ error: 'Only admins can create activities' });
    }

    const activity = await prisma.activity.create({
      data: {
        title,
        description,
        points: points || 0,
        groupId
      }
    });

    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group activities
router.get('/:groupId/activities', authMiddleware, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);

    // Check if user is member of the group
    const membership = await prisma.membership.findFirst({
      where: { groupId, userId: req.userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const activities = await prisma.activity.findMany({
      where: { groupId },
      include: {
        submissions: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        }
      },
      orderBy: [
        { points: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activity details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        group: true,
        submissions: {
          include: {
            user: { select: { id: true, email: true, name: true } },
            reviews: {
              include: {
                reviewer: { select: { id: true, email: true, name: true } }
              }
            }
          }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Check if user is member of the group
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: activity.groupId,
        userId: req.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update activity (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, points } = req.body;
    const activityId = parseInt(req.params.id);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { group: true }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Check if user is admin
    const adminMembership = await prisma.membership.findFirst({
      where: {
        groupId: activity.groupId,
        userId: req.userId,
        role: 'ADMIN'
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ error: 'Only admins can update activities' });
    }

    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: {
        title: title || activity.title,
        description: description !== undefined ? description : activity.description,
        points: points !== undefined ? points : activity.points
      }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete activity (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { group: true }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Check if user is admin
    const adminMembership = await prisma.membership.findFirst({
      where: {
        groupId: activity.groupId,
        userId: req.userId,
        role: 'ADMIN'
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ error: 'Only admins can delete activities' });
    }

    // Find all approved submissions for this activity to remove points from memberships
    const approvedSubmissions = await prisma.activitySubmission.findMany({
      where: {
        activityId,
        status: 'APPROVED'
      },
      select: { userId: true }
    });

    // Remove points from memberships (not users) who had approved submissions
    for (const submission of approvedSubmissions) {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: submission.userId,
          groupId: activity.groupId
        }
      });

      if (membership) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: {
            points: {
              decrement: activity.points
            }
          }
        });
      }
    }

    // Delete the activity - cascade delete will handle submissions and reviews
    await prisma.activity.delete({
      where: { id: activityId }
    });

    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

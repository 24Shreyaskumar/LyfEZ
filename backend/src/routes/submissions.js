const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get user's submission for an activity (MORE SPECIFIC - MUST BE FIRST)
router.get('/:activityId/user/:userId', authMiddleware, async (req, res) => {
  try {
    const activityId = parseInt(req.params.activityId);
    const userId = parseInt(req.params.userId);

    const submission = await prisma.activitySubmission.findFirst({
      where: {
        activityId,
        userId
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        activity: { select: { id: true, title: true, points: true, group: { select: { id: true, name: true } } } },
        reviews: {
          include: {
            reviewer: { select: { id: true, email: true, name: true } }
          }
        }
      }
    });

    if (!submission) {
      return res.json(null);
    }

    // Parse JSON fields
    const parsedSubmission = {
      ...submission,
      proofImages: submission.proofImages ? JSON.parse(submission.proofImages) : [],
      taggedUsers: submission.taggedUsers ? JSON.parse(submission.taggedUsers) : []
    };

    res.json(parsedSubmission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit an activity (user submits proof)
router.post('/:activityId/submissions', authMiddleware, async (req, res) => {
  try {
    const { description, proofImages, taggedUsers } = req.body;
    const activityId = parseInt(req.params.activityId);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { group: true }
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

    // Check for existing submission for TODAY only (daily reset)
    const todayStr = new Date().toISOString().split('T')[0];
    const existingSubmission = await prisma.activitySubmission.findFirst({
      where: {
        activityId,
        userId: req.userId,
        submissionDate: todayStr
      }
    });

    // Allow resubmission only if previous submission was rejected or pending
    if (existingSubmission && (existingSubmission.status === 'APPROVED' || existingSubmission.status === 'UNDER_REVIEW')) {
      return res.status(400).json({ error: 'You have already submitted this activity' });
    }

    // If there's a rejected/pending submission for TODAY, delete it and allow new submission
    if (existingSubmission) {
      await prisma.activitySubmission.delete({
        where: { id: existingSubmission.id }
      });
    }

    const submission = await prisma.activitySubmission.create({
      data: {
        activityId,
        userId: req.userId,
        description,
        proofImages: proofImages && Array.isArray(proofImages) ? JSON.stringify(proofImages) : null,
        taggedUsers: taggedUsers ? JSON.stringify(taggedUsers) : null,
        submissionDate: new Date().toISOString().split('T')[0],
        status: 'UNDER_REVIEW'
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        activity: { select: { id: true, title: true, points: true } },
        reviews: {
          include: {
            reviewer: { select: { id: true, email: true, name: true } }
          }
        }
      }
    });

    // Parse JSON fields for response
    const responseSubmission = {
      ...submission,
      proofImages: submission.proofImages ? JSON.parse(submission.proofImages) : [],
      taggedUsers: submission.taggedUsers ? JSON.parse(submission.taggedUsers) : []
    };

    res.status(201).json(responseSubmission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get submissions for an activity
router.get('/:activityId/submissions', authMiddleware, async (req, res) => {
  try {
    const activityId = parseInt(req.params.activityId);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { group: true }
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    // Check if user is member
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: activity.groupId,
        userId: req.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const submissions = await prisma.activitySubmission.findMany({
      where: { activityId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        activity: { select: { id: true, title: true, points: true, group: { select: { id: true, name: true } } } },
        reviews: {
          include: {
            reviewer: { select: { id: true, email: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Parse JSON fields for all submissions
    const parsedSubmissions = submissions.map(sub => ({
      ...sub,
      proofImages: sub.proofImages ? JSON.parse(sub.proofImages) : [],
      taggedUsers: sub.taggedUsers ? JSON.parse(sub.taggedUsers) : []
    }));

    res.json(parsedSubmissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get pending reviews for current user (MORE SPECIFIC - MUST BE FIRST)
router.get('/user/pending', authMiddleware, async (req, res) => {
  try {
    const groupIds = await prisma.membership.findMany({
      where: { userId: req.userId },
      select: { groupId: true }
    });

    const groupIdList = groupIds.map(g => g.groupId);

    const pendingSubmissions = await prisma.activitySubmission.findMany({
      where: {
        activity: {
          groupId: { in: groupIdList }
        },
        status: { in: ['PENDING', 'UNDER_REVIEW'] },
        userId: { not: req.userId }
      },
      include: {
        activity: {
          include: {
            group: { select: { id: true, name: true } }
          }
        },
        user: { select: { id: true, email: true, name: true } },
        reviews: {
          where: { reviewerId: req.userId },
          include: {
            reviewer: { select: { id: true, email: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Filter out submissions already reviewed by current user
    const unreviewed = pendingSubmissions.filter(s => s.reviews.length === 0);
    
    console.log(`[REVIEWS] User ${req.userId} pending reviews request:`);
    console.log(`[REVIEWS] Total pending submissions in user's groups: ${pendingSubmissions.length}`);
    console.log(`[REVIEWS] Unreviewed by user: ${unreviewed.length}`);

    // Parse JSON fields for all submissions
    const parsedSubmissions = unreviewed.map(sub => ({
      ...sub,
      proofImages: sub.proofImages ? JSON.parse(sub.proofImages) : [],
      taggedUsers: sub.taggedUsers ? JSON.parse(sub.taggedUsers) : []
    }));

    res.json(parsedSubmissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a review (approve or reject)
router.post('/:submissionId/reviews', authMiddleware, async (req, res) => {
  try {
    const { approved, comment } = req.body;
    const submissionId = parseInt(req.params.submissionId);
  console.log(`\n[REVIEW] POST /reviews/${submissionId}/reviews - approved=${approved}, reviewer=${req.userId}`);

    const submission = await prisma.activitySubmission.findUnique({
      where: { id: submissionId },
      include: {
        activity: true,
        user: true
      }
    });

    if (!submission) {
        console.log(`[REVIEW] ✗ Submission not found`);
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Can't review own submission
    if (submission.userId === req.userId) {
        console.log(`[REVIEW] ✗ Cannot review own submission`);
      return res.status(400).json({ error: 'Cannot review your own submission' });
    }

    // Check if user is member of the group
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: submission.activity.groupId,
        userId: req.userId
      }
    });

    if (!membership) {
        console.log(`[REVIEW] ✗ Not a member of group ${submission.activity.groupId}`);
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        submissionId,
        reviewerId: req.userId
      }
    });

    if (existingReview) {
        console.log(`[REVIEW] ✗ Already reviewed by user ${req.userId}`);
      return res.status(400).json({ error: 'You have already reviewed this submission' });
    }

    // Create review
      console.log(`[REVIEW] Creating review for submission ${submissionId}...`);
    const review = await prisma.review.create({
      data: {
        submissionId,
        reviewerId: req.userId,
        approved,
        comment
      },
      include: {
        reviewer: { select: { id: true, email: true, name: true } }
      }
    });

    // Check if we should update submission status based on approvals vs rejections
    const allReviews = await prisma.review.findMany({
      where: { submissionId }
    });

    const groupMemberCount = await prisma.membership.count({
      where: { groupId: submission.activity.groupId }
    });

    const approvalCount = allReviews.filter(r => r.approved).length;
    const rejectionCount = allReviews.filter(r => !r.approved).length;

    // Majority rule: need ceil(total_members / 2)
    const required = Math.ceil(groupMemberCount / 2);
    console.log(`[REVIEW] Required approvals/rejections for decision: ${required}`);

    console.log(`\n[REVIEW] Review created for submission ${submissionId}`);
    console.log(`[REVIEW] All reviews in DB:`, allReviews.map(r => ({ id: r.id, submissionId: r.submissionId, approved: r.approved, reviewerId: r.reviewerId })));
    console.log(`[REVIEW] Group members: ${groupMemberCount}`);
    console.log(`[REVIEW] Approvals: ${approvalCount}, Rejections: ${rejectionCount}`);
    console.log(`[REVIEW] Current submission status: ${submission.status}`);

    let newStatus = submission.status; // Keep current status by default
    let shouldAwardPoints = false;

    // Majority-based decision
    if (approvalCount >= required) {
      newStatus = 'APPROVED';
      shouldAwardPoints = true;
      console.log(`[REVIEW] ✓ APPROVALS >= REQUIRED (${approvalCount}/${required}) → APPROVED`);
    } else if (rejectionCount >= required) {
      newStatus = 'REJECTED';
      console.log(`[REVIEW] ✗ REJECTIONS >= REQUIRED (${rejectionCount}/${required}) → REJECTED`);
    } else {
      newStatus = 'UNDER_REVIEW';
      console.log(`[REVIEW] Pending more reviews (${approvalCount} approvals, ${rejectionCount} rejections, required ${required})`);
    }

    // Update status if changed
    if (newStatus !== submission.status) {
      const updated = await prisma.activitySubmission.update({
        where: { id: submissionId },
        data: { status: newStatus },
        include: { activity: true, user: true }
      });
      console.log(`[REVIEW] ✓ Submission status updated from ${submission.status} to ${updated.status}`);

      // Award points only if approved AND status was just changed to approved
      if (shouldAwardPoints && submission.status !== 'APPROVED') {
        const updatedUser = await prisma.user.update({
          where: { id: submission.userId },
          data: {
            points: {
              increment: submission.activity.points
            }
          },
          select: { id: true, points: true }
        });
        console.log(`[REVIEW] ✓ Points awarded to user ${submission.userId}: new total = ${updatedUser.points}`);
      } else if (shouldAwardPoints && submission.status === 'APPROVED') {
        console.log(`[REVIEW] ! Points NOT awarded - submission was already APPROVED`);
      }
    } else {
      console.log(`[REVIEW] ✗ Status unchanged - still ${submission.status}`);
    }

    // Return the submission with updated status
    const updatedSubmission = await prisma.activitySubmission.findUnique({
      where: { id: submissionId },
      include: {
        activity: true,
        user: { select: { id: true, email: true, name: true } },
        reviews: {
          include: {
            reviewer: { select: { id: true, email: true, name: true } }
          }
        }
      }
    });

    res.status(201).json(updatedSubmission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get reviews for a submission
router.get('/:submissionId/reviews', authMiddleware, async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId);

    const submission = await prisma.activitySubmission.findUnique({
      where: { id: submissionId },
      include: { activity: true }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check if user is member
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: submission.activity.groupId,
        userId: req.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const reviews = await prisma.review.findMany({
      where: { submissionId },
      include: {
        reviewer: { select: { id: true, email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

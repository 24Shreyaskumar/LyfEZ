const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Create a new group (creator becomes admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        memberships: {
          create: {
            userId: req.userId,
            role: 'ADMIN'
          }
        }
      },
      include: { memberships: true }
    });

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's groups
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        memberships: {
          some: {
            userId: req.userId
          }
        }
      },
      include: {
        memberships: {
          include: { user: { select: { id: true, email: true, name: true, points: true } } }
        }
      }
    });

    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        memberships: {
          include: { user: { select: { id: true, email: true, name: true, points: true } } }
        },
        activities: true
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is member
    const isMember = group.memberships.some(m => m.userId === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add member to group (admin only)
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const groupId = parseInt(req.params.id);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if requester is admin
    const adminMembership = await prisma.membership.findFirst({
      where: {
        groupId,
        userId: req.userId,
        role: 'ADMIN'
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const existingMember = await prisma.membership.findFirst({
      where: { groupId, userId: user.id }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member
    const membership = await prisma.membership.create({
      data: {
        groupId,
        userId: user.id,
        role: 'MEMBER'
      },
      include: {
        user: { select: { id: true, email: true, name: true } }
      }
    });

    res.status(201).json(membership);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group members
router.get('/:id/members', authMiddleware, async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Check if user is member
    const membership = await prisma.membership.findFirst({
      where: { groupId, userId: req.userId }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const members = await prisma.membership.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, email: true, name: true } }
      }
    });

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove member from group (admin only)
router.delete('/:groupId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const groupIdNum = parseInt(groupId);
    const memberIdNum = parseInt(memberId);

    // Check if requester is admin
    const adminMembership = await prisma.membership.findFirst({
      where: {
        groupId: groupIdNum,
        userId: req.userId,
        role: 'ADMIN'
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    // Prevent removing self
    if (memberIdNum === req.userId) {
      return res.status(400).json({ error: 'Cannot remove yourself from the group' });
    }

    // Check if member exists
    const memberToRemove = await prisma.membership.findUnique({
      where: { id: memberIdNum }
    });

    if (!memberToRemove || memberToRemove.groupId !== groupIdNum) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent removing the last admin
    const adminCount = await prisma.membership.count({
      where: {
        groupId: groupIdNum,
        role: 'ADMIN'
      }
    });

    if (memberToRemove.role === 'ADMIN' && adminCount === 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin' });
    }

    // Remove member
    await prisma.membership.delete({
      where: { id: memberIdNum }
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user points manually
router.put('/:groupId/members/:userId/points', authMiddleware, async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { points } = req.body;
    const groupIdNum = parseInt(groupId);
    const userIdNum = parseInt(userId);

    // Check if requester is admin
    const adminMembership = await prisma.membership.findFirst({
      where: {
        groupId: groupIdNum,
        userId: req.userId,
        role: 'ADMIN'
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ error: 'Only admins can update member points' });
    }

    // Check if user exists in the group
    const membership = await prisma.membership.findFirst({
      where: {
        groupId: groupIdNum,
        userId: userIdNum
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    // Update user points
    const updatedUser = await prisma.user.update({
      where: { id: userIdNum },
      data: { points: parseInt(points) }
    });

    res.json({ message: 'Points updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

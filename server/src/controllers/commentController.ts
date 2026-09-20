import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const boardId = req.params.boardId as string;
    const comments = await prisma.comment.findMany({
      where: { whiteboardId: boardId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error fetching comments' });
  }
};

export const createComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const boardId = req.params.boardId as string;
    const { x, y, text } = req.body;
    let userId = req.user?.id;

    if (!text || x === undefined || y === undefined) {
      res.status(400).json({ error: 'Text, x, and y coordinates are required' });
      return;
    }

    if (!userId || userId.startsWith('guest_')) {
      let defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        defaultUser = await prisma.user.create({
          data: {
            name: req.user?.name || 'Guest User',
            email: 'guest@inkspace.app',
            passwordHash: 'dummy',
          },
        });
      }
      userId = defaultUser.id;
    }

    const comment = await prisma.comment.create({
      data: {
        whiteboardId: boardId,
        userId,
        x: parseFloat(x),
        y: parseFloat(y),
        text,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error creating comment' });
  }
};

export const toggleResolveComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { resolved: !existing.resolved },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    res.json({ comment: updated });
  } catch (error) {
    console.error('Resolve comment error:', error);
    res.status(500).json({ error: 'Internal server error updating comment' });
  }
};

export const deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.comment.delete({ where: { id } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error deleting comment' });
  }
};

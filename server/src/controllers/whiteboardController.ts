import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper to get or create a default demo user if needed
async function getOrCreateSystemUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Demo Creator',
        email: 'creator@inkspace.app',
        passwordHash: 'dummy_hash',
      },
    });
  }
  return user;
}

export const createBoard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, canvasData, viewState, thumbnail } = req.body;
    let ownerId = req.user?.id;

    if (!ownerId || ownerId.startsWith('guest_')) {
      const defaultUser = await getOrCreateSystemUser();
      ownerId = defaultUser.id;
    }

    const board = await prisma.whiteboard.create({
      data: {
        title: title || 'Untitled Whiteboard',
        ownerId,
        canvasData: canvasData ? (typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData)) : '[]',
        viewState: viewState ? (typeof viewState === 'string' ? viewState : JSON.stringify(viewState)) : '{"scrollX":0,"scrollY":0,"zoom":1}',
        thumbnail: thumbnail || null,
        isPublic: true,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Create initial version snapshot
    await prisma.boardVersion.create({
      data: {
        whiteboardId: board.id,
        name: 'Initial State',
        canvasData: board.canvasData,
      },
    });

    res.status(201).json({ board });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Internal server error creating whiteboard' });
  }
};

export const getBoards = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { search, filter } = req.query;

    const whereClause: any = {};

    if (userId && !userId.startsWith('guest_')) {
      if (filter === 'shared') {
        whereClause.collaborators = {
          some: { userId },
        };
      } else if (filter === 'owned') {
        whereClause.ownerId = userId;
      } else {
        whereClause.OR = [
          { ownerId: userId },
          { collaborators: { some: { userId } } },
          { isPublic: true },
        ];
      }
    } else {
      // Guest or public: show public boards
      whereClause.isPublic = true;
    }

    if (search && typeof search === 'string') {
      whereClause.title = {
        contains: search,
      };
    }

    const boards = await prisma.whiteboard.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: {
          select: { comments: true, versions: true },
        },
      },
    });

    res.json({ boards });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Internal server error fetching whiteboards' });
  }
};

export const getBoardById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const board = await prisma.whiteboard.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        versions: {
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    // Determine current user's permission
    const currentUserId = req.user?.id;
    let permission = 'VIEW';
    if (currentUserId && (board.ownerId === currentUserId || !board.ownerId)) {
      permission = 'OWNER';
    } else if (currentUserId) {
      const collab = board.collaborators?.find((c: any) => c.userId === currentUserId);
      if (collab) {
        permission = collab.permission;
      } else if (board.isPublic) {
        permission = 'EDIT';
      }
    } else if (board.isPublic) {
      permission = 'EDIT';
    }

    res.json({ board, permission });
  } catch (error) {
    console.error('Get board by id error:', error);
    res.status(500).json({ error: 'Internal server error fetching whiteboard' });
  }
};

export const updateBoard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, canvasData, viewState, thumbnail, isPublic } = req.body;

    const existingBoard = await prisma.whiteboard.findUnique({ where: { id } });
    if (!existingBoard) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    const updated = await prisma.whiteboard.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(canvasData !== undefined && {
          canvasData: typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData),
        }),
        ...(viewState !== undefined && {
          viewState: typeof viewState === 'string' ? viewState : JSON.stringify(viewState),
        }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    res.json({ board: updated });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Internal server error updating whiteboard' });
  }
};

export const deleteBoard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.whiteboard.delete({ where: { id } });
    res.json({ success: true, message: 'Whiteboard deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Internal server error deleting whiteboard' });
  }
};

export const duplicateBoard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const original = await prisma.whiteboard.findUnique({ where: { id } });
    if (!original) {
      res.status(404).json({ error: 'Original whiteboard not found' });
      return;
    }

    let ownerId = req.user?.id;
    if (!ownerId || ownerId.startsWith('guest_')) {
      ownerId = original.ownerId;
    }

    const copy = await prisma.whiteboard.create({
      data: {
        title: `${original.title} (Copy)`,
        ownerId,
        canvasData: original.canvasData,
        viewState: original.viewState,
        thumbnail: original.thumbnail,
        isPublic: original.isPublic,
      },
    });

    res.status(201).json({ board: copy });
  } catch (error) {
    console.error('Duplicate board error:', error);
    res.status(500).json({ error: 'Internal server error duplicating whiteboard' });
  }
};

export const createVersion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    const board = await prisma.whiteboard.findUnique({ where: { id } });
    if (!board) {
      res.status(404).json({ error: 'Whiteboard not found' });
      return;
    }

    const version = await prisma.boardVersion.create({
      data: {
        whiteboardId: id,
        name: name || `Snapshot ${new Date().toLocaleTimeString()}`,
        canvasData: board.canvasData,
      },
    });

    res.status(201).json({ version });
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: 'Internal server error creating snapshot' });
  }
};

export const getVersions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const versions = await prisma.boardVersion.findMany({
      where: { whiteboardId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ versions });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Internal server error fetching versions' });
  }
};

export const restoreVersion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const versionId = req.params.versionId as string;

    const version = await prisma.boardVersion.findUnique({ where: { id: versionId } });
    if (!version || version.whiteboardId !== id) {
      res.status(404).json({ error: 'Version snapshot not found' });
      return;
    }

    const updated = await prisma.whiteboard.update({
      where: { id },
      data: {
        canvasData: version.canvasData,
      },
    });

    res.json({ board: updated, message: 'Restored snapshot successfully' });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: 'Internal server error restoring snapshot' });
  }
};

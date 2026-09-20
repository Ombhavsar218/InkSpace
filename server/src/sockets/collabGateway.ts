import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../utils/prisma';

interface UserPresence {
  socketId: string;
  userId: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  selectedElementIds?: string[];
}

interface RoomState {
  users: Map<string, UserPresence>; // socketId -> UserPresence
  lockedElements: Map<string, string>; // elementId -> socketId
}

const roomStates = new Map<string, RoomState>();

export function setupSocketGateway(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    let currentBoardId: string | null = null;
    let currentUser: UserPresence | null = null;

    socket.on('join-board', async (data: { boardId: string; userId: string; name: string; color: string; avatar?: string }) => {
      const { boardId, userId, name, color, avatar } = data;
      currentBoardId = boardId;
      currentUser = {
        socketId: socket.id,
        userId,
        name: name || 'Anonymous',
        color: color || '#8b5cf6',
        avatar,
      };

      socket.join(`board:${boardId}`);

      if (!roomStates.has(boardId)) {
        roomStates.set(boardId, {
          users: new Map(),
          lockedElements: new Map(),
        });
      }

      const room = roomStates.get(boardId)!;
      room.users.set(socket.id, currentUser);

      // Notify everyone in the room about updated presence
      const userList = Array.from(room.users.values());
      io.to(`board:${boardId}`).emit('presence-update', userList);

      // Send currently locked elements to the newly joined user
      const locks: Record<string, string> = {};
      room.lockedElements.forEach((sId, elId) => {
        const u = room.users.get(sId);
        if (u) locks[elId] = u.name;
      });
      socket.emit('locks-sync', locks);
    });

    socket.on('cursor-move', (data: { x: number; y: number; selectedElementIds?: string[] }) => {
      if (!currentBoardId || !currentUser) return;

      currentUser.cursor = { x: data.x, y: data.y };
      currentUser.selectedElementIds = data.selectedElementIds;

      socket.to(`board:${currentBoardId}`).emit('cursor-update', {
        socketId: socket.id,
        userId: currentUser.userId,
        name: currentUser.name,
        color: currentUser.color,
        x: data.x,
        y: data.y,
        selectedElementIds: data.selectedElementIds || [],
      });
    });

    socket.on('cursor-leave', () => {
      if (!currentBoardId || !currentUser) return;
      currentUser.cursor = undefined;
      socket.to(`board:${currentBoardId}`).emit('cursor-removed', {
        socketId: socket.id,
      });
    });

    socket.on('elements-change', async (data: { elements: any[]; viewState?: any; saveToDb?: boolean }) => {
      if (!currentBoardId) return;

      // Broadcast changes to all other peers in the room immediately
      socket.to(`board:${currentBoardId}`).emit('elements-sync', {
        elements: data.elements,
        senderId: socket.id,
      });

      // Save to database if requested
      if (data.saveToDb) {
        try {
          await prisma.whiteboard.update({
            where: { id: currentBoardId },
            data: {
              canvasData: JSON.stringify(data.elements),
              ...(data.viewState && { viewState: JSON.stringify(data.viewState) }),
            },
          });
        } catch (err) {
          console.error(`Failed to auto-save board ${currentBoardId}:`, err);
        }
      }
    });

    socket.on('element-lock', (elementId: string) => {
      if (!currentBoardId || !currentUser) return;
      const room = roomStates.get(currentBoardId);
      if (room) {
        room.lockedElements.set(elementId, socket.id);
        socket.to(`board:${currentBoardId}`).emit('element-locked', {
          elementId,
          userId: currentUser.userId,
          userName: currentUser.name,
          color: currentUser.color,
        });
      }
    });

    socket.on('element-unlock', (elementId: string) => {
      if (!currentBoardId) return;
      const room = roomStates.get(currentBoardId);
      if (room) {
        room.lockedElements.delete(elementId);
        socket.to(`board:${currentBoardId}`).emit('element-unlocked', { elementId });
      }
    });

    socket.on('laser-point', (point: { x: number; y: number; color?: string }) => {
      if (!currentBoardId || !currentUser) return;
      socket.to(`board:${currentBoardId}`).emit('laser-point-sync', {
        x: point.x,
        y: point.y,
        userId: currentUser.userId,
        color: point.color || currentUser.color,
      });
    });

    socket.on('new-comment', (comment: any) => {
      if (!currentBoardId) return;
      socket.to(`board:${currentBoardId}`).emit('comment-broadcast', comment);
    });

    socket.on('disconnect', () => {
      if (currentBoardId && roomStates.has(currentBoardId)) {
        const room = roomStates.get(currentBoardId)!;
        room.users.delete(socket.id);

        // Remove any locks owned by this socket
        for (const [elId, sId] of room.lockedElements.entries()) {
          if (sId === socket.id) {
            room.lockedElements.delete(elId);
            socket.to(`board:${currentBoardId}`).emit('element-unlocked', { elementId: elId });
          }
        }

        const userList = Array.from(room.users.values());
        io.to(`board:${currentBoardId}`).emit('presence-update', userList);
        io.to(`board:${currentBoardId}`).emit('cursor-removed', { socketId: socket.id });

        if (room.users.size === 0) {
          roomStates.delete(currentBoardId);
        }
      }
    });
  });
}

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { CanvasElement, Comment, PresenceUser, User } from '../types';
import { useCanvasStore } from './useCanvasStore';
import { apiRequest } from '../utils/api';

// Distinct curated avatar colors for collaborators
export const COLLAB_COLORS = [
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#84cc16', // Lime
];

interface CollabStoreState {
  socket: Socket | null;
  isConnected: boolean;
  activeUsers: PresenceUser[];
  remoteCursors: Map<string, PresenceUser>;
  lockedElements: Record<string, string>; // elementId -> userName
  permission: 'VIEW' | 'EDIT' | 'OWNER';
  userColor: string;

  comments: Comment[];
  isCommentsVisible: boolean;
  activeCommentPin: { x: number; y: number } | null;

  initSocket: (boardId: string, user: User | null) => void;
  disconnectSocket: () => void;
  sendCursorMove: (x: number, y: number, selectedElementIds?: string[]) => void;
  sendCursorLeave: () => void;
  sendElementsChange: (elements: CanvasElement[], saveToDb?: boolean) => void;
  lockElement: (elementId: string) => void;
  unlockElement: (elementId: string) => void;
  sendLaserPoint: (x: number, y: number) => void;

  setPermission: (perm: 'VIEW' | 'EDIT' | 'OWNER') => void;
  toggleCommentsVisibility: () => void;
  setActiveCommentPin: (pin: { x: number; y: number } | null) => void;
  loadComments: (boardId: string) => Promise<void>;
  createComment: (boardId: string, text: string, x: number, y: number) => Promise<void>;
  toggleResolveComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export const useCollabStore = create<CollabStoreState>((set, get) => ({
  socket: null,
  isConnected: false,
  activeUsers: [],
  remoteCursors: new Map(),
  lockedElements: {},
  permission: 'EDIT',
  userColor: COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)],

  comments: [],
  isCommentsVisible: true,
  activeCommentPin: null,

  setPermission: (permission) => set({ permission }),
  toggleCommentsVisibility: () => set((state) => ({ isCommentsVisible: !state.isCommentsVisible })),
  setActiveCommentPin: (activeCommentPin) => set({ activeCommentPin }),

  initSocket: (boardId: string, user: User | null) => {
    const existingSocket = get().socket;
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const { userColor } = get();
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('join-board', {
        boardId,
        userId: user?.id || `guest_${socket.id}`,
        name: user?.name || 'Guest User',
        color: userColor,
        avatar: user?.avatar,
      });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false, activeUsers: [], remoteCursors: new Map() });
    });

    socket.on('presence-update', (users: PresenceUser[]) => {
      set({ activeUsers: users });
    });

    socket.on('cursor-update', (data: PresenceUser) => {
      set((state) => {
        const next = new Map(state.remoteCursors);
        next.set(data.socketId, data);
        return { remoteCursors: next };
      });
    });

    socket.on('cursor-removed', (data: { socketId: string }) => {
      set((state) => {
        const next = new Map(state.remoteCursors);
        next.delete(data.socketId);
        return { remoteCursors: next };
      });
    });

    socket.on('elements-sync', (data: { elements: CanvasElement[]; senderId: string }) => {
      if (data.senderId !== socket.id) {
        useCanvasStore.getState().setElements(data.elements, false);
      }
    });

    socket.on('locks-sync', (locks: Record<string, string>) => {
      set({ lockedElements: locks });
    });

    socket.on('element-locked', (data: { elementId: string; userName: string }) => {
      set((state) => ({
        lockedElements: { ...state.lockedElements, [data.elementId]: data.userName },
      }));
    });

    socket.on('element-unlocked', (data: { elementId: string }) => {
      set((state) => {
        const next = { ...state.lockedElements };
        delete next[data.elementId];
        return { lockedElements: next };
      });
    });

    socket.on('laser-point-sync', (data: { x: number; y: number; color?: string }) => {
      useCanvasStore.getState().addLaserPoint({ x: data.x, y: data.y }, data.color);
    });

    socket.on('comment-broadcast', (comment: Comment) => {
      set((state) => ({
        comments: [...state.comments.filter((c) => c.id !== comment.id), comment],
      }));
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, activeUsers: [], remoteCursors: new Map() });
    }
  },

  sendCursorMove: (x, y, selectedElementIds) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('cursor-move', { x, y, selectedElementIds });
    }
  },

  sendCursorLeave: () => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('cursor-leave');
    }
  },

  sendElementsChange: (elements, saveToDb = false) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('elements-change', {
        elements,
        saveToDb,
      });
    }
  },

  lockElement: (elementId) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('element-lock', elementId);
    }
  },

  unlockElement: (elementId) => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('element-unlock', elementId);
    }
  },

  sendLaserPoint: (x, y) => {
    const { socket } = get();
    const color = useCanvasStore.getState().laserColor;
    useCanvasStore.getState().addLaserPoint({ x, y }, color);
    if (socket && socket.connected) {
      socket.emit('laser-point', { x, y, color });
    }
  },

  loadComments: async (boardId: string) => {
    try {
      const res = await apiRequest(`/comments/board/${boardId}`);
      set({ comments: res.comments || [] });
    } catch (e) {
      console.error('Failed to load comments:', e);
    }
  },

  createComment: async (boardId: string, text: string, x: number, y: number) => {
    try {
      const res = await apiRequest(`/comments/board/${boardId}`, {
        method: 'POST',
        body: JSON.stringify({ text, x, y }),
      });
      if (res.comment) {
        set((state) => ({ comments: [...state.comments, res.comment], activeCommentPin: null }));
        const { socket } = get();
        if (socket && socket.connected) {
          socket.emit('new-comment', res.comment);
        }
      }
    } catch (e) {
      console.error('Failed to create comment:', e);
    }
  },

  toggleResolveComment: async (commentId: string) => {
    try {
      const res = await apiRequest(`/comments/${commentId}/resolve`, {
        method: 'PATCH',
      });
      if (res.comment) {
        set((state) => ({
          comments: state.comments.map((c) => (c.id === commentId ? res.comment : c)),
        }));
      }
    } catch (e) {
      console.error('Failed to toggle comment resolve:', e);
    }
  },

  deleteComment: async (commentId: string) => {
    try {
      await apiRequest(`/comments/${commentId}`, {
        method: 'DELETE',
      });
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== commentId),
      }));
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  },
}));

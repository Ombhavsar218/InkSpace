import React from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';

export const LiveCursors: React.FC = () => {
  const { remoteCursors } = useCollabStore();
  const { viewState, elements } = useCanvasStore();

  const cursorsList = Array.from(remoteCursors.values());

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {cursorsList.map((peer) => {
        if (!peer.cursor) return null;

        const screenX = peer.cursor.x * viewState.zoom + viewState.scrollX;
        const screenY = peer.cursor.y * viewState.zoom + viewState.scrollY;

        // Skip if outside viewport
        if (
          screenX < -50 ||
          screenY < -50 ||
          screenX > window.innerWidth + 50 ||
          screenY > window.innerHeight + 50
        ) {
          return null;
        }

        return (
          <div
            key={peer.socketId}
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
              transition: 'transform 0.08s ease-out',
            }}
            className="absolute top-0 left-0"
          >
            {/* Custom Pointer Arrow SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={peer.color || '#8b5cf6'}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </svg>

            {/* Name Badge */}
            <div
              style={{ backgroundColor: peer.color || '#8b5cf6' }}
              className="absolute left-4 top-4 px-2 py-0.5 rounded-full text-white text-[11px] font-bold whitespace-nowrap shadow-lg flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{peer.name || 'Anonymous'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

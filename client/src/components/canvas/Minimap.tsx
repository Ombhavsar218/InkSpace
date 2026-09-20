import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { getSelectionBounds } from '../../engine/geometry';

export const Minimap: React.FC = () => {
  const { elements, viewState, setViewState } = useCanvasStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mapWidth = 180;
  const mapHeight = 120;

  useEffect(() => {
    if (isCollapsed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, mapWidth, mapHeight);

    // Compute bounding box of all elements or fallback
    const allBounds = getSelectionBounds(elements) || {
      minX: -500,
      minY: -500,
      maxX: 500,
      maxY: 500,
      width: 1000,
      height: 1000,
      centerX: 0,
      centerY: 0,
    };

    const pad = 200;
    const worldMinX = allBounds.minX - pad;
    const worldMinY = allBounds.minY - pad;
    const worldW = allBounds.width + pad * 2;
    const worldH = allBounds.height + pad * 2;

    const scale = Math.min(mapWidth / worldW, mapHeight / worldH);

    // Draw element outlines
    ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
    for (const el of elements) {
      const mx = (el.x - worldMinX) * scale;
      const my = (el.y - worldMinY) * scale;
      const mw = Math.max(2, Math.abs(el.width) * scale);
      const mh = Math.max(2, Math.abs(el.height) * scale);
      ctx.fillRect(mx, my, mw, mh);
    }

    // Draw Viewport rectangle
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const viewWorldX = -viewState.scrollX / viewState.zoom;
    const viewWorldY = -viewState.scrollY / viewState.zoom;
    const viewWorldW = screenW / viewState.zoom;
    const viewWorldH = screenH / viewState.zoom;

    const vx = (viewWorldX - worldMinX) * scale;
    const vy = (viewWorldY - worldMinY) * scale;
    const vw = viewWorldW * scale;
    const vh = viewWorldH * scale;

    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.strokeRect(vx, vy, vw, vh);
  }, [elements, viewState, isCollapsed]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const allBounds = getSelectionBounds(elements) || {
      minX: -500,
      minY: -500,
      maxX: 500,
      maxY: 500,
      width: 1000,
      height: 1000,
      centerX: 0,
      centerY: 0,
    };

    const pad = 200;
    const worldMinX = allBounds.minX - pad;
    const worldMinY = allBounds.minY - pad;
    const worldW = allBounds.width + pad * 2;
    const worldH = allBounds.height + pad * 2;
    const scale = Math.min(mapWidth / worldW, mapHeight / worldH);

    const targetWorldX = worldMinX + clickX / scale;
    const targetWorldY = worldMinY + clickY / scale;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    setViewState({
      scrollX: screenW / 2 - targetWorldX * viewState.zoom,
      scrollY: screenH / 2 - targetWorldY * viewState.zoom,
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-20 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl p-2 shadow-glass-light dark:shadow-glass pointer-events-auto select-none transition-all">
      <div className="flex items-center justify-between gap-2 pb-1.5 px-1 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-aura-500" />
          <span>Minimap</span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <canvas
          ref={canvasRef}
          width={mapWidth}
          height={mapHeight}
          onClick={handleMinimapClick}
          className="w-[180px] h-[120px] rounded-xl bg-slate-50 dark:bg-canvas-darker/60 cursor-pointer mt-1.5 border border-slate-200/50 dark:border-slate-800"
        />
      )}
    </div>
  );
};

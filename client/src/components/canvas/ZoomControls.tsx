import React from 'react';
import {
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  Grid,
  CircleDot,
  Plus as CrossIcon,
  EyeOff,
} from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { GridType } from '../../types';

export const ZoomControls: React.FC = () => {
  const {
    viewState,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToContent,
    gridType,
    setGridType,
  } = useCanvasStore();

  const zoomPercent = Math.round(viewState.zoom * 100);

  const cycleGrid = () => {
    const types: GridType[] = ['dots', 'grid', 'cross', 'none'];
    const nextIdx = (types.indexOf(gridType) + 1) % types.length;
    setGridType(types[nextIdx]);
  };

  return (
    <div className="fixed bottom-4 left-4 z-20 flex items-center gap-1.5 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl p-1.5 shadow-glass-light dark:shadow-glass pointer-events-auto select-none">
      {/* Zoom Out */}
      <button
        onClick={zoomOut}
        title="Zoom Out (Ctrl -)"
        className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Zoom % / Reset */}
      <button
        onClick={resetZoom}
        title="Reset Zoom to 100% (Ctrl 0)"
        className="px-2 py-1 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-w-[52px] text-center transition-colors"
      >
        {zoomPercent}%
      </button>

      {/* Zoom In */}
      <button
        onClick={zoomIn}
        title="Zoom In (Ctrl +)"
        className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>

      <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

      {/* Fit to Content */}
      <button
        onClick={fitToContent}
        title="Fit to Screen (Shift 1)"
        className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Cycle Grid Style */}
      <button
        onClick={cycleGrid}
        title={`Grid Style: ${gridType} (Click to toggle)`}
        className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {gridType === 'dots' ? (
          <CircleDot className="w-4 h-4 text-aura-500" />
        ) : gridType === 'grid' ? (
          <Grid className="w-4 h-4 text-aura-500" />
        ) : gridType === 'cross' ? (
          <CrossIcon className="w-4 h-4 text-aura-500" />
        ) : (
          <EyeOff className="w-4 h-4 text-slate-400" />
        )}
      </button>
    </div>
  );
};

import React, { useRef } from 'react';
import {
  MousePointer,
  Hand,
  Square,
  Circle,
  Diamond,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  StickyNote,
  Image as ImageIcon,
  Eraser,
  Sparkle,
  Lock,
  Unlock,
} from 'lucide-react';
import { ToolType } from '../../types';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';

interface ToolItem {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TOOLS: ToolItem[] = [
  { id: 'select', label: 'Selection', shortcut: 'V', icon: MousePointer },
  { id: 'hand', label: 'Hand (Pan)', shortcut: 'H', icon: Hand },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'diamond', label: 'Diamond', shortcut: 'D', icon: Diamond },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowRight },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'freedraw', label: 'Pencil / Draw', shortcut: 'P', icon: Pencil },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { id: 'sticky', label: 'Sticky Note', shortcut: 'S', icon: StickyNote },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
  { id: 'laser', label: 'Laser Pointer', shortcut: 'K', icon: Sparkle },
];

export const MainToolbar: React.FC = () => {
  const { tool, setTool, isKeepToolActive, setIsKeepToolActive, addElement, viewState } =
    useCanvasStore();
  const { permission } = useCollabStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isReadOnly = permission === 'VIEW';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        // Place in center of screen
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const worldX = (screenCenterX - viewState.scrollX) / viewState.zoom;
        const worldY = (screenCenterY - viewState.scrollY) / viewState.zoom;

        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w *= ratio;
          h *= ratio;
        }

        addElement({
          id: `img_${Date.now()}`,
          type: 'image',
          x: worldX - w / 2,
          y: worldY - h / 2,
          width: w,
          height: h,
          angle: 0,
          strokeColor: '#8b5cf6',
          fillColor: 'transparent',
          fillStyle: 'none',
          strokeWidth: 2,
          strokeStyle: 'solid',
          roughness: 1,
          opacity: 100,
          roundness: 0,
          imageUrl: dataUrl,
          aspectRatioLocked: true,
          zIndex: 100,
          seed: Math.floor(Math.random() * 10000),
        });
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl p-1.5 shadow-glass-light dark:shadow-glass pointer-events-auto transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Hidden image input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Primary Tools */}
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const isActive = tool === t.id;

        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            disabled={isReadOnly && t.id !== 'select' && t.id !== 'hand'}
            title={`${t.label} (${t.shortcut})`}
            className={`relative p-2.5 rounded-xl transition-all group ${
              isActive
                ? 'bg-aura-600 text-white shadow-glow'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30'
            }`}
          >
            <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />

            {/* Micro Tooltip */}
            <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-40">
              {t.label} <span className="text-slate-400 font-mono">({t.shortcut})</span>
            </div>
          </button>
        );
      })}

      {/* Image Upload Button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isReadOnly}
        title="Insert Image (I)"
        className="relative p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all group"
      >
        <ImageIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-40">
          Insert Image <span className="text-slate-400 font-mono">(I)</span>
        </div>
      </button>

      <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

      {/* Keep Tool Selected Lock Toggle */}
      <button
        onClick={() => setIsKeepToolActive(!isKeepToolActive)}
        title={isKeepToolActive ? 'Tool Lock Active (Tool stays active after drawing)' : 'Tool Lock Inactive'}
        className={`p-2.5 rounded-xl transition-colors ${
          isKeepToolActive
            ? 'text-aura-500 bg-aura-50 dark:bg-aura-950/50'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {isKeepToolActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </button>
    </div>
  );
};

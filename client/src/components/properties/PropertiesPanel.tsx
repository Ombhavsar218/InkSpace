import React from 'react';
import {
  Trash2,
  Copy,
  Lock,
  Unlock,
  Group,
  Ungroup,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignVerticalJustifyCenter,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Type,
  Square,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { FillStyle, FontFamily, StrokeStyle, TextAlign } from '../../types';

const STROKE_COLORS = [
  '#000000',
  '#8b5cf6', // Aura Purple
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#eab308', // Yellow
  '#ef4444', // Red
];

const FILL_COLORS = [
  'transparent',
  '#f5f3ff',
  '#ede9fe',
  '#dbeafe',
  '#dcfce7',
  '#fef3c7',
  '#fee2e2',
  '#fce7f3',
  '#fef08a', // Sticky Yellow
  '#1e293b',
];

export const PropertiesPanel: React.FC = () => {
  const {
    elements,
    selectedElementIds,
    defaultProps,
    updateSelectedElementsProps,
    deleteSelectedElements,
    duplicateSelectedElements,
    toggleLockSelected,
    groupSelected,
    ungroupSelected,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    alignSelected,
    distributeSelected,
    tool,
    laserColor,
    setLaserColor,
  } = useCanvasStore();

  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));
  const hasSelection = selectedElements.length > 0;
  const firstEl = selectedElements[0];

  // Resolve current active props (from selection or defaults)
  const currentStroke = firstEl ? firstEl.strokeColor : defaultProps.strokeColor;
  const currentFill = firstEl ? firstEl.fillColor : defaultProps.fillColor;
  const currentFillStyle = (firstEl ? firstEl.fillStyle : defaultProps.fillStyle) || 'none';
  const currentWidth = firstEl ? firstEl.strokeWidth : defaultProps.strokeWidth;
  const currentStrokeStyle = firstEl ? firstEl.strokeStyle : defaultProps.strokeStyle;
  const currentRoughness = firstEl ? firstEl.roughness : defaultProps.roughness;
  const currentOpacity = firstEl ? firstEl.opacity : defaultProps.opacity;
  const currentRoundness = firstEl ? firstEl.roundness : defaultProps.roundness;
  const currentFontFamily = firstEl ? firstEl.fontFamily || 'Caveat' : defaultProps.fontFamily;
  const currentFontSize = firstEl ? firstEl.fontSize || 20 : defaultProps.fontSize;
  const currentTextAlign = firstEl ? firstEl.textAlign || 'left' : defaultProps.textAlign;

  const isLocked = selectedElements.every((el) => el.isLocked);
  const isGrouped = selectedElements.some((el) => !!el.groupId);
  const hasTextElement = selectedElements.some((el) => el.type === 'text' || el.type === 'sticky');

  return (
    <aside className="fixed top-24 left-4 z-20 w-64 max-h-[68vh] overflow-y-auto custom-scrollbar bg-white/90 dark:bg-canvas-cardDark/90 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl p-4 shadow-glass-light dark:shadow-glass pointer-events-auto transition-all animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="space-y-4">
        {/* Header / Selection info */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {hasSelection
              ? `${selectedElements.length} Selected`
              : 'Default Styling'}
          </span>

          {hasSelection && (
            <div className="flex items-center gap-1">
              <button
                onClick={toggleLockSelected}
                title={isLocked ? 'Unlock Element' : 'Lock Element'}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isLocked
                    ? 'text-aura-500 bg-aura-50 dark:bg-aura-950/50'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={duplicateSelectedElements}
                title="Duplicate (Ctrl+D)"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={deleteSelectedElements}
                title="Delete (Del)"
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Laser Color (when laser tool active) */}
        {tool === 'laser' && (
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Laser Color
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {[...STROKE_COLORS, '#ffffff'].map((c) => (
                <button
                  key={c}
                  onClick={() => setLaserColor(c)}
                  style={{ backgroundColor: c, borderColor: c === '#ffffff' ? '#cbd5e1' : undefined }}
                  className={`w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 transition-transform ${
                    laserColor === c ? 'ring-2 ring-aura-500 scale-110' : 'hover:scale-105'
                  }`}
                />
              ))}
              <input
                type="color"
                value={laserColor}
                onChange={(e) => setLaserColor(e.target.value)}
                className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0"
                title="Custom laser color"
              />
            </div>
          </div>
        )}

        {/* Stroke Color */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Stroke Color
          </label>
          <div className="flex flex-wrap gap-1.5 items-center">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateSelectedElementsProps({ strokeColor: c })}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 transition-transform ${
                  currentStroke === c ? 'ring-2 ring-aura-500 scale-110' : 'hover:scale-105'
                }`}
              />
            ))}
            <input
              type="color"
              value={currentStroke.startsWith('#') ? currentStroke : '#1e1e24'}
              onChange={(e) => updateSelectedElementsProps({ strokeColor: e.target.value })}
              className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0"
              title="Custom stroke color"
            />
          </div>
        </div>

        {/* Fill Color */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Fill Color
          </label>
          <div className="flex flex-wrap gap-1.5 items-center">
            {FILL_COLORS.map((c) => (
              <button
                key={c}
                onClick={() =>
                  updateSelectedElementsProps({
                    fillColor: c,
                    fillStyle: c === 'transparent' ? 'none' : currentFillStyle === 'none' ? 'solid' : currentFillStyle,
                  })
                }
                style={{ backgroundColor: c === 'transparent' ? '#ffffff' : c }}
                className={`relative w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 transition-transform ${
                  currentFill === c ? 'ring-2 ring-aura-500 scale-110' : 'hover:scale-105'
                }`}
              >
                {c === 'transparent' && (
                  <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs font-bold">
                    /
                  </div>
                )}
              </button>
            ))}
            <input
              type="color"
              value={currentFill.startsWith('#') ? currentFill : '#f5f3ff'}
              onChange={(e) =>
                updateSelectedElementsProps({
                  fillColor: e.target.value,
                  fillStyle: currentFillStyle === 'none' ? 'solid' : currentFillStyle,
                })
              }
              className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0"
              title="Custom fill color"
            />
          </div>
        </div>

        {/* Fill Pattern / Style */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Fill Style
          </label>
          <div className="grid grid-cols-4 gap-1">
            {(['none', 'solid', 'hachure', 'cross-hatch'] as FillStyle[]).map((style) => {
              const active = currentFillStyle === style;
              const swatch = currentFill === 'transparent' ? '#8b5cf6' : currentFill;
              return (
                <button
                  key={style}
                  onClick={() => updateSelectedElementsProps({ fillStyle: style })}
                  className={`py-1.5 px-1 rounded-lg text-[9px] font-medium leading-tight text-center transition-all flex flex-col items-center gap-1 ${
                    active
                      ? 'bg-aura-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                    <rect
                      x="1.5"
                      y="1.5"
                      width="21"
                      height="21"
                      rx="3"
                      fill={style === 'solid' ? swatch : 'transparent'}
                      stroke={active ? '#ffffff' : '#94a3b8'}
                      strokeWidth="1.5"
                    />
                    {style === 'hachure' && (
                      <g stroke={active ? '#ffffff' : swatch} strokeWidth="2">
                        <line x1="-2" y1="8" x2="26" y2="-4" />
                        <line x1="-2" y1="16" x2="26" y2="4" />
                        <line x1="-2" y1="24" x2="26" y2="12" />
                      </g>
                    )}
                    {style === 'cross-hatch' && (
                      <g stroke={active ? '#ffffff' : swatch} strokeWidth="2">
                        <line x1="-2" y1="8" x2="26" y2="-4" />
                        <line x1="-2" y1="16" x2="26" y2="4" />
                        <line x1="-2" y1="24" x2="26" y2="12" />
                        <line x1="8" y1="-2" x2="-4" y2="26" />
                        <line x1="16" y1="-2" x2="4" y2="26" />
                        <line x1="24" y1="-2" x2="12" y2="26" />
                      </g>
                    )}
                  </svg>
                  {style === 'cross-hatch' ? 'hatch' : style}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stroke Width & Stroke Style */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Stroke Width
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 4, 6].map((w) => {
                const active = currentWidth === w;
                return (
                  <button
                    key={w}
                    onClick={() => updateSelectedElementsProps({ strokeWidth: w })}
                    className={`py-1.5 rounded-lg text-[9px] font-semibold text-center transition-all ${
                      active
                        ? 'bg-aura-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {w}px
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Line Style
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['solid', 'dashed', 'dotted'] as StrokeStyle[]).map((s) => {
                const active = currentStrokeStyle === s;
                return (
                  <button
                    key={s}
                    onClick={() => updateSelectedElementsProps({ strokeStyle: s })}
                    className={`py-1.5 rounded-lg text-[9px] font-medium text-center transition-all ${
                      active
                        ? 'bg-aura-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s === 'solid' ? 'Solid' : s === 'dashed' ? 'Dashed' : 'Dotted'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Roughness & Roundness */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Roughness
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { val: 0, label: 'Clean', d: 'M3,12 H21' },
                { val: 1, label: 'Sketch', d: 'M3,12 Q8,10.5 13,12 T21,12' },
                { val: 2, label: 'Artist', d: 'M3,11.5 Q7,10 11,12 T17,12 Q20,11 21,12.5' },
              ].map((r) => {
                const active = currentRoughness === r.val;
                return (
                  <button
                    key={r.val}
                    onClick={() => updateSelectedElementsProps({ roughness: r.val })}
                    className={`py-1.5 px-0.5 rounded-lg text-[9px] font-medium leading-tight text-center transition-all flex flex-col items-center gap-1 ${
                      active
                        ? 'bg-aura-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                      <path d={r.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Corners
            </label>
            <div className="grid grid-cols-2 gap-1">
              {[
                { val: 0, label: 'Sharp', rx: 0 },
                { val: 1, label: 'Round', rx: 5 },
              ].map((rnd) => {
                const active = currentRoundness === rnd.val;
                return (
                  <button
                    key={rnd.val}
                    onClick={() => updateSelectedElementsProps({ roundness: rnd.val })}
                    className={`py-1.5 px-0.5 rounded-lg text-[9px] font-medium leading-tight text-center transition-all flex flex-col items-center gap-1 ${
                      active
                        ? 'bg-aura-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0">
                      <rect
                        x="4"
                        y="6"
                        width="16"
                        height="12"
                        rx={rnd.rx}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    {rnd.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Opacity Slider */}
        <div>
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>Opacity</span>
            <span>{currentOpacity}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={currentOpacity}
            onChange={(e) => updateSelectedElementsProps({ opacity: parseInt(e.target.value, 10) })}
            className="w-full accent-aura-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />
        </div>

        {/* Text Styling (If selection contains text or sticky note or no selection) */}
        {(hasTextElement || !hasSelection) && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Typography
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['Caveat', 'Inter', 'Fira Code'] as FontFamily[]).map((font) => (
                <button
                  key={font}
                  onClick={() => updateSelectedElementsProps({ fontFamily: font })}
                  className={`py-1 px-1 rounded-lg text-xs truncate font-medium text-center transition-all ${
                    currentFontFamily === font
                      ? 'bg-aura-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {font === 'Caveat' ? 'Hand' : font === 'Inter' ? 'Sans' : 'Mono'}
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              {/* Font Size */}
              <div className="flex-1 flex gap-1">
                {[20, 28, 36, 48].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => updateSelectedElementsProps({ fontSize: sz })}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold text-center transition-all ${
                      currentFontSize === sz
                        ? 'bg-aura-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {sz === 20 ? 'S' : sz === 28 ? 'M' : sz === 36 ? 'L' : 'XL'}
                  </button>
                ))}
              </div>

              {/* Text Align */}
              <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                {(['left', 'center', 'right'] as TextAlign[]).map((al) => {
                  const Icon = al === 'left' ? AlignLeft : al === 'center' ? AlignCenter : AlignRight;
                  return (
                    <button
                      key={al}
                      onClick={() => updateSelectedElementsProps({ textAlign: al })}
                      className={`p-1 rounded-md transition-colors ${
                        currentTextAlign === al ? 'bg-aura-600 text-white' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Layer Controls & Grouping */}
        {hasSelection && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Layer & Arrangement
            </label>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={bringToFront}
                title="Bring to Front"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={bringForward}
                title="Bring Forward"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={sendBackward}
                title="Send Backward"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={sendToBack}
                title="Send to Back"
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Group / Ungroup */}
            {selectedElements.length > 1 && (
              <div className="flex gap-1 pt-1">
                <button
                  onClick={groupSelected}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <Group className="w-3.5 h-3.5" />
                  <span>Group (Ctrl+G)</span>
                </button>
                {isGrouped && (
                  <button
                    onClick={ungroupSelected}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <Ungroup className="w-3.5 h-3.5" />
                    <span>Ungroup</span>
                  </button>
                )}
              </div>
            )}

            {/* Alignments (Multi-element only) */}
            {selectedElements.length > 1 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Alignment & Distribution
                </label>
                <div className="grid grid-cols-6 gap-1 mb-1">
                  <button
                    onClick={() => alignSelected('left')}
                    title="Align Left"
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => alignSelected('center')}
                    title="Align Center"
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => alignSelected('right')}
                    title="Align Right"
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => alignSelected('top')}
                    title="Align Top"
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <AlignStartVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => alignSelected('middle')}
                    title="Align Middle"
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => alignSelected('bottom')}
                    title="Align Bottom"
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200"
                  >
                    <AlignEndVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
                {selectedElements.length > 2 && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => distributeSelected('horizontal')}
                      title="Distribute Horizontally"
                      className="flex-1 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 text-slate-700 dark:text-slate-200"
                    >
                      <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
                      <span>H-Dist</span>
                    </button>
                    <button
                      onClick={() => distributeSelected('vertical')}
                      title="Distribute Vertically"
                      className="flex-1 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 text-slate-700 dark:text-slate-200"
                    >
                      <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
                      <span>V-Dist</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

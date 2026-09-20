import React, { useState, useRef } from 'react';
import {
  Download,
  Image as ImageIcon,
  Code,
  FileJson,
  Copy,
  Check,
  Upload,
  X,
  Sparkles,
} from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useThemeStore } from '../../stores/useThemeStore';
import {
  downloadPng,
  downloadSvg,
  downloadJson,
  copyImageToClipboard,
} from '../../engine/exporter';
import { useCollabStore } from '../../stores/useCollabStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { elements, selectedElementIds, boardTitle, importElements } = useCanvasStore();
  const { isDark } = useThemeStore();
  const { sendElementsChange } = useCollabStore();

  const [scale, setScale] = useState<number>(2);
  const [withBackground, setWithBackground] = useState<boolean>(true);
  const [onlySelected, setOnlySelected] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadPng = async () => {
    await downloadPng(elements, {
      scale,
      background: withBackground,
      isDark,
      onlySelected,
      selectedIds: selectedElementIds,
      title: boardTitle,
    });
    onClose();
  };

  const handleCopyClipboard = async () => {
    const success = await copyImageToClipboard(elements, {
      scale,
      background: withBackground,
      isDark,
      onlySelected,
      selectedIds: selectedElementIds,
      title: boardTitle,
    });
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSvg = () => {
    downloadSvg(elements, {
      background: withBackground,
      isDark,
      title: boardTitle,
    });
    onClose();
  };

  const handleDownloadJson = () => {
    downloadJson(elements, boardTitle);
    onClose();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const importedElements = json.elements || (Array.isArray(json) ? json : []);
        if (Array.isArray(importedElements) && importedElements.length > 0) {
          importElements(importedElements);
          sendElementsChange(importedElements, true);
          onClose();
        }
      } catch (err) {
        alert('Invalid InkSpace JSON file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      {/* Hidden Import File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.inkspace,.auracanvas"
        onChange={handleImportJson}
        className="hidden"
      />

      <div className="w-full max-w-lg bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-glow">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Export & Import Whiteboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {boardTitle} ({elements.length} elements)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-5">
          {/* PNG Options Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span>PNG Image Export</span>
              </span>
              <div className="flex gap-1">
                {[
                  { val: 1, label: '1x' },
                  { val: 2, label: '2x (HD)' },
                  { val: 3, label: '3x (Retina)' },
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setScale(s.val)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors ${
                      scale === s.val
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withBackground}
                  onChange={(e) => setWithBackground(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <span>Include {isDark ? 'Dark' : 'Light'} Background</span>
              </label>

              {selectedElementIds.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlySelected}
                    onChange={(e) => setOnlySelected(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>Export Selected ({selectedElementIds.length}) Only</span>
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDownloadPng}
                disabled={elements.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-glow transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={handleCopyClipboard}
                disabled={elements.length === 0}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all"
                title="Copy Image to Clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
            </div>
          </div>

          {/* SVG & JSON Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* SVG */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <Code className="w-4 h-4 text-aura-500" />
                  <span>Scalable SVG</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Vector graphics format perfect for Illustrator & web embedding.
                </p>
              </div>

              <button
                onClick={handleDownloadSvg}
                disabled={elements.length === 0}
                className="mt-3 w-full py-2 bg-aura-600 hover:bg-aura-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all"
              >
                Download SVG
              </button>
            </div>

            {/* JSON */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <FileJson className="w-4 h-4 text-amber-500" />
                  <span>InkSpace File</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Complete scene backup with elements and metadata.
                </p>
              </div>

              <button
                onClick={handleDownloadJson}
                disabled={elements.length === 0}
                className="mt-3 w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all"
              >
                Save .inkspace
              </button>
            </div>
          </div>

          {/* Import JSON */}
          <div className="p-3 rounded-2xl bg-slate-100/50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Upload className="w-5 h-5 text-aura-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Import Saved Whiteboard
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Load elements from a .inkspace, .auracanvas, or .json file
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Browse File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

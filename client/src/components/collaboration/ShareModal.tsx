import React, { useState } from 'react';
import { Share2, Copy, Check, ShieldCheck, Users, Globe, Lock, X } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { boardId, boardTitle } = useCanvasStore();
  const { activeUsers } = useCollabStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = boardId
    ? `${window.location.origin}/?board=${boardId}`
    : window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aura-600 to-indigo-500 flex items-center justify-center text-white shadow-glow">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Share Whiteboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {boardTitle}
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
        <div className="py-5 space-y-4">
          {/* Link Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Live Collaboration Link
            </label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 pl-3">
              <Globe className="w-4 h-4 text-aura-500 flex-shrink-0" />
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none select-all truncate"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 bg-aura-600 hover:bg-aura-500 text-white rounded-xl text-xs font-semibold shadow-glow transition-all flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Access Info */}
          <div className="rounded-2xl bg-aura-50/50 dark:bg-aura-950/20 border border-aura-200/50 dark:border-aura-800/30 p-3 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-aura-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Real-Time Multi-User Sync
              </p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Anyone with this link can join this whiteboard session, see live cursors, and collaborate simultaneously with zero setup required.
              </p>
            </div>
          </div>

          {/* Active Collaborators */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-aura-500" />
                <span>Currently Online ({activeUsers.length})</span>
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              {activeUsers.map((u, i) => (
                <div
                  key={u.socketId || i}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <div
                      style={{ backgroundColor: u.color }}
                      className="w-6 h-6 rounded-full text-white font-bold text-xs flex items-center justify-center uppercase"
                    >
                      {u.name ? u.name.charAt(0) : 'U'}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {u.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    Online
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

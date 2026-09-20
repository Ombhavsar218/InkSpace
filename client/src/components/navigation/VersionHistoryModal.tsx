import React, { useState, useEffect } from 'react';
import { History, Plus, RotateCcw, Clock, X, CheckCircle, Loader2 } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { apiRequest } from '../../utils/api';
import { useCollabStore } from '../../stores/useCollabStore';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VersionItem {
  id: string;
  whiteboardId: string;
  name: string;
  canvasData?: string;
  createdAt: string;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose }) => {
  const { boardId, setElements, fitToContent } = useCanvasStore();
  const { sendElementsChange } = useCollabStore();

  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [snapshotName, setSnapshotName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);

  useEffect(() => {
    if (isOpen && boardId) {
      loadVersions();
    }
  }, [isOpen, boardId]);

  const loadVersions = async () => {
    if (!boardId) return;
    setIsLoading(true);
    try {
      const res = await apiRequest(`/whiteboards/${boardId}/versions`);
      setVersions(res.versions || []);
    } catch (e) {
      console.error('Failed to fetch versions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId || !snapshotName.trim()) return;

    setIsCreating(true);
    try {
      const res = await apiRequest(`/whiteboards/${boardId}/versions`, {
        method: 'POST',
        body: JSON.stringify({ name: snapshotName.trim() }),
      });
      if (res.version) {
        setVersions([res.version, ...versions]);
        setSnapshotName('');
      }
    } catch (e) {
      console.error('Failed to create snapshot:', e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!boardId) return;
    if (!window.confirm('Restore this revision? Your current canvas elements will be replaced with this snapshot.')) {
      return;
    }

    try {
      const res = await apiRequest(`/whiteboards/${boardId}/versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (res.board) {
        const restoredElements = JSON.parse(res.board.canvasData || '[]');
        setElements(restoredElements, true);
        sendElementsChange(restoredElements, true);
        fitToContent();
        onClose();
      }
    } catch (e) {
      console.error('Failed to restore version:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-glow">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Version History & Snapshots
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse revisions and restore earlier versions
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
        <div className="py-4 space-y-4">
          {/* Create Manual Checkpoint Form */}
          <form onSubmit={handleCreateSnapshot} className="flex gap-2">
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="Name this snapshot (e.g. Sprint 4 Architecture)..."
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!snapshotName.trim() || isCreating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-glow transition-all"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Save Snapshot</span>
            </button>
          </form>

          {/* Versions List */}
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Loading revision history...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No snapshots recorded yet. Create one above to preserve your whiteboard state!
              </div>
            ) : (
              versions.map((ver, idx) => (
                <div
                  key={ver.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center font-bold text-xs">
                      #{versions.length - idx}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {ver.name}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(ver.createdAt).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestore(ver.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all group"
                  >
                    <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform" />
                    <span>Restore</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

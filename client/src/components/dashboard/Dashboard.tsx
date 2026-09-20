import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  LayoutTemplate,
  FolderOpen,
  Users,
  Clock,
  MoreVertical,
  Trash2,
  Copy,
  Download,
  Share2,
  Sparkles,
  ExternalLink,
  Loader2,
  FileCode,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Edit2,
  Check,
} from 'lucide-react';
import { WhiteboardSummary } from '../../types';
import { apiRequest } from '../../utils/api';
import { DIAGRAM_TEMPLATES } from '../../engine/templates';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';

interface DashboardProps {
  onSelectBoard: (boardId: string) => void;
  onCreateNewBoard: (templateElements?: any[], title?: string) => void;
  onOpenAuth: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectBoard,
  onCreateNewBoard,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [boards, setBoards] = useState<WhiteboardSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'owned' | 'shared'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [deletingBoard, setDeletingBoard] = useState<WhiteboardSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadBoards();
  }, [activeFilter]);

  const loadBoards = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest(`/whiteboards?filter=${activeFilter}`);
      setBoards(res.boards || []);
    } catch (e) {
      console.error('Failed to load whiteboards:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteConfirm = (board: WhiteboardSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingBoard(board);
  };

  const confirmDelete = async () => {
    if (!deletingBoard) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/whiteboards/${deletingBoard.id}`, { method: 'DELETE' });
      setBoards(boards.filter((b) => b.id !== deletingBoard.id));
      setDeletingBoard(null);
    } catch (e) {
      console.error('Failed to delete board:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiRequest(`/whiteboards/${id}/duplicate`, { method: 'POST' });
      if (res.board) {
        setBoards([res.board, ...boards]);
      }
    } catch (e) {
      console.error('Failed to duplicate board:', e);
    }
  };

  const handleRenameBoard = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitleInput.trim()) return;

    try {
      await apiRequest(`/whiteboards/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitleInput.trim() }),
      });
      setBoards(
        boards.map((b) => (b.id === id ? { ...b, title: editTitleInput.trim() } : b))
      );
      setEditingBoardId(null);
    } catch (e) {
      console.error('Failed to rename board:', e);
    }
  };

  const filteredBoards = boards.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0c0e] text-slate-900 dark:text-slate-100 flex flex-col select-none">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-canvas-borderDark px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aura-600 via-indigo-500 to-purple-400 flex items-center justify-center shadow-glow text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-aura-700 to-purple-600 dark:from-white dark:via-purple-200 dark:to-aura-400 bg-clip-text text-transparent">
              InkSpace Workspace
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive Digital Whiteboard & Collaboration Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Toggle ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {isAuthenticated && user && !user.isGuest ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-aura-600 text-white font-bold text-xs flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {user.name}
                </p>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-4 py-2 bg-aura-600 hover:bg-aura-500 text-white rounded-xl text-xs font-bold shadow-glow transition-all"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Template Launchpad */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-aura-500" />
              <span>Start from a Template</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Blank Canvas Tile */}
            <div
              onClick={() => onCreateNewBoard()}
              className="group relative rounded-2xl bg-gradient-to-br from-aura-500/10 via-purple-500/5 to-transparent border-2 border-dashed border-aura-400/50 hover:border-aura-500 dark:hover:border-aura-400 p-4 cursor-pointer transition-all hover:shadow-glow hover:-translate-y-1 flex flex-col justify-between min-h-[140px]"
            >
              <div className="w-10 h-10 rounded-xl bg-aura-600 text-white flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-aura-500 transition-colors">
                  Blank Whiteboard
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Clean infinite canvas
                </p>
              </div>
            </div>

            {/* Template Tiles */}
            {DIAGRAM_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => onCreateNewBoard(tpl.elements, tpl.title)}
                className="group rounded-2xl bg-white dark:bg-canvas-cardDark border border-slate-200/80 dark:border-canvas-borderDark hover:border-aura-500 dark:hover:border-aura-400 p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between min-h-[140px]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-aura-100 dark:bg-aura-950 text-aura-600 dark:text-aura-400">
                    {tpl.category}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {tpl.elements.length} nodes
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-aura-500 transition-colors truncate">
                    {tpl.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {tpl.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Boards Section */}
        <section className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-900/60 p-1 rounded-2xl w-full sm:w-auto">
              <button
                onClick={() => setActiveFilter('all')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-white dark:bg-canvas-cardDark text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All Boards
              </button>
              <button
                onClick={() => setActiveFilter('owned')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === 'owned'
                    ? 'bg-white dark:bg-canvas-cardDark text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Created by Me
              </button>
              <button
                onClick={() => setActiveFilter('shared')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === 'shared'
                    ? 'bg-white dark:bg-canvas-cardDark text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Shared with Me
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search whiteboards..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-canvas-cardDark border border-slate-200/80 dark:border-canvas-borderDark rounded-2xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-aura-500 transition-colors"
              />
            </div>
          </div>

          {/* Boards Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-aura-500" />
              <p className="text-xs font-medium">Loading your whiteboards...</p>
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-canvas-cardDark border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No whiteboards found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `No whiteboards matching "${searchQuery}".`
                  : "You haven't created any whiteboards yet. Start by creating a blank whiteboard or launching a template!"}
              </p>
              <button
                onClick={() => onCreateNewBoard()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-aura-600 hover:bg-aura-500 text-white rounded-xl text-xs font-bold shadow-glow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Board</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredBoards.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onSelectBoard(b.id)}
                  className="group rounded-3xl bg-white dark:bg-canvas-cardDark border border-slate-200/80 dark:border-canvas-borderDark hover:border-aura-500/80 dark:hover:border-aura-500/80 overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1.5 flex flex-col"
                >
                  {/* Canvas Thumbnail Area */}
                  <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-900 dark:to-canvas-darker relative flex items-center justify-center p-4 overflow-hidden border-b border-slate-100 dark:border-slate-800/80">
                    <div className="w-full h-full rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Sparkles className="w-6 h-6 text-aura-400 opacity-60" />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {editingBoardId === b.id ? (
                        <form
                          onSubmit={(e) => handleRenameBoard(b.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            onBlur={(e) => handleRenameBoard(b.id, e)}
                            className="w-full text-sm font-bold bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 outline-none border border-aura-500"
                          />
                          <button type="submit" className="p-1 text-emerald-500">
                            <Check className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-aura-500 transition-colors truncate">
                            {b.title}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBoardId(b.id);
                              setEditTitleInput(b.title);
                            }}
                            className="p-1 rounded text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(b.updatedAt).toLocaleDateString()}</span>
                        {b.owner && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[90px]">{b.owner.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        {b._count?.comments ? (
                          <span className="text-[10px] font-semibold text-aura-500">
                            {b._count.comments} comments
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDuplicateBoard(b.id, e)}
                          title="Duplicate Whiteboard"
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => openDeleteConfirm(b, e)}
                          title="Delete Whiteboard"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {deletingBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Delete Whiteboard?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              "{deletingBoard.title}" and all its content will be permanently deleted. This action
              cannot be undone.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setDeletingBoard(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-sm bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center mb-3">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Sign Out?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Are you sure you want to sign out? You'll need to sign in again to access your saved
              whiteboards.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

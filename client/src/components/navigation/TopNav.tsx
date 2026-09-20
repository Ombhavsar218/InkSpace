import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Share2,
  Download,
  History,
  LayoutTemplate,
  MessageSquare,
  Moon,
  Sun,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  User as UserIcon,
  LogOut,
  FolderOpen,
} from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface TopNavProps {
  onOpenDashboard: () => void;
  onOpenShare: () => void;
  onOpenExport: () => void;
  onOpenTemplates: () => void;
  onOpenHistory: () => void;
  onOpenAuth: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenDashboard,
  onOpenShare,
  onOpenExport,
  onOpenTemplates,
  onOpenHistory,
  onOpenAuth,
}) => {
  const {
    boardTitle,
    setBoardTitle,
    undo,
    redo,
    undoStack,
    redoStack,
    saveStatus,
  } = useCanvasStore();

  const { activeUsers, comments, isCommentsVisible, toggleCommentsVisibility, permission } = useCollabStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(boardTitle);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      setBoardTitle(titleInput.trim());
    } else {
      setTitleInput(boardTitle);
    }
    setIsEditingTitle(false);
  };

  const activeCommentsCount = comments.filter((c) => !c.resolved).length;

  return (
    <header className="fixed top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none select-none">
      {/* Left Section: Brand & Board Title */}
      <div className="flex items-center gap-2 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl px-3 py-2 shadow-glass-light dark:shadow-glass pointer-events-auto transition-all">
        <button
          onClick={onOpenDashboard}
          title="Back to Dashboard"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-aura-600 via-indigo-500 to-purple-400 flex items-center justify-center shadow-glow text-white font-bold text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 via-aura-700 to-purple-600 dark:from-white dark:via-purple-200 dark:to-aura-400 bg-clip-text text-transparent hidden sm:inline-block">
              InkSpace
            </span>
          </div>
        </button>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Editable Title */}
        <div className="flex items-center gap-2 px-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleInput(boardTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="bg-transparent border-b-2 border-aura-500 text-slate-800 dark:text-slate-100 font-semibold text-sm outline-none px-1 py-0.5 max-w-[180px] sm:max-w-[260px]"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(boardTitle);
                setIsEditingTitle(true);
              }}
              className="text-slate-800 dark:text-slate-100 font-semibold text-sm hover:text-aura-500 dark:hover:text-aura-400 transition-colors px-1.5 py-1 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 max-w-[180px] sm:max-w-[260px] truncate text-left"
              title="Click to rename whiteboard"
            >
              {boardTitle}
            </button>
          )}

          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-aura-500" />
                <span className="hidden md:inline">Saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline">Saved</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden md:inline">Unsaved</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center Section: Undo / Redo & Templates */}
      <div className="hidden lg:flex items-center gap-1 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl p-1.5 shadow-glass-light dark:shadow-glass pointer-events-auto">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
          className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Shift+Z)"
          className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Diagram Templates"
        >
          <LayoutTemplate className="w-4 h-4 text-aura-500" />
          <span>Templates</span>
        </button>

        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Version History"
        >
          <History className="w-4 h-4 text-indigo-500" />
          <span>History</span>
        </button>
      </div>

      {/* Right Section: Collaborators, Share, Export, Theme, User */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Active Collaborators Avatars */}
        {activeUsers.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-2 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl p-1.5 px-2.5 shadow-glass-light dark:shadow-glass">
            {activeUsers.slice(0, 4).map((u, i) => (
              <div
                key={u.socketId || i}
                title={`${u.name} (Online)`}
                style={{ backgroundColor: u.color }}
                className="w-7 h-7 rounded-full border-2 border-white dark:border-canvas-cardDark flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm transform hover:scale-110 hover:z-10 transition-transform cursor-pointer"
              >
                {u.name ? u.name.charAt(0) : '?'}
              </div>
            ))}
            {activeUsers.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-slate-700 text-white font-semibold text-xs border-2 border-white dark:border-canvas-cardDark flex items-center justify-center">
                +{activeUsers.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Main Action Bar */}
        <div className="flex items-center gap-1.5 bg-white/80 dark:bg-canvas-cardDark/80 backdrop-blur-xl border border-slate-200/80 dark:border-canvas-borderDark/80 rounded-2xl p-1.5 shadow-glass-light dark:shadow-glass">
          {/* Comments Toggle */}
          <button
            onClick={toggleCommentsVisibility}
            className={`relative p-2 rounded-xl transition-colors ${
              isCommentsVisible
                ? 'text-aura-600 dark:text-aura-400 bg-aura-50 dark:bg-aura-950/50'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Canvas Comments"
          >
            <MessageSquare className="w-4 h-4" />
            {activeCommentsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-aura-500 text-white text-[10px] font-bold flex items-center justify-center shadow-glow">
                {activeCommentsCount}
              </span>
            )}
          </button>

          {/* Export Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Export PNG, SVG, JSON"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Share Button */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-aura-600 hover:bg-aura-500 text-white shadow-glow transition-all"
            title="Share Whiteboard Link"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Profile / Auth Button */}
          <div className="relative">
            {isAuthenticated && user && !user.isGuest ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-aura-600 text-white font-bold text-xs flex items-center justify-center hover:ring-2 hover:ring-aura-400 transition-all"
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenDashboard();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-aura-500" />
                  <span>My Whiteboards</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

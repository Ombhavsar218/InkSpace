import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, Trash2, X, Send, CornerDownRight } from 'lucide-react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Comment } from '../../types';

export const CommentsOverlay: React.FC = () => {
  const { viewState, boardId } = useCanvasStore();
  const {
    comments,
    isCommentsVisible,
    activeCommentPin,
    setActiveCommentPin,
    createComment,
    toggleResolveComment,
    deleteComment,
  } = useCollabStore();
  const { user } = useAuthStore();

  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  if (!isCommentsVisible) return null;

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentPin || !boardId || !commentText.trim()) return;

    await createComment(boardId, commentText.trim(), activeCommentPin.x, activeCommentPin.y);
    setCommentText('');
    setActiveCommentPin(null);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* Existing Comment Pins */}
      {comments.map((comment) => {
        const screenX = comment.x * viewState.zoom + viewState.scrollX;
        const screenY = comment.y * viewState.zoom + viewState.scrollY;
        const isOpen = activeCommentId === comment.id;

        return (
          <div
            key={comment.id}
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
            }}
            className="absolute top-0 left-0 pointer-events-auto"
          >
            {/* Comment Pin Icon */}
            <button
              onClick={() => setActiveCommentId(isOpen ? null : comment.id)}
              className={`-translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-110 ${
                comment.resolved
                  ? 'bg-slate-400 text-white opacity-60'
                  : 'bg-gradient-to-tr from-aura-600 to-indigo-500 text-white shadow-glow'
              }`}
              title={`Comment by ${comment.user?.name || 'Anonymous'}`}
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Comment Thread Card Popup */}
            {isOpen && (
              <div className="absolute left-4 top-4 w-72 bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-2xl shadow-2xl p-3.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-aura-500 text-white font-bold text-[10px] flex items-center justify-center">
                      {comment.user?.name ? comment.user.name.charAt(0) : 'U'}
                    </div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                      {comment.user?.name || 'Anonymous'}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveCommentId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="py-2.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                  {comment.text}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <button
                    onClick={() => toggleResolveComment(comment.id)}
                    className={`flex items-center gap-1 font-medium transition-colors ${
                      comment.resolved
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-emerald-500 hover:text-emerald-600'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{comment.resolved ? 'Reopen' : 'Resolve'}</span>
                  </button>

                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete Comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* New Active Comment Placement Box */}
      {activeCommentPin && (
        <div
          style={{
            transform: `translate3d(${activeCommentPin.x * viewState.zoom + viewState.scrollX}px, ${
              activeCommentPin.y * viewState.zoom + viewState.scrollY
            }px, 0)`,
          }}
          className="absolute top-0 left-0 pointer-events-auto"
        >
          <div className="-translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-aura-600 text-white flex items-center justify-center shadow-glow animate-bounce">
            <MessageSquare className="w-4 h-4" />
          </div>

          <form
            onSubmit={handleCreateComment}
            className="absolute left-4 top-4 w-72 bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-2xl shadow-2xl p-3 z-40"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                New Comment
              </span>
              <button
                type="button"
                onClick={() => setActiveCommentPin(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              autoFocus
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your comment or feedback..."
              rows={3}
              className="w-full text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none resize-none focus:border-aura-500"
            />

            <div className="flex justify-end gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setActiveCommentPin(null)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="flex items-center gap-1 px-3 py-1 bg-aura-600 hover:bg-aura-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-glow transition-all"
              >
                <Send className="w-3 h-3" />
                <span>Post</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

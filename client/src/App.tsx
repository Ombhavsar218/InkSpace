import React, { useEffect, useState } from 'react';
import { Canvas } from './components/canvas/Canvas';
import { TopNav } from './components/navigation/TopNav';
import { MainToolbar } from './components/toolbar/MainToolbar';
import { PropertiesPanel } from './components/properties/PropertiesPanel';
import { ZoomControls } from './components/canvas/ZoomControls';
import { Minimap } from './components/canvas/Minimap';
import { Dashboard } from './components/dashboard/Dashboard';
import { ShareModal } from './components/collaboration/ShareModal';
import { ExportModal } from './components/navigation/ExportModal';
import { VersionHistoryModal } from './components/navigation/VersionHistoryModal';
import { TemplatesModal } from './components/navigation/TemplatesModal';
import { AuthModal } from './components/auth/AuthModal';

import { useCanvasStore } from './stores/useCanvasStore';
import { useAuthStore } from './stores/useAuthStore';
import { useCollabStore } from './stores/useCollabStore';
import { useThemeStore } from './stores/useThemeStore';
import { apiRequest } from './utils/api';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'canvas'>('canvas');

  // Modals state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const {
    boardId,
    elements,
    viewState,
    boardTitle,
    saveStatus,
    setBoardId,
    setBoardTitle,
    setElements,
    setViewState,
    setSaveStatus,
    fitToContent,
  } = useCanvasStore();

  const { initAuth, user, isAuthenticated } = useAuthStore();
  const { initSocket, disconnectSocket, loadComments, setPermission } = useCollabStore();
  const { isDark } = useThemeStore();

  // Initialize Auth on launch
  useEffect(() => {
    initAuth();
  }, []);

  // Initialize or load board from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlBoardId = urlParams.get('board');

    if (urlBoardId) {
      loadBoardById(urlBoardId);
    } else {
      // Start with a new board session
      createNewBoardSession();
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  const loadBoardById = async (id: string) => {
    try {
      const res = await apiRequest(`/whiteboards/${id}`);
      if (res.board) {
        setBoardId(res.board.id);
        setBoardTitle(res.board.title);

        const loadedElements = JSON.parse(res.board.canvasData || '[]');
        setElements(loadedElements, false);

        if (res.board.viewState) {
          const loadedView = JSON.parse(res.board.viewState);
          setViewState(loadedView);
        }

        setPermission(res.permission || 'EDIT');
        setSaveStatus('saved');
        setCurrentView('canvas');

        // Init socket collaboration room
        initSocket(res.board.id, user);
        loadComments(res.board.id);
      }
    } catch (e) {
      console.error('Failed to load board:', e);
      createNewBoardSession();
    }
  };

  const createNewBoardSession = async (initialElements?: any[], initialTitle?: string) => {
    try {
      const res = await apiRequest('/whiteboards', {
        method: 'POST',
        body: JSON.stringify({
          title: initialTitle || 'Untitled Whiteboard',
          canvasData: initialElements || [],
        }),
      });

      if (res.board) {
        setBoardId(res.board.id);
        setBoardTitle(res.board.title);
        setElements(initialElements || [], false);
        setSaveStatus('saved');
        setCurrentView('canvas');

        // Update URL query string without reloading page
        window.history.pushState({}, '', `/?board=${res.board.id}`);

        initSocket(res.board.id, user);
        loadComments(res.board.id);

        if (initialElements && initialElements.length > 0) {
          setTimeout(() => fitToContent(), 100);
        }
      }
    } catch (e) {
      console.error('Failed to create board session:', e);
    }
  };

  // Debounced auto-save canvas data to server
  useEffect(() => {
    if (!boardId || saveStatus !== 'unsaved') return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await apiRequest(`/whiteboards/${boardId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: boardTitle,
            canvasData: elements,
            viewState,
          }),
        });
        setSaveStatus('saved');
      } catch (e) {
        console.error('Auto-save failed:', e);
        setSaveStatus('unsaved');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [elements, boardTitle, viewState, saveStatus, boardId]);

  return (
    <div className="w-screen h-screen overflow-hidden font-sans">
      {currentView === 'dashboard' ? (
        <Dashboard
          onSelectBoard={(id) => {
            window.history.pushState({}, '', `/?board=${id}`);
            loadBoardById(id);
          }}
          onCreateNewBoard={(templateElements, title) => {
            createNewBoardSession(templateElements, title);
          }}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      ) : (
        <div className="relative w-full h-full">
          {/* Top Bar Navigation */}
          <TopNav
            onOpenDashboard={() => setCurrentView('dashboard')}
            onOpenShare={() => setIsShareOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />

          {/* Floating Shape Toolbar */}
          <MainToolbar />

          {/* Contextual Properties Inspector */}
          <PropertiesPanel />

          {/* Core Infinite Rough.js Canvas */}
          <Canvas />

          {/* Interactive Zoom and Grid Controls */}
          <ZoomControls />

          {/* Viewport Minimap */}
          <Minimap />
        </div>
      )}

      {/* Modals & Dialogs */}
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <VersionHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};

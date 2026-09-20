import { create } from 'zustand';
import {
  CanvasElement,
  ElementType,
  FillStyle,
  FontFamily,
  GridType,
  Point,
  StrokeStyle,
  TextAlign,
  ToolType,
  ViewState,
} from '../types';
import { alignElements, distributeElements, getSelectionBounds } from '../engine/geometry';

interface DefaultProperties {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  opacity: number;
  roundness: number;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
}

interface CanvasStoreState {
  elements: CanvasElement[];
  selectedElementIds: string[];
  tool: ToolType;
  isKeepToolActive: boolean;
  viewState: ViewState;
  gridType: GridType;
  boardId: string | null;
  boardTitle: string;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  editingTextId: string | null;
  laserPoints: { x: number; y: number; time: number; color?: string }[];
  laserColor: string;

  defaultProps: DefaultProperties;

  undoStack: CanvasElement[][];
  redoStack: CanvasElement[][];

  // Actions
  setElements: (elements: CanvasElement[], recordHistory?: boolean) => void;
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>, recordHistory?: boolean) => void;
  updateElements: (updates: { id: string; changes: Partial<CanvasElement> }[], recordHistory?: boolean) => void;
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;

  setSelectedElementIds: (ids: string[]) => void;
  clearSelection: () => void;
  toggleSelectElement: (id: string, isShift: boolean) => void;
  selectAll: () => void;

  setTool: (tool: ToolType) => void;
  setIsKeepToolActive: (keep: boolean) => void;

  setViewState: (view: Partial<ViewState>) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToContent: () => void;

  setGridType: (type: GridType) => void;
  setBoardTitle: (title: string) => void;
  setBoardId: (id: string | null) => void;
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void;
  setEditingTextId: (id: string | null) => void;

  setDefaultProps: (props: Partial<DefaultProperties>) => void;
  updateSelectedElementsProps: (props: Partial<CanvasElement>) => void;
  setLaserColor: (color: string) => void;

  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;

  groupSelected: () => void;
  ungroupSelected: () => void;
  toggleLockSelected: () => void;

  alignSelected: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelected: (direction: 'horizontal' | 'vertical') => void;

  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  addLaserPoint: (pt: Point, color?: string) => void;
  clearLaserPoints: () => void;

  loadTemplateElements: (elements: CanvasElement[]) => void;
  importElements: (elements: CanvasElement[]) => void;
  clearCanvas: () => void;
}

const initialDefaultProps: DefaultProperties = {
  strokeColor: '#1e1e24',
  fillColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  roundness: 0,
  fontSize: 28,
  fontFamily: 'Caveat',
  textAlign: 'left',
};

export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  elements: [],
  selectedElementIds: [],
  tool: 'select',
  isKeepToolActive: false,
  viewState: { scrollX: 0, scrollY: 0, zoom: 1 },
  gridType: 'none',
  boardId: null,
  boardTitle: 'Untitled Whiteboard',
  saveStatus: 'saved',
  editingTextId: null,
  laserPoints: [],
  laserColor: '#ef4444',

  defaultProps: initialDefaultProps,
  undoStack: [],
  redoStack: [],

  saveToHistory: () => {
    const { elements, undoStack } = get();
    const newUndo = [...undoStack, JSON.parse(JSON.stringify(elements))];
    if (newUndo.length > 50) newUndo.shift();
    set({ undoStack: newUndo, redoStack: [], saveStatus: 'unsaved' });
  },

  setElements: (elements, recordHistory = false) => {
    if (recordHistory) {
      get().saveToHistory();
    }
    set({ elements, saveStatus: 'unsaved' });
  },

  addElement: (element) => {
    get().saveToHistory();
    set((state) => ({
      elements: [...state.elements, element],
      selectedElementIds: [element.id],
      tool: state.isKeepToolActive ? state.tool : 'select',
      saveStatus: 'unsaved',
    }));
  },

  updateElement: (id, updates, recordHistory = false) => {
    if (recordHistory) get().saveToHistory();
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
      saveStatus: 'unsaved',
    }));
  },

  updateElements: (updates, recordHistory = false) => {
    if (recordHistory) get().saveToHistory();
    const map = new Map(updates.map((u) => [u.id, u.changes]));
    set((state) => ({
      elements: state.elements.map((el) => {
        const c = map.get(el.id);
        return c ? { ...el, ...c } : el;
      }),
      saveStatus: 'unsaved',
    }));
  },

  deleteSelectedElements: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();
    set({
      elements: elements.filter((el) => !selectedElementIds.includes(el.id)),
      selectedElementIds: [],
      saveStatus: 'unsaved',
    });
  },

  duplicateSelectedElements: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();

    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    const newElements: CanvasElement[] = selected.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: el.x + 20,
      y: el.y + 20,
      zIndex: elements.length + 1,
      seed: Math.floor(Math.random() * 100000),
    }));

    set({
      elements: [...elements, ...newElements],
      selectedElementIds: newElements.map((el) => el.id),
      saveStatus: 'unsaved',
    });
  },

  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
  clearSelection: () => set({ selectedElementIds: [], editingTextId: null }),

  toggleSelectElement: (id, isShift) => {
    const { selectedElementIds, elements } = get();
    const target = elements.find((el) => el.id === id);

    let targetIds = [id];
    if (target?.groupId) {
      targetIds = elements.filter((el) => el.groupId === target.groupId).map((el) => el.id);
    }

    if (isShift) {
      const isSelected = selectedElementIds.includes(id);
      if (isSelected) {
        set({ selectedElementIds: selectedElementIds.filter((selId) => !targetIds.includes(selId)) });
      } else {
        set({ selectedElementIds: Array.from(new Set([...selectedElementIds, ...targetIds])) });
      }
    } else {
      set({ selectedElementIds: targetIds });
    }
  },

  selectAll: () => {
    set((state) => ({
      selectedElementIds: state.elements.map((el) => el.id),
    }));
  },

  setTool: (tool) => {
    set({ tool, editingTextId: null });
    if (tool !== 'select') {
      set({ selectedElementIds: [] });
    }
  },

  setIsKeepToolActive: (keep) => set({ isKeepToolActive: keep }),

  setViewState: (view) =>
    set((state) => ({
      viewState: { ...state.viewState, ...view },
    })),

  setZoom: (zoom) => {
    const clamped = Math.max(0.1, Math.min(5, zoom));
    set((state) => ({
      viewState: { ...state.viewState, zoom: clamped },
    }));
  },

  zoomIn: () => {
    const { viewState } = get();
    const newZoom = Math.min(5, Math.round((viewState.zoom + 0.15) * 100) / 100);
    set({ viewState: { ...viewState, zoom: newZoom } });
  },

  zoomOut: () => {
    const { viewState } = get();
    const newZoom = Math.max(0.1, Math.round((viewState.zoom - 0.15) * 100) / 100);
    set({ viewState: { ...viewState, zoom: newZoom } });
  },

  resetZoom: () => {
    const { viewState } = get();
    set({ viewState: { ...viewState, zoom: 1, scrollX: 0, scrollY: 0 } });
  },

  fitToContent: () => {
    const { elements } = get();
    if (elements.length === 0) {
      set({ viewState: { scrollX: 0, scrollY: 0, zoom: 1 } });
      return;
    }
    const bounds = getSelectionBounds(elements);
    if (!bounds) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const padding = 100;

    const scaleX = (screenWidth - padding * 2) / bounds.width;
    const scaleY = (screenHeight - padding * 2) / bounds.height;
    const fitZoom = Math.max(0.2, Math.min(1.5, Math.min(scaleX, scaleY)));

    const scrollX = screenWidth / 2 - bounds.centerX * fitZoom;
    const scrollY = screenHeight / 2 - bounds.centerY * fitZoom;

    set({ viewState: { scrollX, scrollY, zoom: fitZoom } });
  },

  setGridType: (gridType) => set({ gridType }),
  setBoardTitle: (boardTitle) => set({ boardTitle, saveStatus: 'unsaved' }),
  setBoardId: (boardId) => set({ boardId }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setEditingTextId: (editingTextId) => set({ editingTextId }),

  setDefaultProps: (props) =>
    set((state) => ({
      defaultProps: { ...state.defaultProps, ...props },
    })),

  setLaserColor: (color) => set({ laserColor: color }),

  updateSelectedElementsProps: (props) => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) {
      get().setDefaultProps(props as Partial<DefaultProperties>);
      return;
    }

    get().saveToHistory();
    set({
      elements: elements.map((el) => {
        if (selectedElementIds.includes(el.id)) {
          return { ...el, ...props };
        }
        return el;
      }),
      defaultProps: { ...get().defaultProps, ...(props as any) },
      saveStatus: 'unsaved',
    });
  },

  bringForward: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (selectedElementIds.includes(sorted[i].id) && !selectedElementIds.includes(sorted[i + 1].id)) {
        const tempZ = sorted[i].zIndex;
        sorted[i].zIndex = sorted[i + 1].zIndex;
        sorted[i + 1].zIndex = tempZ;
        break;
      }
    }
    set({ elements: sorted, saveStatus: 'unsaved' });
  },

  sendBackward: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    for (let i = 1; i < sorted.length; i++) {
      if (selectedElementIds.includes(sorted[i].id) && !selectedElementIds.includes(sorted[i - 1].id)) {
        const tempZ = sorted[i].zIndex;
        sorted[i].zIndex = sorted[i - 1].zIndex;
        sorted[i - 1].zIndex = tempZ;
        break;
      }
    }
    set({ elements: sorted, saveStatus: 'unsaved' });
  },

  bringToFront: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();

    const maxZ = Math.max(...elements.map((e) => e.zIndex), 0);
    set({
      elements: elements.map((el) => (selectedElementIds.includes(el.id) ? { ...el, zIndex: maxZ + 1 } : el)),
      saveStatus: 'unsaved',
    });
  },

  sendToBack: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();

    const minZ = Math.min(...elements.map((e) => e.zIndex), 0);
    set({
      elements: elements.map((el) => (selectedElementIds.includes(el.id) ? { ...el, zIndex: minZ - 1 } : el)),
      saveStatus: 'unsaved',
    });
  },

  groupSelected: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length < 2) return;
    get().saveToHistory();

    const groupId = `grp_${Date.now()}`;
    set({
      elements: elements.map((el) => (selectedElementIds.includes(el.id) ? { ...el, groupId } : el)),
      saveStatus: 'unsaved',
    });
  },

  ungroupSelected: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();

    set({
      elements: elements.map((el) => (selectedElementIds.includes(el.id) ? { ...el, groupId: undefined } : el)),
      saveStatus: 'unsaved',
    });
  },

  toggleLockSelected: () => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length === 0) return;
    get().saveToHistory();

    const anyUnlocked = elements.some((el) => selectedElementIds.includes(el.id) && !el.isLocked);
    set({
      elements: elements.map((el) =>
        selectedElementIds.includes(el.id) ? { ...el, isLocked: anyUnlocked } : el
      ),
      saveStatus: 'unsaved',
    });
  },

  alignSelected: (alignment) => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length < 2) return;
    get().saveToHistory();

    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    const aligned = alignElements(selected, alignment);
    const alignedMap = new Map(aligned.map((el) => [el.id, el]));

    set({
      elements: elements.map((el) => alignedMap.get(el.id) || el),
      saveStatus: 'unsaved',
    });
  },

  distributeSelected: (direction) => {
    const { selectedElementIds, elements } = get();
    if (selectedElementIds.length < 3) return;
    get().saveToHistory();

    const selected = elements.filter((el) => selectedElementIds.includes(el.id));
    const distributed = distributeElements(selected, direction);
    const distMap = new Map(distributed.map((el) => [el.id, el]));

    set({
      elements: elements.map((el) => distMap.get(el.id) || el),
      saveStatus: 'unsaved',
    });
  },

  undo: () => {
    const { undoStack, redoStack, elements } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const newRedo = [JSON.parse(JSON.stringify(elements)), ...redoStack];

    set({
      elements: previous,
      undoStack: newUndo,
      redoStack: newRedo,
      selectedElementIds: [],
      saveStatus: 'unsaved',
    });
  },

  redo: () => {
    const { undoStack, redoStack, elements } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    const newUndo = [...undoStack, JSON.parse(JSON.stringify(elements))];

    set({
      elements: next,
      undoStack: newUndo,
      redoStack: newRedo,
      selectedElementIds: [],
      saveStatus: 'unsaved',
    });
  },

  addLaserPoint: (pt, color) => {
    set((state) => ({
      laserPoints: [...state.laserPoints, { x: pt.x, y: pt.y, time: Date.now(), color }],
    }));
  },

  clearLaserPoints: () => set({ laserPoints: [] }),

  loadTemplateElements: (templateElements) => {
    get().saveToHistory();
    set({
      elements: templateElements,
      selectedElementIds: [],
      saveStatus: 'unsaved',
    });
    get().fitToContent();
  },

  importElements: (imported) => {
    get().saveToHistory();
    set({
      elements: imported,
      selectedElementIds: [],
      saveStatus: 'unsaved',
    });
    get().fitToContent();
  },

  clearCanvas: () => {
    get().saveToHistory();
    set({
      elements: [],
      selectedElementIds: [],
      saveStatus: 'unsaved',
    });
  },
}));

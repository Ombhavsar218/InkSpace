import React, { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';
import {
  CanvasElement,
  Point,
  ToolType,
  TransformHandle,
} from '../../types';
import {
  getElementBounds,
  getHandleAtPoint,
  getSelectionBounds,
  isElementInBox,
  isPointInElement,
  rotatePoint,
  screenToWorld,
  worldToScreen,
} from '../../engine/geometry';
import {
  drawGrid,
  drawLaserTrail,
  drawMarqueeBox,
  drawSelectionOutline,
  getTextColor,
  renderElement,
} from '../../engine/renderer';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { TextEditor } from './TextEditor';
import { LiveCursors } from '../collaboration/LiveCursors';
import { CommentsOverlay } from '../collaboration/CommentsOverlay';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function handleCursorClass(handle: TransformHandle | null): string {
  if (!handle) return 'cursor-default';
  switch (handle) {
    case 'nw':
    case 'se':
      return 'cursor-nwse-resize';
    case 'ne':
    case 'sw':
      return 'cursor-nesw-resize';
    case 'n':
    case 's':
      return 'cursor-ns-resize';
    case 'e':
    case 'w':
      return 'cursor-ew-resize';
    case 'rot':
      return 'cursor-crosshair';
    default:
      return 'cursor-default';
  }
}

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Store state
  const {
    elements,
    selectedElementIds,
    tool,
    isKeepToolActive,
    viewState,
    gridType,
    defaultProps,
    editingTextId,
    laserPoints,
    laserColor,
    setElements,
    addElement,
    updateElement,
    updateElements,
    deleteSelectedElements,
    duplicateSelectedElements,
    setSelectedElementIds,
    clearSelection,
    toggleSelectElement,
    selectAll,
    setTool,
    setViewState,
    setEditingTextId,
    undo,
    redo,
    saveToHistory,
  } = useCanvasStore();

  const {
    sendCursorMove,
    sendCursorLeave,
    sendElementsChange,
    lockElement,
    unlockElement,
    sendLaserPoint,
    permission,
    activeCommentPin,
    setActiveCommentPin,
  } = useCollabStore();

  const { isDark } = useThemeStore();

  // Pointer interaction state
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [activeHandle, setActiveHandle] = useState<TransformHandle | null>(null);
  const [initialElementsSnapshot, setInitialElementsSnapshot] = useState<CanvasElement[]>([]);
  const [currentDrawingElement, setCurrentDrawingElement] = useState<CanvasElement | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{ start: Point; current: Point } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [laserCursor, setLaserCursor] = useState<Point | null>(null);
  const [hoverHandle, setHoverHandle] = useState<TransformHandle | null>(null);

  const isReadOnly = permission === 'VIEW';

  // 1. Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale context by DPR so all coordinates remain in CSS pixels
    ctx.scale(dpr, dpr);

    // Draw Grid
    drawGrid(ctx, width, height, viewState, gridType, isDark);

    // Apply Viewport Transform (Pan & Zoom)
    ctx.save();
    ctx.translate(viewState.scrollX, viewState.scrollY);
    ctx.scale(viewState.zoom, viewState.zoom);

    const rc = rough.canvas(canvas);

    // Draw all elements in sorted z-index order
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) {
      if (editingTextId === el.id && el.type === 'text') continue;
      renderElement(
        rc,
        ctx,
        el,
        () => {
          // Trigger re-render when image finishes loading
          useCanvasStore.setState({ elements: [...useCanvasStore.getState().elements] });
        },
        false // Text is rendered crisply via DOM overlay layer
      );
    }

    // Draw element currently being drawn
    if (currentDrawingElement) {
      renderElement(rc, ctx, currentDrawingElement, undefined, false);
    }

    // Draw Selection outlines & handles (only when not editing text)
    const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));
    if (selectedElements.length > 0 && !currentDrawingElement && !editingTextId) {
      drawSelectionOutline(ctx, selectedElements, viewState.zoom, selectedElements.length > 1);
    }

    // Draw Marquee selection box
    if (marqueeBox) {
      drawMarqueeBox(ctx, marqueeBox, viewState.zoom);
    }

    // Draw Laser Trail
    if (laserPoints.length > 0) {
      drawLaserTrail(ctx, laserPoints);
    }

    ctx.restore();
  }, [
    elements,
    selectedElementIds,
    viewState,
    gridType,
    isDark,
    currentDrawingElement,
    marqueeBox,
    laserPoints,
  ]);

  // Clean laser trail loop
  useEffect(() => {
    if (laserPoints.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const valid = laserPoints.filter((p) => now - p.time < 800);
      if (valid.length !== laserPoints.length) {
        useCanvasStore.setState({ laserPoints: valid });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [laserPoints]);

  // 2. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        sendElementsChange(useCanvasStore.getState().elements, true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        sendElementsChange(useCanvasStore.getState().elements, true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedElements();
        sendElementsChange(useCanvasStore.getState().elements, true);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isReadOnly && selectedElementIds.length > 0) {
          e.preventDefault();
          deleteSelectedElements();
          sendElementsChange(useCanvasStore.getState().elements, true);
        }
        return;
      }

      if (e.key === 'Escape') {
        clearSelection();
        setTool('select');
        setActiveCommentPin(null);
        return;
      }

      // Quick tool hotkeys
      const key = e.key.toLowerCase();
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (key === 'v') setTool('select');
        if (key === 'h') setTool('hand');
        if (key === 'r') setTool('rectangle');
        if (key === 'o') setTool('ellipse');
        if (key === 'd') setTool('diamond');
        if (key === 'a') setTool('arrow');
        if (key === 'l') setTool('line');
        if (key === 'p') setTool('freedraw');
        if (key === 't') setTool('text');
        if (key === 's') setTool('sticky');
        if (key === 'e') setTool('eraser');
        if (key === 'k') setTool('laser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, isReadOnly]);

  // 3. Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const screenPoint = { x: e.clientX, y: e.clientY };
    const worldPoint = screenToWorld(screenPoint, viewState);

    // Broadcast cursor position
    sendCursorMove(worldPoint.x, worldPoint.y, selectedElementIds);

    // Right click / Middle click or Hand tool: Pan Canvas
    if (e.button === 1 || e.button === 2 || tool === 'hand') {
      setIsPanning(true);
      setPanStart(screenPoint);
      return;
    }

    if (e.button !== 0) return; // Only process left click

    setIsPointerDown(true);
    setDragStartPoint(worldPoint);
    setInitialElementsSnapshot(JSON.parse(JSON.stringify(elements)));

    // Laser pointer mode
    if (tool === 'laser') {
      sendLaserPoint(worldPoint.x, worldPoint.y);
      return;
    }

    // Comment pin placement mode
    if (activeCommentPin) {
      setActiveCommentPin(worldPoint);
      return;
    }

    // Eraser mode
    if (tool === 'eraser') {
      const clickedEl = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));
      if (clickedEl && !isReadOnly) {
        saveToHistory();
        const updated = elements.filter((el) => el.id !== clickedEl.id);
        setElements(updated);
        sendElementsChange(updated, true);
      }
      return;
    }

    // Selection & Transform mode
    if (tool === 'select') {
      const selected = elements.filter((el) => selectedElementIds.includes(el.id));
      const selectionBounds = getSelectionBounds(selected);

      // Check if clicked a transform handle
      if (selectionBounds) {
        const handle = getHandleAtPoint(
          worldPoint,
          selectionBounds,
          selected.length === 1 ? selected[0].angle : 0,
          viewState.zoom
        );
        if (handle) {
          setActiveHandle(handle);
          return;
        }
      }

      // Check if clicked on an element
      const clickedEl = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));

      if (clickedEl) {
        if (clickedEl.isLocked) {
          // Locked element clicked
          setSelectedElementIds([clickedEl.id]);
          return;
        }

        toggleSelectElement(clickedEl.id, e.shiftKey);
        lockElement(clickedEl.id);
      } else {
        if (!e.shiftKey) {
          clearSelection();
        }
        // Start Marquee drag
        setMarqueeBox({ start: worldPoint, current: worldPoint });
      }
      return;
    }

    // Drawing shapes mode
    if (!isReadOnly) {
      const baseEl: CanvasElement = {
        id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: tool as any,
        x: worldPoint.x,
        y: worldPoint.y,
        width: 0,
        height: 0,
        angle: 0,
        strokeColor: defaultProps.strokeColor,
        fillColor: defaultProps.fillColor,
        fillStyle: defaultProps.fillStyle,
        strokeWidth: defaultProps.strokeWidth,
        strokeStyle: defaultProps.strokeStyle,
        roughness: defaultProps.roughness,
        opacity: defaultProps.opacity,
        roundness: defaultProps.roundness,
        fontSize: defaultProps.fontSize,
        fontFamily: defaultProps.fontFamily,
        textAlign: defaultProps.textAlign,
        zIndex: elements.length + 1,
        seed: Math.floor(Math.random() * 100000),
      };

      if (tool === 'text') {
        const newTextEl = {
          ...baseEl,
          width: 140,
          height: 36,
          text: '',
        };
        addElement(newTextEl);
        setEditingTextId(newTextEl.id);
        setIsPointerDown(false);
        return;
      }

      if (tool === 'sticky') {
        const newStickyEl = {
          ...baseEl,
          width: 200,
          height: 160,
          fillColor: defaultProps.fillColor !== 'transparent' ? defaultProps.fillColor : '#fef08a',
          strokeColor: '#ca8a04',
          text: '',
        };
        addElement(newStickyEl);
        setEditingTextId(newStickyEl.id);
        setIsPointerDown(false);
        return;
      }

      if (tool === 'freedraw' || tool === 'line' || tool === 'arrow') {
        baseEl.points = [{ x: 0, y: 0 }];
      }

      setCurrentDrawingElement(baseEl);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const screenPoint = { x: e.clientX, y: e.clientY };
    const worldPoint = screenToWorld(screenPoint, viewState);

    // Broadcast cursor position to collaborators
    sendCursorMove(worldPoint.x, worldPoint.y, selectedElementIds);

    if (tool === 'laser') {
      setLaserCursor(screenPoint);
    }

    // Pan Canvas
    if (isPanning) {
      const dx = screenPoint.x - panStart.x;
      const dy = screenPoint.y - panStart.y;
      setViewState({
        scrollX: viewState.scrollX + dx,
        scrollY: viewState.scrollY + dy,
      });
      setPanStart(screenPoint);
      return;
    }

    // Hover detection over transform handles (select tool, not dragging)
    if (tool === 'select' && !isPointerDown) {
      const selected = elements.filter((el) => selectedElementIds.includes(el.id));
      if (selectedElementIds.length > 0) {
        const bounds = getSelectionBounds(selected);
        if (bounds) {
          const handle = getHandleAtPoint(
            worldPoint,
            bounds,
            selected.length === 1 ? selected[0].angle : 0,
            viewState.zoom
          );
          setHoverHandle(handle);
        }
      } else {
        setHoverHandle(null);
      }
    }

    if (!isPointerDown || !dragStartPoint) return;

    // Laser pointer drag
    if (tool === 'laser') {
      sendLaserPoint(worldPoint.x, worldPoint.y);
      return;
    }

    // Eraser drag
    if (tool === 'eraser') {
      const clickedEl = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));
      if (clickedEl && !isReadOnly) {
        const updated = elements.filter((el) => el.id !== clickedEl.id);
        setElements(updated);
        sendElementsChange(updated, false);
      }
      return;
    }

    // Marquee Selection Drag
    if (marqueeBox) {
      setMarqueeBox({ start: marqueeBox.start, current: worldPoint });
      const minX = Math.min(marqueeBox.start.x, worldPoint.x);
      const maxX = Math.max(marqueeBox.start.x, worldPoint.x);
      const minY = Math.min(marqueeBox.start.y, worldPoint.y);
      const maxY = Math.max(marqueeBox.start.y, worldPoint.y);

      const inBoxIds = elements
        .filter((el) => isElementInBox(el, { minX, minY, maxX, maxY }))
        .map((el) => el.id);

      setSelectedElementIds(inBoxIds);
      return;
    }

    // Handle Active Resizing / Rotating
    if (activeHandle && selectedElementIds.length > 0) {
      const selected = initialElementsSnapshot.filter((el) => selectedElementIds.includes(el.id));
      const bounds = getSelectionBounds(selected);
      if (!bounds) return;

      if (activeHandle === 'rot') {
        // Calculate rotation angle
        const center = { x: bounds.centerX, y: bounds.centerY };
        let rad = Math.atan2(worldPoint.y - center.y, worldPoint.x - center.x);
        let deg = Math.round(((rad * 180) / Math.PI + 90) % 360);
        if (deg < 0) deg += 360;

        // Snap to 15 degrees if Shift is pressed
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        }

        updateElements(
          selected.map((el) => ({ id: el.id, changes: { angle: deg } })),
          false
        );
      } else {
        // Resizing
        const dx = worldPoint.x - dragStartPoint.x;
        const dy = worldPoint.y - dragStartPoint.y;

        if (selected.length === 1) {
          const orig = selected[0];
          let newX = orig.x;
          let newY = orig.y;
          let newW = orig.width;
          let newH = orig.height;

          if (activeHandle.includes('e')) newW = orig.width + dx;
          if (activeHandle.includes('s')) newH = orig.height + dy;
          if (activeHandle.includes('w')) {
            newW = orig.width - dx;
            newX = orig.x + dx;
          }
          if (activeHandle.includes('n')) {
            newH = orig.height - dy;
            newY = orig.y + dy;
          }

          // Aspect ratio lock with Shift or if locked
          if (e.shiftKey || orig.aspectRatioLocked) {
            const aspect = orig.width / (orig.height || 1);
            if (Math.abs(newW) > Math.abs(newH)) {
              newH = newW / aspect;
            } else {
              newW = newH * aspect;
            }
          }

          // For text, resizing scales the font size instead of stretching the box
          if (orig.type === 'text') {
            const usesWidth = activeHandle.includes('w') || activeHandle.includes('e');
            const usesHeight = activeHandle.includes('n') || activeHandle.includes('s');
            let scale = 1;
            if (usesWidth && orig.width > 0) {
              scale = newW / orig.width;
            } else if (usesHeight && orig.height > 0) {
              scale = newH / orig.height;
            }
            if (!isFinite(scale) || scale <= 0) scale = 1;
            scale = Math.max(0.25, Math.min(12, scale));

            newW = orig.width * scale;
            newH = orig.height * scale;
            if (activeHandle.includes('w')) newX = orig.x + (orig.width - newW);
            if (activeHandle.includes('n')) newY = orig.y + (orig.height - newH);

            updateElement(
              orig.id,
              {
                x: newX,
                y: newY,
                width: newW,
                height: newH,
                fontSize: Math.max(8, (orig.fontSize || 20) * scale),
              },
              false
            );
            return;
          }

          updateElement(orig.id, { x: newX, y: newY, width: newW, height: newH }, false);
        }
      }
      return;
    }

    // Moving / Dragging Selected Elements
    if (selectedElementIds.length > 0 && tool === 'select') {
      const dx = worldPoint.x - dragStartPoint.x;
      const dy = worldPoint.y - dragStartPoint.y;

      const updates = initialElementsSnapshot
        .filter((el) => selectedElementIds.includes(el.id))
        .map((el) => ({
          id: el.id,
          changes: {
            x: el.x + dx,
            y: el.y + dy,
          },
        }));

      updateElements(updates, false);
      return;
    }

    // Drawing Active Shape
    if (currentDrawingElement) {
      const dx = worldPoint.x - currentDrawingElement.x;
      const dy = worldPoint.y - currentDrawingElement.y;

      if (currentDrawingElement.type === 'freedraw') {
        const pts = currentDrawingElement.points || [];
        const localPt = { x: dx, y: dy };
        setCurrentDrawingElement({
          ...currentDrawingElement,
          points: [...pts, localPt],
        });
      } else if (currentDrawingElement.type === 'line' || currentDrawingElement.type === 'arrow') {
        setCurrentDrawingElement({
          ...currentDrawingElement,
          width: dx,
          height: dy,
          points: [{ x: 0, y: 0 }, { x: dx, y: dy }],
        });
      } else {
        // Rectangle, Ellipse, Diamond
        let w = dx;
        let h = dy;
        if (e.shiftKey) {
          // Square constraint
          const size = Math.max(Math.abs(w), Math.abs(h));
          w = w >= 0 ? size : -size;
          h = h >= 0 ? size : -size;
        }
        setCurrentDrawingElement({
          ...currentDrawingElement,
          width: w,
          height: h,
        });
      }
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (currentDrawingElement) {
      // Normalize negative width/height
      let el = { ...currentDrawingElement };
      if (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond') {
        if (el.width < 0) {
          el.x += el.width;
          el.width = Math.abs(el.width);
        }
        if (el.height < 0) {
          el.y += el.height;
          el.height = Math.abs(el.height);
        }
      }

      // Add if significant size
      const minDimension = el.type === 'freedraw' ? 0 : 5;
      if (Math.hypot(el.width, el.height) > minDimension || el.type === 'freedraw') {
        addElement(el);
        sendElementsChange([...elements, el], true);
      }
      setCurrentDrawingElement(null);
    } else if (isPointerDown) {
      // Save changes to history and sync with server
      saveToHistory();
      sendElementsChange(elements, true);

      // Release locks
      selectedElementIds.forEach((id) => unlockElement(id));
    }

    setIsPointerDown(false);
    setDragStartPoint(null);
    setActiveHandle(null);
    setHoverHandle(null);
    setMarqueeBox(null);
  };

  // 4. Wheel & Pinch Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered at mouse position
      const zoomFactor = 1 - e.deltaY * 0.005;
      const newZoom = Math.max(0.1, Math.min(5, viewState.zoom * zoomFactor));

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const newScrollX = mouseX - (mouseX - viewState.scrollX) * (newZoom / viewState.zoom);
      const newScrollY = mouseY - (mouseY - viewState.scrollY) * (newZoom / viewState.zoom);

      setViewState({ scrollX: newScrollX, scrollY: newScrollY, zoom: newZoom });
    } else {
      // Smooth Pan
      setViewState({
        scrollX: viewState.scrollX - e.deltaX,
        scrollY: viewState.scrollY - e.deltaY,
      });
    }
  };

  // 5. Double Click on Canvas (Edit Text or Create Text)
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPoint = { x: e.clientX, y: e.clientY };
    const worldPoint = screenToWorld(screenPoint, viewState);

    const clickedEl = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));

    if (clickedEl) {
      if (clickedEl.type === 'text' || clickedEl.type === 'sticky') {
        setEditingTextId(clickedEl.id);
      }
    } else if (!isReadOnly) {
      // Double click empty space to place text
      const newText: CanvasElement = {
        id: `txt_${Date.now()}`,
        type: 'text',
        x: worldPoint.x,
        y: worldPoint.y,
        width: 140,
        height: 36,
        angle: 0,
        strokeColor: defaultProps.strokeColor,
        fillColor: 'transparent',
        fillStyle: 'none',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        roundness: 0,
        fontSize: defaultProps.fontSize,
        fontFamily: defaultProps.fontFamily,
        textAlign: defaultProps.textAlign,
        text: '',
        zIndex: elements.length + 1,
        seed: Math.floor(Math.random() * 10000),
      };
      addElement(newText);
      setEditingTextId(newText.id);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-canvas-light dark:bg-canvas-dark select-none">
      {/* HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setLaserCursor(null);
          setHoverHandle(null);
          sendCursorLeave();
        }}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full block ${
          tool === 'hand' || isPanning
            ? 'cursor-grab active:cursor-grabbing'
            : tool === 'select'
            ? activeHandle
              ? handleCursorClass(activeHandle)
              : handleCursorClass(hoverHandle)
            : tool === 'eraser'
            ? 'cursor-crosshair'
            : tool === 'laser'
            ? 'cursor-none'
            : 'cursor-crosshair'
        }`}
      />

      {/* Laser Pointer Design */}
      {tool === 'laser' && laserCursor && (
        <div
          className="absolute z-40 pointer-events-none"
          style={{ left: laserCursor.x, top: laserCursor.y }}
        >
          <div
            className="-translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{
              backgroundColor: laserColor,
              boxShadow: `0 0 0 2px rgba(255,255,255,0.85), 0 0 4px 1px ${hexToRgba(laserColor, 0.9)}, 0 0 9px 3px ${hexToRgba(laserColor, 0.45)}`,
            }}
          />
        </div>
      )}

      {/* Ultra-Crisp DOM Text Layer (100% Identical to live typing) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {elements
          .filter((el) => el.id !== editingTextId && el.text)
          .map((el) => {
            const isSticky = el.type === 'sticky';
            const screenX = (el.x + (isSticky ? 12 : 0)) * viewState.zoom + viewState.scrollX;
            const screenY = (el.y + (isSticky ? 12 : 0)) * viewState.zoom + viewState.scrollY;
            const fontSize = (el.fontSize || 28) * viewState.zoom;
            const fontFamily = el.fontFamily || 'Caveat';
            const color = getTextColor(el, isDark);

            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  fontSize: `${fontSize}px`,
                  fontFamily: `"${fontFamily}", cursive, sans-serif`,
                  color,
                  textAlign: el.textAlign || 'left',
                  lineHeight: 1.2,
                  transformOrigin: '0 0',
                  transform: el.angle ? `rotate(${el.angle}deg)` : undefined,
                  whiteSpace: 'pre',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  opacity: (el.opacity ?? 100) / 100,
                  maxWidth: isSticky ? `${(el.width - 24) * viewState.zoom}px` : undefined,
                  wordBreak: 'break-word',
                }}
              >
                {el.text}
              </div>
            );
          })}
      </div>

      {/* Floating in-place Text Editor */}
      {editingTextId && <TextEditor />}

      {/* Live Collaborator Cursors Overlay */}
      <LiveCursors />

      {/* Comments Pins & Thread Cards Overlay */}
      <CommentsOverlay />
    </div>
  );
};

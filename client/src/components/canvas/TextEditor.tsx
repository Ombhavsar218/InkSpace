import React, { useEffect, useRef } from 'react';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { getTextColor } from '../../engine/renderer';

export const TextEditor: React.FC = () => {
  const { elements, editingTextId, setEditingTextId, updateElement, viewState } = useCanvasStore();
  const { sendElementsChange } = useCollabStore();
  const { isDark } = useThemeStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const editingElement = elements.find((el) => el.id === editingTextId);

  useEffect(() => {
    if (editingElement && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize();
    }
  }, [editingTextId]);

  if (!editingElement) return null;

  const autoResize = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.width = '1px';
    textareaRef.current.style.height = '1px';

    const scrollW = Math.max(16, textareaRef.current.scrollWidth);
    const scrollH = Math.max(24, textareaRef.current.scrollHeight);

    textareaRef.current.style.width = `${scrollW + 4}px`;
    textareaRef.current.style.height = `${scrollH}px`;

    // Update element width and height in world coords
    const worldW = (scrollW + 4) / viewState.zoom;
    const worldH = scrollH / viewState.zoom;
    updateElement(editingElement.id, {
      text: textareaRef.current.value,
      width: worldW,
      height: worldH,
    }, false);
  };

  const handleBlur = () => {
    if (!editingElement) return;
    const text = textareaRef.current?.value || '';

    autoResize();

    if (!text.trim() && editingElement.type === 'text') {
      // Remove empty text element
      useCanvasStore.getState().deleteSelectedElements();
    } else {
      updateElement(editingElement.id, { text }, true);
      sendElementsChange(useCanvasStore.getState().elements, true);
    }
    setEditingTextId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleBlur();
    }
  };

  // Compute screen coordinates for textarea positioning
  const isSticky = editingElement.type === 'sticky';
  const screenX = (editingElement.x + (isSticky ? 12 : 0)) * viewState.zoom + viewState.scrollX;
  const screenY = (editingElement.y + (isSticky ? 12 : 0)) * viewState.zoom + viewState.scrollY;
  const fontSize = (editingElement.fontSize || 20) * viewState.zoom;
  const fontFamily = editingElement.fontFamily || 'Caveat';
  const textColor = getTextColor(editingElement, isDark);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={editingElement.text || ''}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={autoResize}
      rows={1}
      wrap="off"
      autoFocus
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        minWidth: '2px',
        minHeight: `${fontSize * 1.2}px`,
        fontSize: `${fontSize}px`,
        fontFamily: `"${fontFamily}", cursive, sans-serif`,
        color: textColor,
        caretColor: textColor,
        textAlign: editingElement.textAlign || 'left',
        lineHeight: 1.2,
        padding: 0,
        margin: 0,
        border: '0px none transparent',
        outline: 'none',
        background: 'transparent',
        boxShadow: 'none',
        resize: 'none',
        overflow: 'hidden',
        whiteSpace: 'pre',
        zIndex: 50,
      }}
      spellCheck={false}
    />
  );
};

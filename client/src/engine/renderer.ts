import rough from 'roughjs';
import { CanvasElement, GridType, Point, TransformHandle, ViewState } from '../types';
import { getElementBounds, getSelectionBounds, getTransformHandles, rotatePoint } from './geometry';

// In-memory image cache
const imageCache = new Map<string, HTMLImageElement>();

export function getTextColor(
  el: Pick<CanvasElement, 'type' | 'strokeColor'>,
  isDark: boolean
): string {
  if (el.type === 'sticky') return '#1c1917';
  const explicit = el.strokeColor;
  if (isDark) {
    return explicit && explicit !== '#1e1e24' ? explicit : '#ffffff';
  }
  return explicit || '#1e1e24';
}

export function getCachedImage(url: string, onLoad?: () => void): HTMLImageElement | null {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  const img = new Image();
  img.src = url;
  img.onload = () => {
    imageCache.set(url, img);
    if (onLoad) onLoad();
  };
  return null;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: ViewState,
  gridType: GridType,
  isDark: boolean
) {
  if (gridType === 'none') return;

  const gridSize = 24 * view.zoom;
  const startX = ((view.scrollX % gridSize) + gridSize) % gridSize;
  const startY = ((view.scrollY % gridSize) + gridSize) % gridSize;

  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';

  if (gridType === 'dots') {
    const dotRadius = Math.max(1, 1.2 * Math.min(1.5, view.zoom));
    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (gridType === 'grid') {
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (gridType === 'cross') {
    const size = 3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.moveTo(x, y - size);
        ctx.lineTo(x, y + size);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function renderElement(
  rc: ReturnType<typeof rough.canvas>,
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  onImageLoad?: () => void,
  renderText: boolean = true
) {
  ctx.save();

  // Opacity
  ctx.globalAlpha = (el.opacity ?? 100) / 100;

  // Rotation
  const center = { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  if (el.angle) {
    ctx.translate(center.x, center.y);
    ctx.rotate((el.angle * Math.PI) / 180);
    ctx.translate(-center.x, -center.y);
  }

  const roughOptions: any = {
    seed: el.seed || 1,
    stroke: el.strokeColor || '#1e1e24',
    strokeWidth: el.strokeWidth || 2,
    roughness: el.roughness ?? 1,
    bowing: 1.5,
  };

  if (el.fillStyle && el.fillStyle !== 'none' && el.fillColor && el.fillColor !== 'transparent') {
    roughOptions.fill = el.fillColor;
    roughOptions.fillStyle = el.fillStyle;
    roughOptions.fillWeight = el.strokeWidth / 2;
    roughOptions.hachureGap = Math.max(4, el.strokeWidth * 3);
  }

  if (el.strokeStyle === 'dashed') {
    roughOptions.strokeLineDash = [8, 8];
  } else if (el.strokeStyle === 'dotted') {
    roughOptions.strokeLineDash = [3, 4];
  }

  switch (el.type) {
    case 'rectangle': {
      if (el.roundness && el.roundness > 0) {
        // Draw rounded rectangle
        const r = Math.min(20, Math.abs(el.width) / 4, Math.abs(el.height) / 4);
        const x = el.x;
        const y = el.y;
        const w = el.width;
        const h = el.height;
        rc.path(
          `M ${x + r} ${y} ` +
          `L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} ` +
          `L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} ` +
          `L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} ` +
          `L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`,
          roughOptions
        );
      } else {
        rc.rectangle(el.x, el.y, el.width, el.height, roughOptions);
      }
      break;
    }

    case 'ellipse': {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      rc.ellipse(cx, cy, Math.abs(el.width), Math.abs(el.height), roughOptions);
      break;
    }

    case 'diamond': {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const pts: [number, number][] = [
        [cx, el.y],
        [el.x + el.width, cy],
        [cx, el.y + el.height],
        [el.x, cy],
      ];
      rc.polygon(pts, roughOptions);
      break;
    }

    case 'line': {
      if (el.points && el.points.length >= 2) {
        const pts: [number, number][] = el.points.map((p) => [el.x + p.x, el.y + p.y]);
        rc.linearPath(pts, roughOptions);
      } else {
        rc.line(el.x, el.y, el.x + el.width, el.y + el.height, roughOptions);
      }
      break;
    }

    case 'arrow': {
      let p1 = { x: el.x, y: el.y };
      let p2 = { x: el.x + el.width, y: el.y + el.height };
      let pts: [number, number][] = [[p1.x, p1.y], [p2.x, p2.y]];

      if (el.points && el.points.length >= 2) {
        pts = el.points.map((p) => [el.x + p.x, el.y + p.y]);
        p1 = { x: pts[0][0], y: pts[0][1] };
        p2 = { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] };
        const prev = { x: pts[pts.length - 2][0], y: pts[pts.length - 2][1] };
        p1 = prev;
      }

      rc.linearPath(pts, roughOptions);

      // Draw Arrow Head
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLen = Math.max(14, el.strokeWidth * 4);
      const arrowAngle = Math.PI / 6;

      const a1: [number, number] = [
        p2.x - headLen * Math.cos(angle - arrowAngle),
        p2.y - headLen * Math.sin(angle - arrowAngle),
      ];
      const a2: [number, number] = [
        p2.x - headLen * Math.cos(angle + arrowAngle),
        p2.y - headLen * Math.sin(angle + arrowAngle),
      ];

      rc.linearPath([a1, [p2.x, p2.y], a2], {
        ...roughOptions,
        fillStyle: 'solid',
      });
      break;
    }

    case 'freedraw': {
      if (el.points && el.points.length > 1) {
        const pts: [number, number][] = el.points.map((p) => [el.x + p.x, el.y + p.y]);
        rc.curve(pts, roughOptions);
      }
      break;
    }

    case 'text': {
      if (renderText && el.text) {
        const fontSize = el.fontSize || 28;
        const fontFamily = el.fontFamily || 'Caveat';
        ctx.font = `${fontSize}px "${fontFamily}", cursive, sans-serif`;
        ctx.fillStyle = el.strokeColor || '#1e1e24';
        ctx.textBaseline = 'top';

        const lines = el.text.split('\n');
        const lineHeight = fontSize * 1.2;

        lines.forEach((line, index) => {
          let lineX = el.x;
          if (el.textAlign === 'center') {
            const metrics = ctx.measureText(line);
            lineX = el.x + (el.width - metrics.width) / 2;
          } else if (el.textAlign === 'right') {
            const metrics = ctx.measureText(line);
            lineX = el.x + el.width - metrics.width;
          }
          ctx.fillText(line, lineX, el.y + index * lineHeight);
        });
      }
      break;
    }

    case 'sticky': {
      // Soft shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      // Note background
      rc.rectangle(el.x, el.y, el.width, el.height, {
        ...roughOptions,
        fill: el.fillColor || '#fef08a',
        fillStyle: 'solid',
        stroke: el.strokeColor || '#ca8a04',
        strokeWidth: 1.5,
        roughness: 0.8,
      });

      ctx.shadowColor = 'transparent';

      // Text inside sticky note
      if (renderText && el.text) {
        const fontSize = el.fontSize || 20;
        const fontFamily = el.fontFamily || 'Caveat';
        ctx.font = `600 ${fontSize}px "${fontFamily}", cursive`;
        ctx.fillStyle = '#1c1917';
        ctx.textBaseline = 'top';

        const padding = 12;
        const lines = el.text.split('\n');
        const lineHeight = fontSize * 1.25;

        lines.forEach((line, index) => {
          ctx.fillText(line, el.x + padding, el.y + padding + index * lineHeight, el.width - padding * 2);
        });
      }
      break;
    }

    case 'image': {
      if (el.imageUrl) {
        const img = getCachedImage(el.imageUrl, onImageLoad);
        if (img && img.complete) {
          ctx.drawImage(img, el.x, el.y, el.width, el.height);
        } else {
          // Draw image placeholder box
          rc.rectangle(el.x, el.y, el.width, el.height, {
            ...roughOptions,
            fill: 'rgba(139, 92, 246, 0.05)',
            fillStyle: 'solid',
          });
          ctx.fillStyle = el.strokeColor || '#8b5cf6';
          ctx.font = '14px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Loading image...', el.x + el.width / 2, el.y + el.height / 2);
        }
      }
      break;
    }
  }

  ctx.restore();
}

export function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  zoom: number,
  isMulti: boolean = false
) {
  const bounds = getSelectionBounds(elements);
  if (!bounds) return;

  const isSingle = elements.length === 1;
  const singleElement = isSingle ? elements[0] : null;
  const angle = singleElement?.angle || 0;
  const center = { x: bounds.centerX, y: bounds.centerY };

  ctx.save();

  if (angle && isSingle) {
    ctx.translate(center.x, center.y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-center.x, -center.y);
  }

  // Bounding box
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1.5 / zoom;
  ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);

  // Handles
  const handles = getTransformHandles(bounds, 0);
  const handleSize = 8 / zoom;
  const halfSize = handleSize / 2;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2 / zoom;

  // Rotation stem line & dial
  ctx.beginPath();
  ctx.moveTo(bounds.centerX, bounds.minY);
  ctx.lineTo(handles.rot.x, handles.rot.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(handles.rot.x, handles.rot.y, halfSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Resize handles (only corners for text elements)
  const isTextElement = isSingle && singleElement!.type === 'text';
  const handlesToDraw: TransformHandle[] = isTextElement
    ? ['nw', 'ne', 'se', 'sw']
    : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  handlesToDraw.forEach((handleKey) => {
    const pt = handles[handleKey];
    ctx.fillRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
    ctx.strokeRect(pt.x - halfSize, pt.y - halfSize, handleSize, handleSize);
  });

  ctx.restore();
}

export function drawMarqueeBox(
  ctx: CanvasRenderingContext2D,
  box: { start: Point; current: Point },
  zoom: number
) {
  const minX = Math.min(box.start.x, box.current.x);
  const minY = Math.min(box.start.y, box.current.y);
  const width = Math.abs(box.current.x - box.start.x);
  const height = Math.abs(box.current.y - box.start.y);

  ctx.save();
  ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1 / zoom;

  ctx.fillRect(minX, minY, width, height);
  ctx.strokeRect(minX, minY, width, height);
  ctx.restore();
}

export function drawLaserTrail(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; time: number; color?: string }[]
) {
  if (points.length < 2) return;
  const now = Date.now();
  const maxAge = 800; // ms

  const valid = points.filter((p) => now - p.time < maxAge);
  if (valid.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;

  let i = 0;
  while (i < valid.length) {
    const color = valid[i].color || '#ef4444';
    let j = i + 1;
    while (j < valid.length && (valid[j].color || '#ef4444') === color) j++;
    if (j - i >= 2) {
      const start = valid[i];
      const end = valid[j - 1];
      const tailAge = now - start.time;
      const alpha = Math.max(0.85, 1 - tailAge / maxAge);

      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, hexToRgba(color, 0.85));
      grad.addColorStop(1, hexToRgba(color, alpha));
      ctx.strokeStyle = grad;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (let k = i + 1; k < j; k++) {
        ctx.lineTo(valid[k].x, valid[k].y);
      }
      ctx.stroke();
    }
    i = j;
  }
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

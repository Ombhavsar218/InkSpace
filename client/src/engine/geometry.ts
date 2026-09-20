import { CanvasElement, Point, TransformHandle, ViewState } from '../types';

export function screenToWorld(p: Point, view: ViewState): Point {
  return {
    x: (p.x - view.scrollX) / view.zoom,
    y: (p.y - view.scrollY) / view.zoom,
  };
}

export function worldToScreen(p: Point, view: ViewState): Point {
  return {
    x: p.x * view.zoom + view.scrollX,
    y: p.y * view.zoom + view.scrollY,
  };
}

export function rotatePoint(p: Point, center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function getElementBounds(el: CanvasElement): Bounds {
  if (el.type === 'freedraw' || el.type === 'line' || el.type === 'arrow') {
    if (el.points && el.points.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const p of el.points) {
        const absX = el.x + p.x;
        const absY = el.y + p.y;
        if (absX < minX) minX = absX;
        if (absY < minY) minY = absY;
        if (absX > maxX) maxX = absX;
        if (absY > maxY) maxY = absY;
      }

      const padding = Math.max(8, el.strokeWidth * 2);
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      return {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    }
  }

  const minX = Math.min(el.x, el.x + el.width);
  const maxX = Math.max(el.x, el.x + el.width);
  const minY = Math.min(el.y, el.y + el.height);
  const maxY = Math.max(el.y, el.y + el.height);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.abs(el.width),
    height: Math.abs(el.height),
    centerX: el.x + el.width / 2,
    centerY: el.y + el.height / 2,
  };
}

export function getSelectionBounds(elements: CanvasElement[]): Bounds | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const b = getElementBounds(el);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export function isPointInElement(point: Point, el: CanvasElement): boolean {
  const center = { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  const p = el.angle ? rotatePoint(point, center, -el.angle) : point;
  const tolerance = Math.max(8, el.strokeWidth + 4);

  if (el.type === 'rectangle' || el.type === 'text' || el.type === 'image' || el.type === 'sticky') {
    const minX = Math.min(el.x, el.x + el.width) - tolerance;
    const maxX = Math.max(el.x, el.x + el.width) + tolerance;
    const minY = Math.min(el.y, el.y + el.height) - tolerance;
    const maxY = Math.max(el.y, el.y + el.height) + tolerance;
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  }

  if (el.type === 'ellipse') {
    const rx = Math.abs(el.width / 2) + tolerance;
    const ry = Math.abs(el.height / 2) + tolerance;
    if (rx === 0 || ry === 0) return false;
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  if (el.type === 'diamond') {
    const rx = Math.abs(el.width / 2) + tolerance;
    const ry = Math.abs(el.height / 2) + tolerance;
    if (rx === 0 || ry === 0) return false;
    const dx = Math.abs(p.x - center.x);
    const dy = Math.abs(p.y - center.y);
    return dx / rx + dy / ry <= 1;
  }

  if (el.type === 'line' || el.type === 'arrow' || el.type === 'freedraw') {
    if (!el.points || el.points.length < 2) return false;
    for (let i = 0; i < el.points.length - 1; i++) {
      const p1 = { x: el.x + el.points[i].x, y: el.y + el.points[i].y };
      const p2 = { x: el.x + el.points[i + 1].x, y: el.y + el.points[i + 1].y };
      if (distanceToSegment(point, p1, p2) <= tolerance) {
        return true;
      }
    }
    return false;
  }

  return false;
}

export function isElementInBox(el: CanvasElement, box: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
  const b = getElementBounds(el);
  return b.minX >= box.minX && b.maxX <= box.maxX && b.minY >= box.minY && b.maxY <= box.maxY;
}

export function getTransformHandles(bounds: Bounds, angle: number = 0): Record<TransformHandle, Point> {
  const { minX, minY, maxX, maxY, centerX, centerY } = bounds;
  const rotDistance = 24;

  const rawHandles: Record<TransformHandle, Point> = {
    nw: { x: minX, y: minY },
    n: { x: centerX, y: minY },
    ne: { x: maxX, y: minY },
    e: { x: maxX, y: centerY },
    se: { x: maxX, y: maxY },
    s: { x: centerX, y: maxY },
    sw: { x: minX, y: maxY },
    w: { x: minX, y: centerY },
    rot: { x: centerX, y: minY - rotDistance },
  };

  if (!angle) return rawHandles;

  const center = { x: centerX, y: centerY };
  const rotated: Partial<Record<TransformHandle, Point>> = {};
  for (const [key, pt] of Object.entries(rawHandles)) {
    rotated[key as TransformHandle] = rotatePoint(pt, center, angle);
  }
  return rotated as Record<TransformHandle, Point>;
}

export function getHandleAtPoint(
  point: Point,
  bounds: Bounds,
  angle: number = 0,
  zoom: number = 1,
  edgeHandles: boolean = true
): TransformHandle | null {
  const handles = getTransformHandles(bounds, angle);
  const handleRadius = 8 / zoom;

  for (const [handle, pt] of Object.entries(handles)) {
    if (!edgeHandles && (handle === 'n' || handle === 's' || handle === 'e' || handle === 'w')) {
      continue;
    }
    const dist = Math.hypot(point.x - pt.x, point.y - pt.y);
    if (dist <= handleRadius) {
      return handle as TransformHandle;
    }
  }

  return null;
}

export function alignElements(elements: CanvasElement[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): CanvasElement[] {
  if (elements.length < 2) return elements;
  const overallBounds = getSelectionBounds(elements);
  if (!overallBounds) return elements;

  return elements.map((el) => {
    const b = getElementBounds(el);
    let newX = el.x;
    let newY = el.y;

    switch (alignment) {
      case 'left':
        newX = overallBounds.minX + (el.x - b.minX);
        break;
      case 'center':
        newX = overallBounds.centerX - (b.maxX - b.minX) / 2 + (el.x - b.minX);
        break;
      case 'right':
        newX = overallBounds.maxX - (b.maxX - b.minX) + (el.x - b.minX);
        break;
      case 'top':
        newY = overallBounds.minY + (el.y - b.minY);
        break;
      case 'middle':
        newY = overallBounds.centerY - (b.maxY - b.minY) / 2 + (el.y - b.minY);
        break;
      case 'bottom':
        newY = overallBounds.maxY - (b.maxY - b.minY) + (el.y - b.minY);
        break;
    }

    return { ...el, x: newX, y: newY };
  });
}

export function distributeElements(elements: CanvasElement[], direction: 'horizontal' | 'vertical'): CanvasElement[] {
  if (elements.length < 3) return elements;

  const sorted = [...elements].sort((a, b) => {
    return direction === 'horizontal' ? a.x - b.x : a.y - b.y;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (direction === 'horizontal') {
    const totalSpan = (last.x + last.width) - first.x;
    const totalWidths = sorted.reduce((sum, el) => sum + el.width, 0);
    const gap = (totalSpan - totalWidths) / (sorted.length - 1);

    let currentX = first.x;
    return sorted.map((el) => {
      const updated = { ...el, x: currentX };
      currentX += el.width + gap;
      return updated;
    });
  } else {
    const totalSpan = (last.y + last.height) - first.y;
    const totalHeights = sorted.reduce((sum, el) => sum + el.height, 0);
    const gap = (totalSpan - totalHeights) / (sorted.length - 1);

    let currentY = first.y;
    return sorted.map((el) => {
      const updated = { ...el, y: currentY };
      currentY += el.height + gap;
      return updated;
    });
  }
}

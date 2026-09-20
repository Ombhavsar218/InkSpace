import rough from 'roughjs';
import { CanvasElement } from '../types';
import { getSelectionBounds } from './geometry';
import { renderElement } from './renderer';

export interface ExportOptions {
  scale?: number; // 1, 2, 3
  background?: boolean;
  isDark?: boolean;
  onlySelected?: boolean;
  selectedIds?: string[];
  title?: string;
}

export async function exportToBlob(
  elements: CanvasElement[],
  options: ExportOptions = {}
): Promise<Blob | null> {
  const {
    scale = 2,
    background = true,
    isDark = true,
    onlySelected = false,
    selectedIds = [],
  } = options;

  let targets = elements;
  if (onlySelected && selectedIds.length > 0) {
    targets = elements.filter((el) => selectedIds.includes(el.id));
  }

  if (targets.length === 0) return null;

  const bounds = getSelectionBounds(targets);
  if (!bounds) return null;

  const padding = 40;
  const width = (bounds.width + padding * 2) * scale;
  const height = (bounds.height + padding * 2) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);

  if (background) {
    ctx.fillStyle = isDark ? '#121214' : '#ffffff';
    ctx.fillRect(0, 0, bounds.width + padding * 2, bounds.height + padding * 2);
  }

  ctx.translate(-bounds.minX + padding, -bounds.minY + padding);

  const rc = rough.canvas(canvas);

  // Render elements in sorted z-index order
  const sorted = [...targets].sort((a, b) => a.zIndex - b.zIndex);
  for (const el of sorted) {
    renderElement(rc, ctx, el);
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function downloadPng(elements: CanvasElement[], options: ExportOptions = {}) {
  const blob = await exportToBlob(elements, options);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.title || 'whiteboard'}-${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyImageToClipboard(elements: CanvasElement[], options: ExportOptions = {}): Promise<boolean> {
  try {
    const blob = await exportToBlob(elements, options);
    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
    return false;
  }
}

export function downloadJson(elements: CanvasElement[], title: string = 'whiteboard') {
  const data = {
    app: 'InkSpace',
    version: '1.0.0',
    title,
    createdAt: new Date().toISOString(),
    elements,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const a = document.createElement('a');
  a.href = jsonString;
  a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.inkspace`;
  a.click();
}

export function downloadSvg(elements: CanvasElement[], options: ExportOptions = {}) {
  const bounds = getSelectionBounds(elements);
  if (!bounds) return;

  const padding = 40;
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  const isDark = options.isDark ?? true;
  const bgFill = options.background ? (isDark ? '#121214' : '#ffffff') : 'none';

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  if (options.background) {
    svgContent += `  <rect width="100%" height="100%" fill="${bgFill}"/>\n`;
  }
  svgContent += `  <g transform="translate(${-bounds.minX + padding}, ${-bounds.minY + padding})">\n`;

  for (const el of elements) {
    const stroke = el.strokeColor || '#8b5cf6';
    const strokeWidth = el.strokeWidth || 2;
    const fill = el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : 'none';
    const opacity = (el.opacity ?? 100) / 100;

    if (el.type === 'rectangle') {
      const rx = el.roundness ? 8 : 0;
      svgContent += `    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n`;
    } else if (el.type === 'ellipse') {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = Math.abs(el.width / 2);
      const ry = Math.abs(el.height / 2);
      svgContent += `    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n`;
    } else if (el.type === 'text' && el.text) {
      const lines = el.text.split('\n');
      const fontSize = el.fontSize || 18;
      lines.forEach((line, idx) => {
        svgContent += `    <text x="${el.x}" y="${el.y + (idx + 1) * fontSize * 1.2}" fill="${stroke}" font-size="${fontSize}" font-family="${el.fontFamily || 'sans-serif'}" opacity="${opacity}">${line}</text>\n`;
      });
    } else if (el.type === 'sticky') {
      svgContent += `    <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="4" fill="${el.fillColor || '#fef08a'}" stroke="${stroke}" stroke-width="1.5" opacity="${opacity}" />\n`;
      if (el.text) {
        const lines = el.text.split('\n');
        const fontSize = el.fontSize || 16;
        lines.forEach((line, idx) => {
          svgContent += `    <text x="${el.x + 12}" y="${el.y + 20 + (idx + 1) * fontSize * 1.2}" fill="#1c1917" font-size="${fontSize}" font-family="Caveat, cursive">${line}</text>\n`;
        });
      }
    }
  }

  svgContent += `  </g>\n</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.title || 'whiteboard'}-${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

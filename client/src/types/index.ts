export type ElementType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'sticky';

export type ToolType =
  | 'select'
  | 'hand'
  | ElementType
  | 'eraser'
  | 'laser';

export type FillStyle = 'hachure' | 'solid' | 'cross-hatch' | 'dots' | 'zigzag' | 'none';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type TextAlign = 'left' | 'center' | 'right';
export type FontFamily = 'Caveat' | 'Inter' | 'Fira Code';
export type GridType = 'dots' | 'grid' | 'cross' | 'none';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // in degrees
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number; // 0 = clean, 1 = normal, 2 = sketchy
  opacity: number; // 0 to 100
  roundness: number; // 0 = sharp, 1 = rounded
  
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;

  // Freehand / Arrow / Line specific
  points?: Point[];

  // Image specific
  imageUrl?: string;
  aspectRatioLocked?: boolean;

  // Organization & Metadata
  groupId?: string;
  isLocked?: boolean;
  zIndex: number;
  seed: number;
}

export type TransformHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rot';

export interface ViewState {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isGuest?: boolean;
}

export interface PresenceUser {
  socketId: string;
  userId: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: Point;
  selectedElementIds?: string[];
}

export interface Comment {
  id: string;
  whiteboardId: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: string;
}

export interface BoardVersion {
  id: string;
  whiteboardId: string;
  name: string;
  createdAt: string;
}

export interface WhiteboardSummary {
  id: string;
  title: string;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  canvasData: string;
  viewState: string;
  thumbnail?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
    versions: number;
  };
}

export interface DiagramTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  elements: CanvasElement[];
}

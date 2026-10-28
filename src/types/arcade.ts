export type UnitSystem = 'imperial' | 'metric';
export type UnitDisplay = 'inches' | 'feet-inches' | 'cm' | 'meters';
export type ViewMode = '2d-cad' | '3d-orbit' | '3d-walk' | '3d-fly';
export type ActiveTool =
  | 'select'
  | 'draw-wall'
  | 'draw-rect'
  | 'add-door'
  | 'add-window'
  | 'measure';
export type FloorMaterial = 'neon-carpet' | 'polished-concrete' | 'wood' | 'grid';

export type MachineCategory =
  | 'classic-upright'
  | 'deluxe-widebody'
  | 'pinball'
  | 'racing-cockpit'
  | 'four-player'
  | 'novelty-rhythm'
  | 'custom';

export interface MachineDefinition {
  id: string;
  name: string;
  shortTag: string;
  category: MachineCategory;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  playerClearanceMm: number;
  serviceClearanceMm: number;
  powerWatts: number;
  cabinetColor: string;
  accentColor: string;
  marqueeTitle: string;
  marqueeBgColor: string;
  marqueeTextColor: string;
  screenColor: string;
  isCustom?: boolean;
}

export type OpeningType = 'single-door' | 'double-door' | 'window';

export interface WallOpening {
  id: string;
  type: OpeningType;
  offsetRatio: number; // 0.08 to 0.92 along the wall segment
  widthMm: number;
  heightMm: number;
  sillHeightMm: number; // 0 for doors, >0 for windows
  swingDirection?: 'inward' | 'outward';
}

export interface WallSegment {
  id: string;
  start: { x: number; y: number }; // mm in 2D plane (X = right, Y = down/south -> Z in 3D)
  end: { x: number; y: number };
  thicknessMm: number;
  openings?: WallOpening[];
  // Legacy single-door fields preserved for backward compatibility
  hasDoor?: boolean;
  doorOffsetRatio?: number;
  doorWidthMm?: number;
  neonSignText?: string;
  neonSignColor?: string;
}

export interface PlacedMachine {
  instanceId: string;
  definitionId: string;
  name: string;
  label: string; // e.g., "P1", "P2", "R1"
  position: { x: number; y: number; z: number }; // x = horizontal mm, z = depth mm on floor, y = elevation mm
  rotationYDeg: number; // 0 = facing South (+Z), 90 = facing East (+X), 180 = facing North (-Z), 270 = facing West (-X)
  customDimensions?: {
    widthMm: number;
    depthMm: number;
    heightMm: number;
    playerClearanceMm?: number;
    serviceClearanceMm?: number;
  };
  cabinetColor?: string;
  accentColor?: string;
  marqueeTitle?: string;
  powerWatts?: number;
  layerId?: string;
}

export interface LayerItem {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

export interface ArcadeProjectSettings {
  unitSystem: UnitSystem;
  unitDisplay: UnitDisplay;
  gridSizeMm: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  snapToWalls: boolean;
  showClearanceZones: boolean;
  showDimensions: boolean;
  showLabels: boolean;
  wallHeightMm: number;
  lightingMode: 'arcade-night' | 'work-daylight';
  walkSpeedPercent: number;
}

export interface ArcadeProject {
  version: string;
  id: string;
  name: string;
  updatedAt: string;
  settings: ArcadeProjectSettings;
  floorPlan: {
    walls: WallSegment[];
    material: FloorMaterial;
  };
  layers: LayerItem[];
  customCatalog: MachineDefinition[];
  placedMachines: PlacedMachine[];
}

export interface CollisionStatus {
  machineCollisionIds: Set<string>;
  clearanceWarningIds: Set<string>;
}

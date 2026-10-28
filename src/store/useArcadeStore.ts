import { create } from 'zustand';
import {
  ActiveTool,
  ArcadeProject,
  ArcadeProjectSettings,
  FloorMaterial,
  MachineDefinition,
  OpeningType,
  PlacedMachine,
  UnitDisplay,
  UnitSystem,
  ViewMode,
  WallOpening,
  WallSegment,
} from '../types/arcade';
import { getWallOpenings } from '../utils/geometry';
import {
  BUILTIN_CATALOG,
  createDefaultProject,
  createLShapedRoomWalls,
  createRectangularRoomWalls,
} from '../data/catalog';
import { feetToMm, inchesToMm, metersToMm } from '../utils/units';

const STORAGE_KEY_PROJECT = 'arcade_layout_studio_project_v1';
const STORAGE_KEY_SESSION = 'arcade_layout_studio_session_v1';
const STORAGE_KEY_REVISIONS = 'arcade_layout_studio_revisions_v1';

export interface RevisionEntry {
  timestamp: string;
  label: string;
  project: ArcadeProject;
}

interface HistorySnapshot {
  placedMachines: PlacedMachine[];
  walls: WallSegment[];
  material: FloorMaterial;
}

interface SessionState {
  viewMode: ViewMode;
  activeTool: ActiveTool;
  walkPos: { x: number; z: number; yaw: number; pitch: number };
}

interface ArcadeStoreState {
  project: ArcadeProject;
  viewMode: ViewMode;
  activeTool: ActiveTool;
  selectedMachineIds: string[];
  selectedWallId: string | null;
  selectedOpeningId: string | null;
  clipboardMachines: PlacedMachine[];
  cursorWorldMm: { x: number; z: number };
  walkPlayer: { x: number; z: number; yaw: number; pitch: number };
  orbitStats: { altitudeM: number; angleDeg: number; zoomPercent: number };
  autoSaveState: 'saved' | 'saving';
  lastSavedTime: string;
  revisions: RevisionEntry[];
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // Catalog helper
  getAllCatalog: () => MachineDefinition[];
  getCatalogMap: () => Map<string, MachineDefinition>;

  // View & Tool actions
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setCursorWorldMm: (pos: { x: number; z: number }) => void;
  setWalkPlayer: (partial: Partial<{ x: number; z: number; yaw: number; pitch: number }>) => void;
  setOrbitStats: (stats: Partial<{ altitudeM: number; angleDeg: number; zoomPercent: number }>) => void;

  // Settings & Units
  toggleUnitSystem: () => void;
  setUnitSystemAndDisplay: (system: UnitSystem, display: UnitDisplay) => void;
  updateSettings: (partial: Partial<ArcadeProjectSettings>) => void;
  setFloorMaterial: (material: FloorMaterial) => void;
  setProjectName: (name: string) => void;

  // Selection
  selectMachine: (id: string | null, multi?: boolean) => void;
  setSelectedMachineIds: (ids: string[]) => void;
  selectWall: (id: string | null, openingId?: string | null) => void;

  // Wall Openings (Doors & Windows)
  addWallOpening: (
    wallId: string,
    type: OpeningType,
    offsetRatio: number
  ) => string;
  updateWallOpening: (
    wallId: string,
    openingId: string,
    partial: Partial<WallOpening>
  ) => void;
  deleteWallOpening: (wallId: string, openingId: string) => void;

  // Machine CRUD & Manipulation
  addMachineFromCatalog: (definitionId: string, positionMm?: { x: number; z: number }) => string;
  moveMachines: (deltas: Array<{ id: string; x: number; z: number }>, recordHistory?: boolean) => void;
  commitHistorySnapshot: () => void;
  rotateSelectedMachines: (deltaDeg: number) => void;
  setMachineRotation: (id: string, deg: number) => void;
  updateMachineProps: (id: string, partial: Partial<PlacedMachine>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  cloneMachineRow: (id: string, count: number, spacingMm: number, direction: 'right' | 'down' | 'left' | 'up') => void;
  copySelected: () => void;
  pasteClipboard: (atPositionMm?: { x: number; z: number }) => void;

  // Custom catalog
  addCustomMachineDefinition: (def: Omit<MachineDefinition, 'id' | 'isCustom'>) => MachineDefinition;

  // Room & Wall actions
  addWallSegment: (wall: Omit<WallSegment, 'id'>) => void;
  updateWallSegment: (id: string, partial: Partial<WallSegment>) => void;
  deleteWallSegment: (id: string) => void;
  setRectangularRoom: (widthMm: number, depthMm: number) => void;
  setLShapedRoom: () => void;
  clearWalls: () => void;

  // Layers
  toggleLayerVisibility: (layerId: string) => void;
  addLayer: (name: string) => void;

  // Undo / Redo / Persistence
  undo: () => void;
  redo: () => void;
  resetToShowcaseProject: () => void;
  clearAllMachines: () => void;
  importProjectJson: (jsonStr: string) => boolean;
  restoreRevision: (index: number) => void;
}

function loadInitialProject(): ArcadeProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECT);
    if (raw) {
      const parsed = JSON.parse(raw) as ArcadeProject;
      if (parsed && parsed.floorPlan && Array.isArray(parsed.placedMachines)) {
        // Enforce 8 ft drop ceiling and remove signs from walls
        parsed.settings.wallHeightMm = feetToMm(8);
        parsed.floorPlan.walls = parsed.floorPlan.walls.map((w) => ({
          ...w,
          neonSignText: undefined,
          neonSignColor: undefined,
        }));
        return parsed;
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return createDefaultProject();
}

function loadInitialSession(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        viewMode: parsed.viewMode || '2d-cad',
        activeTool: parsed.activeTool || 'select',
        walkPos: parsed.walkPos || {
          x: feetToMm(10),
          z: feetToMm(12),
          yaw: Math.PI / 2,
          pitch: 0,
        },
      };
    }
  } catch {
    // ignore
  }
  return {
    viewMode: '2d-cad',
    activeTool: 'select',
    walkPos: {
      x: feetToMm(10),
      z: feetToMm(12),
      yaw: Math.PI / 2,
      pitch: 0,
    },
  };
}

function loadInitialRevisions(): RevisionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVISIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.slice(0, 3);
    }
  } catch {
    // ignore
  }
  return [];
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSave(
  project: ArcadeProject,
  session: SessionState,
  onSaved: (timeStr: string, revisions: RevisionEntry[]) => void
) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const now = new Date();
      const updatedProject: ArcadeProject = {
        ...project,
        updatedAt: now.toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(updatedProject));
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));

      const existingRevs = loadInitialRevisions();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newRev: RevisionEntry = {
        timestamp: timeStr,
        label: `${updatedProject.placedMachines.length} machines • ${timeStr}`,
        project: updatedProject,
      };
      const updatedRevs = [newRev, ...existingRevs].slice(0, 3);
      localStorage.setItem(STORAGE_KEY_REVISIONS, JSON.stringify(updatedRevs));
      onSaved(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedRevs
      );
    } catch {
      // ignore storage quota errors
    }
  }, 450);
}

const initialProject = loadInitialProject();
const initialSession = loadInitialSession();
const initialRevisions = loadInitialRevisions();

export const useArcadeStore = create<ArcadeStoreState>((set, get) => {
  const triggerSave = () => {
    const state = get();
    set({ autoSaveState: 'saving' });
    scheduleAutoSave(
      state.project,
      {
        viewMode: state.viewMode,
        activeTool: state.activeTool,
        walkPos: state.walkPlayer,
      },
      (timeStr, revs) => {
        set({ autoSaveState: 'saved', lastSavedTime: timeStr, revisions: revs });
      }
    );
  };

  const makeSnapshot = (p: ArcadeProject): HistorySnapshot => ({
    placedMachines: JSON.parse(JSON.stringify(p.placedMachines)),
    walls: JSON.parse(JSON.stringify(p.floorPlan.walls)),
    material: p.floorPlan.material,
  });

  return {
    project: initialProject,
    viewMode: initialSession.viewMode,
    activeTool: initialSession.activeTool,
    selectedMachineIds: initialProject.placedMachines[0]
      ? [initialProject.placedMachines[0].instanceId]
      : [],
    selectedWallId: null,
    selectedOpeningId: null,
    clipboardMachines: [],
    cursorWorldMm: { x: feetToMm(15), z: feetToMm(10) },
    walkPlayer: initialSession.walkPos,
    orbitStats: { altitudeM: 14, angleDeg: 48, zoomPercent: 85 },
    autoSaveState: 'saved',
    lastSavedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    revisions: initialRevisions,
    past: [],
    future: [],

    getAllCatalog: () => {
      return [...BUILTIN_CATALOG, ...get().project.customCatalog];
    },

    getCatalogMap: () => {
      const map = new Map<string, MachineDefinition>();
      for (const def of BUILTIN_CATALOG) map.set(def.id, def);
      for (const def of get().project.customCatalog) map.set(def.id, def);
      return map;
    },

    setViewMode: (mode) => {
      set({ viewMode: mode });
      triggerSave();
    },

    setActiveTool: (tool) => {
      set({ activeTool: tool });
      triggerSave();
    },

    setCursorWorldMm: (pos) => set({ cursorWorldMm: pos }),

    setWalkPlayer: (partial) => {
      set((s) => ({ walkPlayer: { ...s.walkPlayer, ...partial } }));
      triggerSave();
    },

    setOrbitStats: (stats) => {
      set((s) => ({ orbitStats: { ...s.orbitStats, ...stats } }));
    },

    toggleUnitSystem: () => {
      const { project } = get();
      const nextSystem: UnitSystem =
        project.settings.unitSystem === 'imperial' ? 'metric' : 'imperial';
      const nextDisplay: UnitDisplay = nextSystem === 'imperial' ? 'feet-inches' : 'meters';
      const nextGridMm = nextSystem === 'imperial' ? feetToMm(1) : metersToMm(0.5);

      set({
        project: {
          ...project,
          settings: {
            ...project.settings,
            unitSystem: nextSystem,
            unitDisplay: nextDisplay,
            gridSizeMm: nextGridMm,
          },
        },
      });
      triggerSave();
    },

    setUnitSystemAndDisplay: (system, display) => {
      const { project } = get();
      const nextGridMm = system === 'imperial' ? feetToMm(1) : metersToMm(0.5);
      set({
        project: {
          ...project,
          settings: {
            ...project.settings,
            unitSystem: system,
            unitDisplay: display,
            gridSizeMm: nextGridMm,
          },
        },
      });
      triggerSave();
    },

    updateSettings: (partial) => {
      const { project } = get();
      set({
        project: {
          ...project,
          settings: {
            ...project.settings,
            ...partial,
          },
        },
      });
      triggerSave();
    },

    setFloorMaterial: (material) => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            material,
          },
        },
      });
      triggerSave();
    },

    setProjectName: (name) => {
      const { project } = get();
      set({
        project: {
          ...project,
          name,
        },
      });
      triggerSave();
    },

    selectMachine: (id, multi = false) => {
      if (!id) {
        set({ selectedMachineIds: [] });
        return;
      }
      const { selectedMachineIds } = get();
      if (multi) {
        if (selectedMachineIds.includes(id)) {
          set({ selectedMachineIds: selectedMachineIds.filter((item) => item !== id) });
        } else {
          set({ selectedMachineIds: [...selectedMachineIds, id], selectedWallId: null });
        }
      } else {
        set({ selectedMachineIds: [id], selectedWallId: null });
      }
    },

    setSelectedMachineIds: (ids) => {
      set({ selectedMachineIds: ids, selectedWallId: null });
    },

    selectWall: (id, openingId = null) => {
      set({
        selectedWallId: id,
        selectedOpeningId: openingId,
        selectedMachineIds: id ? [] : get().selectedMachineIds,
      });
    },

    addWallOpening: (wallId, type, offsetRatio) => {
      const { project, past } = get();
      const openingId = `open-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const isWindow = type === 'window';
      const isDoubleDoor = type === 'double-door';
      const newOpening: WallOpening = {
        id: openingId,
        type,
        offsetRatio: Math.max(0.08, Math.min(0.92, offsetRatio)),
        widthMm: isDoubleDoor
          ? inchesToMm(72)
          : isWindow
            ? inchesToMm(60)
            : inchesToMm(38),
        heightMm: isWindow ? inchesToMm(48) : inchesToMm(84),
        sillHeightMm: isWindow ? inchesToMm(36) : 0,
        swingDirection: 'inward',
      };

      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedWallId: wallId,
        selectedOpeningId: openingId,
        selectedMachineIds: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: project.floorPlan.walls.map((w) => {
              if (w.id !== wallId) return w;
              const existing = getWallOpenings(w);
              return {
                ...w,
                hasDoor: false,
                openings: [...existing, newOpening],
              };
            }),
          },
        },
      });
      triggerSave();
      return openingId;
    },

    updateWallOpening: (wallId, openingId, partial) => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: project.floorPlan.walls.map((w) => {
              if (w.id !== wallId) return w;
              const existing = getWallOpenings(w);
              return {
                ...w,
                hasDoor: false,
                openings: existing.map((op) =>
                  op.id === openingId ? { ...op, ...partial } : op
                ),
              };
            }),
          },
        },
      });
      triggerSave();
    },

    deleteWallOpening: (wallId, openingId) => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedOpeningId: null,
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: project.floorPlan.walls.map((w) => {
              if (w.id !== wallId) return w;
              const existing = getWallOpenings(w);
              return {
                ...w,
                hasDoor: false,
                openings: existing.filter((op) => op.id !== openingId),
              };
            }),
          },
        },
      });
      triggerSave();
    },

    commitHistorySnapshot: () => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
      });
    },

    addMachineFromCatalog: (definitionId, positionMm) => {
      const { project, past, getCatalogMap } = get();
      const def = getCatalogMap().get(definitionId);
      if (!def) return '';

      const instanceId = `inst-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const countOfType =
        project.placedMachines.filter((m) => m.definitionId === definitionId).length + 1;
      const prefix =
        def.category === 'pinball'
          ? 'P'
          : def.category === 'racing-cockpit'
            ? 'R'
            : def.category === 'four-player'
              ? '4P-'
              : def.category === 'novelty-rhythm'
                ? 'D'
                : 'M';

      const pos = positionMm ?? { x: feetToMm(30), z: feetToMm(12) };
      const newMachine: PlacedMachine = {
        instanceId,
        definitionId: def.id,
        name: def.name,
        label: `${prefix}${countOfType}`,
        position: {
          x: Math.round(pos.x),
          y: 0,
          z: Math.round(pos.z),
        },
        rotationYDeg: 0,
        layerId: project.layers[0]?.id ?? 'layer-a1',
      };

      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedMachineIds: [instanceId],
        selectedWallId: null,
        project: {
          ...project,
          placedMachines: [...project.placedMachines, newMachine],
        },
      });
      triggerSave();
      return instanceId;
    },

    moveMachines: (deltas, recordHistory = false) => {
      const { project, past } = get();
      const map = new Map(deltas.map((d) => [d.id, d]));
      const nextPlaced = project.placedMachines.map((m) => {
        const hit = map.get(m.instanceId);
        if (!hit) return m;
        return {
          ...m,
          position: {
            ...m.position,
            x: Math.round(hit.x),
            z: Math.round(hit.z),
          },
        };
      });

      set({
        ...(recordHistory ? { past: [...past.slice(-29), makeSnapshot(project)], future: [] } : {}),
        project: {
          ...project,
          placedMachines: nextPlaced,
        },
      });
      triggerSave();
    },

    rotateSelectedMachines: (deltaDeg) => {
      const { project, selectedMachineIds, past } = get();
      if (selectedMachineIds.length === 0) return;
      const selectedSet = new Set(selectedMachineIds);
      const nextPlaced = project.placedMachines.map((m) => {
        if (!selectedSet.has(m.instanceId)) return m;
        const nextRot = (((m.rotationYDeg + deltaDeg) % 360) + 360) % 360;
        return { ...m, rotationYDeg: nextRot };
      });
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          placedMachines: nextPlaced,
        },
      });
      triggerSave();
    },

    setMachineRotation: (id, deg) => {
      const { project, past } = get();
      const norm = ((Math.round(deg) % 360) + 360) % 360;
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          placedMachines: project.placedMachines.map((m) =>
            m.instanceId === id ? { ...m, rotationYDeg: norm } : m
          ),
        },
      });
      triggerSave();
    },

    updateMachineProps: (id, partial) => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          placedMachines: project.placedMachines.map((m) =>
            m.instanceId === id ? { ...m, ...partial } : m
          ),
        },
      });
      triggerSave();
    },

    deleteSelected: () => {
      const {
        project,
        selectedMachineIds,
        selectedWallId,
        selectedOpeningId,
        deleteWallOpening,
        past,
      } = get();
      if (selectedMachineIds.length > 0) {
        const selectedSet = new Set(selectedMachineIds);
        set({
          past: [...past.slice(-29), makeSnapshot(project)],
          future: [],
          selectedMachineIds: [],
          project: {
            ...project,
            placedMachines: project.placedMachines.filter((m) => !selectedSet.has(m.instanceId)),
          },
        });
        triggerSave();
      } else if (selectedWallId && selectedOpeningId) {
        deleteWallOpening(selectedWallId, selectedOpeningId);
      } else if (selectedWallId) {
        set({
          past: [...past.slice(-29), makeSnapshot(project)],
          future: [],
          selectedWallId: null,
          selectedOpeningId: null,
          project: {
            ...project,
            floorPlan: {
              ...project.floorPlan,
              walls: project.floorPlan.walls.filter((w) => w.id !== selectedWallId),
            },
          },
        });
        triggerSave();
      }
    },

    duplicateSelected: () => {
      const { project, selectedMachineIds, past, getCatalogMap } = get();
      if (selectedMachineIds.length === 0) return;
      const catalogMap = getCatalogMap();
      const selectedSet = new Set(selectedMachineIds);
      const toClone = project.placedMachines.filter((m) => selectedSet.has(m.instanceId));
      const newIds: string[] = [];

      const clones: PlacedMachine[] = toClone.map((orig, idx) => {
        const def = catalogMap.get(orig.definitionId);
        const w = orig.customDimensions?.widthMm ?? def?.widthMm ?? 700;
        const newId = `inst-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
        newIds.push(newId);
        return {
          ...JSON.parse(JSON.stringify(orig)),
          instanceId: newId,
          label: `${orig.label}-C`,
          position: {
            x: orig.position.x + w + inchesToMm(4),
            y: orig.position.y,
            z: orig.position.z,
          },
        };
      });

      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedMachineIds: newIds,
        project: {
          ...project,
          placedMachines: [...project.placedMachines, ...clones],
        },
      });
      triggerSave();
    },

    cloneMachineRow: (id, count, spacingMm, direction) => {
      const { project, past, getCatalogMap } = get();
      const orig = project.placedMachines.find((m) => m.instanceId === id);
      if (!orig || count < 1) return;
      const def = getCatalogMap().get(orig.definitionId);
      const widthMm = orig.customDimensions?.widthMm ?? def?.widthMm ?? 700;
      const depthMm = orig.customDimensions?.depthMm ?? def?.depthMm ?? 850;

      const rad = ((orig.rotationYDeg % 360) * Math.PI) / 180;
      const spanX = Math.abs(Math.cos(rad)) * widthMm + Math.abs(Math.sin(rad)) * depthMm;
      const spanZ = Math.abs(Math.sin(rad)) * widthMm + Math.abs(Math.cos(rad)) * depthMm;

      const stepX =
        direction === 'right'
          ? spanX + spacingMm
          : direction === 'left'
            ? -(spanX + spacingMm)
            : 0;
      const stepZ =
        direction === 'down'
          ? spanZ + spacingMm
          : direction === 'up'
            ? -(spanZ + spacingMm)
            : 0;

      const clones: PlacedMachine[] = [];
      const newIds: string[] = [orig.instanceId];

      for (let i = 1; i <= count; i++) {
        const newId = `inst-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
        newIds.push(newId);
        clones.push({
          ...JSON.parse(JSON.stringify(orig)),
          instanceId: newId,
          label: `${orig.label.replace(/\d+$/, '')}${project.placedMachines.length + i}`,
          position: {
            x: Math.round(orig.position.x + stepX * i),
            y: orig.position.y,
            z: Math.round(orig.position.z + stepZ * i),
          },
        });
      }

      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedMachineIds: newIds,
        project: {
          ...project,
          placedMachines: [...project.placedMachines, ...clones],
        },
      });
      triggerSave();
    },

    copySelected: () => {
      const { project, selectedMachineIds } = get();
      const selectedSet = new Set(selectedMachineIds);
      const copied = project.placedMachines.filter((m) => selectedSet.has(m.instanceId));
      if (copied.length > 0) {
        set({ clipboardMachines: JSON.parse(JSON.stringify(copied)) });
      }
    },

    pasteClipboard: (atPositionMm) => {
      const { project, clipboardMachines, cursorWorldMm, past } = get();
      if (clipboardMachines.length === 0) return;

      const anchor = clipboardMachines[0].position;
      const target = atPositionMm ?? cursorWorldMm;
      const newIds: string[] = [];

      const pasted: PlacedMachine[] = clipboardMachines.map((item, idx) => {
        const newId = `inst-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
        newIds.push(newId);
        return {
          ...JSON.parse(JSON.stringify(item)),
          instanceId: newId,
          position: {
            x: Math.round(target.x + (item.position.x - anchor.x)),
            y: item.position.y,
            z: Math.round(target.z + (item.position.z - anchor.z)),
          },
        };
      });

      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedMachineIds: newIds,
        project: {
          ...project,
          placedMachines: [...project.placedMachines, ...pasted],
        },
      });
      triggerSave();
    },

    addCustomMachineDefinition: (defInput) => {
      const { project } = get();
      const newDef: MachineDefinition = {
        ...defInput,
        id: `custom-${Date.now()}`,
        isCustom: true,
      };
      set({
        project: {
          ...project,
          customCatalog: [...project.customCatalog, newDef],
        },
      });
      triggerSave();
      return newDef;
    },

    addWallSegment: (wallInput) => {
      const { project, past } = get();
      const newWall: WallSegment = {
        ...wallInput,
        id: `wall-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: [...project.floorPlan.walls, newWall],
          },
        },
      });
      triggerSave();
    },

    updateWallSegment: (id, partial) => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: project.floorPlan.walls.map((w) => (w.id === id ? { ...w, ...partial } : w)),
          },
        },
      });
      triggerSave();
    },

    deleteWallSegment: (id) => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedWallId: null,
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: project.floorPlan.walls.filter((w) => w.id !== id),
          },
        },
      });
      triggerSave();
    },

    setRectangularRoom: (widthMm, depthMm) => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: createRectangularRoomWalls(widthMm, depthMm),
          },
        },
      });
      triggerSave();
    },

    setLShapedRoom: () => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: createLShapedRoomWalls(),
          },
        },
      });
      triggerSave();
    },

    clearWalls: () => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        project: {
          ...project,
          floorPlan: {
            ...project.floorPlan,
            walls: [],
          },
        },
      });
      triggerSave();
    },

    toggleLayerVisibility: (layerId) => {
      const { project } = get();
      set({
        project: {
          ...project,
          layers: project.layers.map((l) =>
            l.id === layerId ? { ...l, visible: !l.visible } : l
          ),
        },
      });
      triggerSave();
    },

    addLayer: (name) => {
      const { project } = get();
      const colors = ['#38bdf8', '#a855f7', '#f43f5e', '#22c55e', '#eab308'];
      const newLayer = {
        id: `layer-${Date.now()}`,
        name,
        visible: true,
        locked: false,
        color: colors[project.layers.length % colors.length],
      };
      set({
        project: {
          ...project,
          layers: [...project.layers, newLayer],
        },
      });
      triggerSave();
    },

    undo: () => {
      const { past, future, project } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      set({
        past: newPast,
        future: [makeSnapshot(project), ...future.slice(0, 29)],
        project: {
          ...project,
          placedMachines: previous.placedMachines,
          floorPlan: {
            ...project.floorPlan,
            walls: previous.walls,
            material: previous.material,
          },
        },
      });
      triggerSave();
    },

    redo: () => {
      const { past, future, project } = get();
      if (future.length === 0) return;
      const next = future[0];
      const newFuture = future.slice(1);

      set({
        past: [...past, makeSnapshot(project)],
        future: newFuture,
        project: {
          ...project,
          placedMachines: next.placedMachines,
          floorPlan: {
            ...project.floorPlan,
            walls: next.walls,
            material: next.material,
          },
        },
      });
      triggerSave();
    },

    resetToShowcaseProject: () => {
      const fresh = createDefaultProject();
      set({
        past: [...get().past.slice(-29), makeSnapshot(get().project)],
        future: [],
        project: fresh,
        selectedMachineIds: fresh.placedMachines[0] ? [fresh.placedMachines[0].instanceId] : [],
      });
      triggerSave();
    },

    clearAllMachines: () => {
      const { project, past } = get();
      set({
        past: [...past.slice(-29), makeSnapshot(project)],
        future: [],
        selectedMachineIds: [],
        project: {
          ...project,
          placedMachines: [],
        },
      });
      triggerSave();
    },

    importProjectJson: (jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr) as ArcadeProject;
        if (!parsed || !parsed.floorPlan || !Array.isArray(parsed.placedMachines)) {
          return false;
        }
        set({
          past: [...get().past.slice(-29), makeSnapshot(get().project)],
          future: [],
          project: parsed,
          selectedMachineIds: [],
        });
        triggerSave();
        return true;
      } catch {
        return false;
      }
    },

    restoreRevision: (index) => {
      const rev = get().revisions[index];
      if (!rev) return;
      set({
        past: [...get().past.slice(-29), makeSnapshot(get().project)],
        future: [],
        project: JSON.parse(JSON.stringify(rev.project)),
      });
      triggerSave();
    },
  };
});


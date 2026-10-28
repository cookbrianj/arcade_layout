import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import {
  computeRoomMetrics,
  evaluateCollisions,
  findClosestWallProjection,
  getMachineDimensions,
  getMachineFootprintBox,
  getWallOpenings,
} from '../utils/geometry';
import {
  formatLength,
  formatMachineDimValue,
  getMachineDimUnitLabel,
  inchesToMm,
  MM_PER_FOOT,
  MM_PER_METER,
  parseMachineDimInput,
} from '../utils/units';
import {
  AlertTriangle,
  Columns2,
  Compass,
  DoorOpen,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { NumericInput } from './NumericInput';

interface SnapGuide {
  type: 'vertical' | 'horizontal';
  posMm: number;
}

export const Canvas2DCad: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    project,
    activeTool,
    selectedMachineIds,
    selectedWallId,
    selectedOpeningId,
    selectMachine,
    setSelectedMachineIds,
    selectWall,
    moveMachines,
    commitHistorySnapshot,
    addMachineFromCatalog,
    addWallSegment,
    addWallOpening,
    updateWallOpening,
    setRectangularRoom,
    setCursorWorldMm,
    setOrbitStats,
    getCatalogMap,
  } = useArcadeStore();

  // Pan (screen px) & scale (px per mm)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 95, y: 85 });
  const [scale, setScale] = useState<number>(0.044); // ~44px per meter
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Machine dragging state
  const [isDraggingMachines, setIsDraggingMachines] = useState(false);
  const [dragStartWorld, setDragStartWorld] = useState<{ x: number; z: number }>({ x: 0, y: 0 } as any);
  const [dragInitialPositions, setDragInitialPositions] = useState<
    Array<{ id: string; x: number; z: number }>
  >([]);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  // Box selection state
  const [boxSelect, setBoxSelect] = useState<{
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
  } | null>(null);

  // Wall / Rect / Measure drawing state
  const [drawStartMm, setDrawStartMm] = useState<{ x: number; z: number } | null>(null);
  const [drawCurrentMm, setDrawCurrentMm] = useState<{ x: number; z: number } | null>(null);

  // Drag-and-drop from sidebar catalog preview
  const [dropPreview, setDropPreview] = useState<{
    definitionId: string;
    x: number;
    z: number;
  } | null>(null);

  // Hover preview when placing a Door or Window on a wall
  const [wallOpeningHover, setWallOpeningHover] = useState<{
    wallId: string;
    offsetRatio: number;
    projX: number;
    projZ: number;
  } | null>(null);

  // Dragging an existing Door or Window along its wall
  const [draggingOpening, setDraggingOpening] = useState<{
    wallId: string;
    openingId: string;
  } | null>(null);

  const catalogMap = getCatalogMap();
  const { unitSystem, unitDisplay } = project.settings;
  const dimUnit = getMachineDimUnitLabel(unitSystem, unitDisplay);

  const visibleLayerIds = new Set(
    project.layers.filter((l) => l.visible).map((l) => l.id)
  );
  const visibleMachines = project.placedMachines.filter(
    (m) => !m.layerId || visibleLayerIds.has(m.layerId)
  );

  const collisions = evaluateCollisions(
    visibleMachines,
    project.floorPlan.walls,
    catalogMap
  );

  const screenToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; z: number } => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, z: 0 };
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - pan.x) / scale,
        z: (sy - pan.y) / scale,
      };
    },
    [pan, scale]
  );

  const fitViewToRoom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    const metrics = computeRoomMetrics(project.floorPlan.walls);
    const padPx = 125;
    const availW = Math.max(300, width - padPx * 2);
    const availH = Math.max(250, height - padPx * 2);
    const nextScale = Math.min(availW / metrics.widthMm, availH / metrics.depthMm);
    const clampedScale = Math.max(0.01, Math.min(0.25, nextScale));

    const roomPxW = metrics.widthMm * clampedScale;
    const roomPxH = metrics.depthMm * clampedScale;
    setScale(clampedScale);
    setPan({
      x: (width - roomPxW) / 2 - metrics.minX * clampedScale,
      y: (height - roomPxH) / 2 - metrics.minY * clampedScale,
    });
    setOrbitStats({ zoomPercent: Math.round((clampedScale / 0.05) * 100) });
  }, [project.floorPlan.walls, setOrbitStats]);

  // Fit room on first mount
  useEffect(() => {
    const timer = setTimeout(() => fitViewToRoom(), 40);
    return () => clearTimeout(timer);
  }, []);

  // Snap coordinate helper
  const snapWorldCoord = useCallback(
    (
      rawX: number,
      rawZ: number,
      movingIds: Set<string>,
      refMachineId?: string
    ): { x: number; z: number; guides: SnapGuide[] } => {
      let x = rawX;
      let z = rawZ;
      const guides: SnapGuide[] = [];
      const { snapToGrid, snapToObjects, snapToWalls, gridSizeMm } = project.settings;

      if (snapToGrid && gridSizeMm > 0) {
        x = Math.round(x / gridSizeMm) * gridSizeMm;
        z = Math.round(z / gridSizeMm) * gridSizeMm;
      }

      const snapThresholdMm = 180; // ~7 inches magnetic snap

      // Object-to-object alignment & edge snap
      if (snapToObjects) {
        const refMachine = refMachineId
          ? project.placedMachines.find((m) => m.instanceId === refMachineId)
          : null;
        const refDims = refMachine ? getMachineDimensions(refMachine, catalogMap) : null;

        for (const other of visibleMachines) {
          if (movingIds.has(other.instanceId)) continue;
          // Center alignment X
          if (Math.abs(rawX - other.position.x) < snapThresholdMm) {
            x = other.position.x;
            guides.push({ type: 'vertical', posMm: other.position.x });
          }
          // Center alignment Z
          if (Math.abs(rawZ - other.position.z) < snapThresholdMm) {
            z = other.position.z;
            guides.push({ type: 'horizontal', posMm: other.position.z });
          }

          // Side-by-side edge snapping
          if (refDims) {
            const otherDims = getMachineDimensions(other, catalogMap);
            const sideDistX = (refDims.widthMm + otherDims.widthMm) / 2 + 25; // 1 inch gap
            if (Math.abs(Math.abs(rawX - other.position.x) - sideDistX) < snapThresholdMm) {
              x =
                rawX > other.position.x
                  ? other.position.x + sideDistX
                  : other.position.x - sideDistX;
              guides.push({ type: 'vertical', posMm: x });
            }
          }
        }
      }

      // Wall flush snapping
      if (snapToWalls && refMachineId) {
        const refMachine = project.placedMachines.find((m) => m.instanceId === refMachineId);
        if (refMachine) {
          const box = getMachineFootprintBox(refMachine, catalogMap);
          const halfW = box.width / 2;
          const halfD = box.depth / 2;
          const clearance = 150; // 6" service clearance

          for (const w of project.floorPlan.walls) {
            // Horizontal wall
            if (Math.abs(w.start.y - w.end.y) < 10) {
              const wallZ = w.start.y;
              const targetSouth = wallZ + w.thicknessMm / 2 + halfD + clearance;
              const targetNorth = wallZ - w.thicknessMm / 2 - halfD - clearance;
              if (Math.abs(rawZ - targetSouth) < snapThresholdMm) {
                z = targetSouth;
                guides.push({ type: 'horizontal', posMm: z });
              } else if (Math.abs(rawZ - targetNorth) < snapThresholdMm) {
                z = targetNorth;
                guides.push({ type: 'horizontal', posMm: z });
              }
            }
            // Vertical wall
            if (Math.abs(w.start.x - w.end.x) < 10) {
              const wallX = w.start.x;
              const targetEast = wallX + w.thicknessMm / 2 + halfW + clearance;
              const targetWest = wallX - w.thicknessMm / 2 - halfW - clearance;
              if (Math.abs(rawX - targetEast) < snapThresholdMm) {
                x = targetEast;
                guides.push({ type: 'vertical', posMm: x });
              } else if (Math.abs(rawX - targetWest) < snapThresholdMm) {
                x = targetWest;
                guides.push({ type: 'vertical', posMm: x });
              }
            }
          }
        }
      }

      return { x, z, guides };
    },
    [project.settings, project.placedMachines, project.floorPlan.walls, visibleMachines, catalogMap]
  );

  // Hit test machine at world (x, z)
  const hitTestMachine = useCallback(
    (wx: number, wz: number): string | null => {
      for (let i = visibleMachines.length - 1; i >= 0; i--) {
        const m = visibleMachines[i];
        const box = getMachineFootprintBox(m, catalogMap);
        if (wx >= box.minX && wx <= box.maxX && wz >= box.minZ && wz <= box.maxZ) {
          return m.instanceId;
        }
      }
      return null;
    },
    [visibleMachines, catalogMap]
  );

  // Hit test wall (and specific door/window opening if clicked) at world (x, z)
  const hitTestWallAndOpening = useCallback(
    (wx: number, wz: number): { wallId: string; openingId: string | null } | null => {
      for (const w of project.floorPlan.walls) {
        const dx = w.end.x - w.start.x;
        const dy = w.end.y - w.start.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        const wallLen = Math.sqrt(lenSq);
        const t = Math.max(0, Math.min(1, ((wx - w.start.x) * dx + (wz - w.start.y) * dy) / lenSq));
        const px = w.start.x + t * dx;
        const pz = w.start.y + t * dy;
        const dist = Math.hypot(wx - px, wz - pz);
        if (dist <= Math.max(w.thicknessMm, 380)) {
          // Check if click landed on an existing door or window opening
          const openings = getWallOpenings(w);
          for (const op of openings) {
            const halfRatio = op.widthMm / 2 / wallLen;
            if (Math.abs(t - op.offsetRatio) <= halfRatio + 0.02) {
              return { wallId: w.id, openingId: op.id };
            }
          }
          if (dist <= Math.max(w.thicknessMm, 220)) {
            return { wallId: w.id, openingId: null };
          }
        }
      }
      return null;
    },
    [project.floorPlan.walls]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);

    // Middle mouse or Right click or Alt+Left -> Pan
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    // Add Door or Add Window tool
    if (activeTool === 'add-door' || activeTool === 'add-window') {
      const proj = findClosestWallProjection(world.x, world.z, project.floorPlan.walls, 1500);
      if (proj) {
        const openingType =
          activeTool === 'add-window'
            ? 'window'
            : e.shiftKey
              ? 'double-door'
              : 'single-door';
        addWallOpening(proj.wall.id, openingType, proj.offsetRatio);
      }
      return;
    }

    // Drawing tools
    if (activeTool === 'draw-wall' || activeTool === 'draw-rect' || activeTool === 'measure') {
      const snapped = snapWorldCoord(world.x, world.z, new Set());
      if (!drawStartMm) {
        setDrawStartMm({ x: snapped.x, z: snapped.z });
        setDrawCurrentMm({ x: snapped.x, z: snapped.z });
      } else {
        // Finish drawing
        if (activeTool === 'draw-wall') {
          let endX = snapped.x;
          let endZ = snapped.z;
          if (e.shiftKey) {
            const dx = endX - drawStartMm.x;
            const dz = endZ - drawStartMm.z;
            if (Math.abs(dx) > Math.abs(dz)) endZ = drawStartMm.z;
            else endX = drawStartMm.x;
          }
          if (Math.hypot(endX - drawStartMm.x, endZ - drawStartMm.z) > 200) {
            addWallSegment({
              start: { x: drawStartMm.x, y: drawStartMm.z },
              end: { x: endX, y: endZ },
              thicknessMm: 200,
            });
          }
        } else if (activeTool === 'draw-rect') {
          const w = Math.abs(snapped.x - drawStartMm.x);
          const d = Math.abs(snapped.z - drawStartMm.z);
          if (w > 1500 && d > 1500) {
            setRectangularRoom(w, d);
          }
        }
        setDrawStartMm(null);
        setDrawCurrentMm(null);
      }
      return;
    }

    // Select tool
    const hitMachineId = hitTestMachine(world.x, world.z);
    if (hitMachineId) {
      const isAlreadySelected = selectedMachineIds.includes(hitMachineId);
      let nextSelected = selectedMachineIds;

      if (e.shiftKey) {
        selectMachine(hitMachineId, true);
        nextSelected = isAlreadySelected
          ? selectedMachineIds.filter((id) => id !== hitMachineId)
          : [...selectedMachineIds, hitMachineId];
      } else if (!isAlreadySelected) {
        selectMachine(hitMachineId, false);
        nextSelected = [hitMachineId];
      }

      // Prepare dragging
      commitHistorySnapshot();
      setIsDraggingMachines(true);
      setDragStartWorld(world);
      const selectedSet = new Set(nextSelected);
      setDragInitialPositions(
        project.placedMachines
          .filter((m) => selectedSet.has(m.instanceId))
          .map((m) => ({ id: m.instanceId, x: m.position.x, z: m.position.z }))
      );
      return;
    }

    const hitWall = hitTestWallAndOpening(world.x, world.z);
    if (hitWall) {
      selectWall(hitWall.wallId, hitWall.openingId);
      if (hitWall.openingId) {
        setDraggingOpening({ wallId: hitWall.wallId, openingId: hitWall.openingId });
      }
      return;
    }

    // Clicked empty floor -> start rubberband box selection
    selectMachine(null);
    selectWall(null);
    setBoxSelect({
      startX: world.x,
      startZ: world.z,
      endX: world.x,
      endZ: world.z,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const world = screenToWorld(e.clientX, e.clientY);
    setCursorWorldMm({ x: Math.round(world.x), z: Math.round(world.z) });

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (activeTool === 'add-door' || activeTool === 'add-window') {
      const proj = findClosestWallProjection(world.x, world.z, project.floorPlan.walls, 1500);
      setWallOpeningHover(
        proj
          ? {
              wallId: proj.wall.id,
              offsetRatio: proj.offsetRatio,
              projX: proj.projX,
              projZ: proj.projZ,
            }
          : null
      );
      return;
    } else if (wallOpeningHover) {
      setWallOpeningHover(null);
    }

    if (draggingOpening) {
      const wall = project.floorPlan.walls.find((w) => w.id === draggingOpening.wallId);
      if (wall) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 0) {
          const rawT = ((world.x - wall.start.x) * dx + (world.z - wall.start.y) * dy) / lenSq;
          const clampedT = Math.max(0.08, Math.min(0.92, Math.round(rawT * 200) / 200));
          updateWallOpening(draggingOpening.wallId, draggingOpening.openingId, {
            offsetRatio: clampedT,
          });
        }
      }
      return;
    }

    if (drawStartMm) {
      const snapped = snapWorldCoord(world.x, world.z, new Set());
      let targetX = snapped.x;
      let targetZ = snapped.z;
      if (e.shiftKey && activeTool === 'draw-wall') {
        const dx = targetX - drawStartMm.x;
        const dz = targetZ - drawStartMm.z;
        if (Math.abs(dx) > Math.abs(dz)) targetZ = drawStartMm.z;
        else targetX = drawStartMm.x;
      }
      setDrawCurrentMm({ x: targetX, z: targetZ });
      return;
    }

    if (isDraggingMachines && dragInitialPositions.length > 0) {
      const dx = world.x - dragStartWorld.x;
      const dz = world.z - dragStartWorld.z;
      const primary = dragInitialPositions[0];
      const movingSet = new Set(dragInitialPositions.map((d) => d.id));
      const snappedPrimary = snapWorldCoord(
        primary.x + dx,
        primary.z + dz,
        movingSet,
        primary.id
      );

      const snappedDx = snappedPrimary.x - primary.x;
      const snappedDz = snappedPrimary.z - primary.z;
      setSnapGuides(snappedPrimary.guides);

      const updates = dragInitialPositions.map((init) => ({
        id: init.id,
        x: init.x + snappedDx,
        z: init.z + snappedDz,
      }));
      moveMachines(updates, false);
      return;
    }

    if (boxSelect) {
      setBoxSelect({
        ...boxSelect,
        endX: world.x,
        endZ: world.z,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (draggingOpening) {
      setDraggingOpening(null);
    }
    if (isDraggingMachines) {
      setIsDraggingMachines(false);
      setSnapGuides([]);
    }
    if (boxSelect) {
      const minX = Math.min(boxSelect.startX, boxSelect.endX);
      const maxX = Math.max(boxSelect.startX, boxSelect.endX);
      const minZ = Math.min(boxSelect.startZ, boxSelect.endZ);
      const maxZ = Math.max(boxSelect.startZ, boxSelect.endZ);

      if (maxX - minX > 100 || maxZ - minZ > 100) {
        const hitIds = visibleMachines
          .filter(
            (m) =>
              m.position.x >= minX &&
              m.position.x <= maxX &&
              m.position.z >= minZ &&
              m.position.z <= maxZ
          )
          .map((m) => m.instanceId);
        setSelectedMachineIds(hitIds);
      }
      setBoxSelect(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const nextScale = Math.max(0.008, Math.min(0.3, scale * zoomFactor));

    const nextPanX = mouseX - ((mouseX - pan.x) / scale) * nextScale;
    const nextPanY = mouseY - ((mouseY - pan.y) / scale) * nextScale;

    setScale(nextScale);
    setPan({ x: nextPanX, y: nextPanY });
    setOrbitStats({ zoomPercent: Math.round((nextScale / 0.05) * 100) });
  };

  // Drag and drop from Machine Catalog Sidebar
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const defId = e.dataTransfer.getData('text/arcade-definition-id') || 'pacman-upright';
    const world = screenToWorld(e.clientX, e.clientY);
    const snapped = snapWorldCoord(world.x, world.z, new Set());
    setDropPreview({ definitionId: defId, x: snapped.x, z: snapped.z });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const defId = e.dataTransfer.getData('text/arcade-definition-id');
    if (defId) {
      const world = screenToWorld(e.clientX, e.clientY);
      const snapped = snapWorldCoord(world.x, world.z, new Set());
      addMachineFromCatalog(defId, { x: snapped.x, z: snapped.z });
    }
    setDropPreview(null);
  };

  // Render 2D Blueprint Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    // 1. Blueprint Background
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(0, 0, W, H);

    const { unitSystem, unitDisplay, showClearanceZones, showDimensions, showLabels } =
      project.settings;

    // 2. Minor & Major Architectural Grid
    const minorStepMm =
      unitSystem === 'imperial' ? MM_PER_FOOT : MM_PER_METER * 0.5;
    const majorStepMm =
      unitSystem === 'imperial' ? MM_PER_FOOT * 5 : MM_PER_METER * 2.5;

    const worldLeft = -pan.x / scale;
    const worldTop = -pan.y / scale;
    const worldRight = (W - pan.x) / scale;
    const worldBottom = (H - pan.y) / scale;

    // Minor grid lines
    if (minorStepMm * scale >= 6) {
      ctx.strokeStyle = 'rgba(30, 58, 95, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const startX = Math.floor(worldLeft / minorStepMm) * minorStepMm;
      for (let x = startX; x <= worldRight; x += minorStepMm) {
        const sx = pan.x + x * scale;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, H);
      }
      const startZ = Math.floor(worldTop / minorStepMm) * minorStepMm;
      for (let z = startZ; z <= worldBottom; z += minorStepMm) {
        const sy = pan.y + z * scale;
        ctx.moveTo(0, sy);
        ctx.lineTo(W, sy);
      }
      ctx.stroke();
    }

    // Major grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startMajX = Math.floor(worldLeft / majorStepMm) * majorStepMm;
    for (let x = startMajX; x <= worldRight; x += majorStepMm) {
      const sx = pan.x + x * scale;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, H);
    }
    const startMajZ = Math.floor(worldTop / majorStepMm) * majorStepMm;
    for (let z = startMajZ; z <= worldBottom; z += majorStepMm) {
      const sy = pan.y + z * scale;
      ctx.moveTo(0, sy);
      ctx.lineTo(W, sy);
    }
    ctx.stroke();

    // 3. Room Interior Floor Tint
    const roomMetrics = computeRoomMetrics(project.floorPlan.walls);
    if (project.floorPlan.walls.length > 0) {
      const rx = pan.x + roomMetrics.minX * scale;
      const ry = pan.y + roomMetrics.minY * scale;
      const rw = roomMetrics.widthMm * scale;
      const rh = roomMetrics.depthMm * scale;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(rx, ry, rw, rh);
    }

    // 4. Snap Alignment Guides
    if (snapGuides.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      for (const g of snapGuides) {
        ctx.beginPath();
        if (g.type === 'vertical') {
          const sx = pan.x + g.posMm * scale;
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, H);
        } else {
          const sy = pan.y + g.posMm * scale;
          ctx.moveTo(0, sy);
          ctx.lineTo(W, sy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Architectural Walls & Doors
    for (const wall of project.floorPlan.walls) {
      const sx1 = pan.x + wall.start.x * scale;
      const sy1 = pan.y + wall.start.y * scale;
      const sx2 = pan.x + wall.end.x * scale;
      const sy2 = pan.y + wall.end.y * scale;
      const thickPx = Math.max(6, wall.thicknessMm * scale);
      const isSelected = wall.id === selectedWallId;

      // Outer wall stroke
      ctx.save();
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#cbd5e1';
      ctx.lineWidth = thickPx;
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      // Inner blueprint hatch core
      ctx.strokeStyle = isSelected ? '#0284c7' : '#1e293b';
      ctx.lineWidth = Math.max(2, thickPx - 3);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      // Architectural Doors & Windows along the wall
      const openings = getWallOpenings(wall);
      for (const op of openings) {
        const isOpSelected = isSelected && selectedOpeningId === op.id;
        const ratio = op.offsetRatio;
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const wallLenPx = Math.hypot(dx, dy);
        const opPx = op.widthMm * scale;

        if (wallLenPx <= opPx * 1.15) continue;

        const ux = dx / wallLenPx;
        const uy = dy / wallLenPx;
        const swingMult = op.swingDirection === 'outward' ? -1 : 1;
        const nx = -uy * swingMult;
        const ny = ux * swingMult;

        const centerX = sx1 + dx * ratio;
        const centerY = sy1 + dy * ratio;
        const dStartX = centerX - (ux * opPx) / 2;
        const dStartY = centerY - (uy * opPx) / 2;
        const dEndX = centerX + (ux * opPx) / 2;
        const dEndY = centerY + (uy * opPx) / 2;

        // Clear wall opening core
        ctx.strokeStyle = '#0a1220';
        ctx.lineWidth = thickPx + 4;
        ctx.beginPath();
        ctx.moveTo(dStartX, dStartY);
        ctx.lineTo(dEndX, dEndY);
        ctx.stroke();

        if (op.type === 'window') {
          // Architectural multi-pane window symbol
          ctx.strokeStyle = isOpSelected ? '#facc15' : '#38bdf8';
          ctx.lineWidth = isOpSelected ? 2 : 1.4;
          // Outer sill lines
          const halfT = thickPx * 0.45;
          ctx.beginPath();
          ctx.moveTo(dStartX - uy * halfT, dStartY + ux * halfT);
          ctx.lineTo(dEndX - uy * halfT, dEndY + ux * halfT);
          ctx.moveTo(dStartX + uy * halfT, dStartY - ux * halfT);
          ctx.lineTo(dEndX + uy * halfT, dEndY - ux * halfT);
          // Center glazing line
          ctx.moveTo(dStartX, dStartY);
          ctx.lineTo(dEndX, dEndY);
          // End jambs & center mullion tick
          ctx.moveTo(dStartX - uy * halfT, dStartY + ux * halfT);
          ctx.lineTo(dStartX + uy * halfT, dStartY - ux * halfT);
          ctx.moveTo(dEndX - uy * halfT, dEndY + ux * halfT);
          ctx.lineTo(dEndX + uy * halfT, dEndY - ux * halfT);
          ctx.moveTo(centerX - uy * halfT, centerY + ux * halfT);
          ctx.lineTo(centerX + uy * halfT, centerY - ux * halfT);
          ctx.stroke();
        } else {
          // Single or Double Swing Door
          ctx.strokeStyle = isOpSelected ? '#34d399' : '#94a3b8';
          ctx.lineWidth = isOpSelected ? 2 : 1.5;
          const isDouble = op.type === 'double-door';
          const baseAngle = Math.atan2(ny, nx);

          if (isDouble) {
            const leafR = opPx / 2;
            ctx.beginPath();
            ctx.moveTo(dStartX, dStartY);
            ctx.lineTo(dStartX + nx * leafR, dStartY + ny * leafR);
            ctx.moveTo(dEndX, dEndY);
            ctx.lineTo(dEndX + nx * leafR, dEndY + ny * leafR);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(
              dStartX,
              dStartY,
              leafR,
              swingMult > 0 ? baseAngle - Math.PI / 2 : baseAngle,
              swingMult > 0 ? baseAngle : baseAngle + Math.PI / 2,
              false
            );
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(
              dEndX,
              dEndY,
              leafR,
              swingMult > 0 ? baseAngle : baseAngle - Math.PI / 2,
              swingMult > 0 ? baseAngle + Math.PI / 2 : baseAngle,
              false
            );
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.moveTo(dStartX, dStartY);
            ctx.lineTo(dStartX + nx * opPx, dStartY + ny * opPx);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(
              dStartX,
              dStartY,
              opPx,
              swingMult > 0 ? baseAngle - Math.PI / 2 : baseAngle,
              swingMult > 0 ? baseAngle : baseAngle + Math.PI / 2,
              false
            );
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // 5b. Live Ghost Preview when hovering with Add Door / Add Window tool
    if (
      wallOpeningHover &&
      (activeTool === 'add-door' || activeTool === 'add-window')
    ) {
      const targetWall = project.floorPlan.walls.find(
        (w) => w.id === wallOpeningHover.wallId
      );
      if (targetWall) {
        const sx1 = pan.x + targetWall.start.x * scale;
        const sy1 = pan.y + targetWall.start.y * scale;
        const sx2 = pan.x + targetWall.end.x * scale;
        const sy2 = pan.y + targetWall.end.y * scale;
        const dx = sx2 - sx1;
        const dy = sy2 - sy1;
        const lenPx = Math.hypot(dx, dy);
        if (lenPx > 10) {
          const ux = dx / lenPx;
          const uy = dy / lenPx;
          const previewWidthMm =
            activeTool === 'add-window' ? inchesToMm(60) : inchesToMm(38);
          const opPx = previewWidthMm * scale;
          const cx = sx1 + dx * wallOpeningHover.offsetRatio;
          const cy = sy1 + dy * wallOpeningHover.offsetRatio;

          ctx.save();
          ctx.strokeStyle = activeTool === 'add-window' ? '#38bdf8' : '#34d399';
          ctx.lineWidth = Math.max(8, targetWall.thicknessMm * scale + 4);
          ctx.beginPath();
          ctx.moveTo(cx - (ux * opPx) / 2, cy - (uy * opPx) / 2);
          ctx.lineTo(cx + (ux * opPx) / 2, cy + (uy * opPx) / 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 6. Room Overall Dimension Callouts (Top & Left & Right CAD Callouts matching mockup)
    if (showDimensions && project.floorPlan.walls.length > 0) {
      ctx.save();
      const rx1 = pan.x + roomMetrics.minX * scale;
      const ry1 = pan.y + roomMetrics.minY * scale;
      const rx2 = pan.x + roomMetrics.maxX * scale;
      const ry2 = pan.y + roomMetrics.maxY * scale;

      const dimColor = '#38bdf8';
      ctx.strokeStyle = dimColor;
      ctx.fillStyle = dimColor;
      ctx.lineWidth = 1.2;
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Top horizontal dimension line
      const topLineY = ry1 - 22;
      ctx.beginPath();
      ctx.moveTo(rx1, ry1 - 6);
      ctx.lineTo(rx1, topLineY - 6);
      ctx.moveTo(rx2, ry1 - 6);
      ctx.lineTo(rx2, topLineY - 6);
      ctx.moveTo(rx1, topLineY);
      ctx.lineTo(rx2, topLineY);
      ctx.stroke();

      const wLabel = formatLength(roomMetrics.widthMm, unitDisplay);
      const dLabel = formatLength(roomMetrics.depthMm, unitDisplay);
      const combinedTopLabel = `${dLabel} × ${wLabel}`;
      const textWidth = ctx.measureText(combinedTopLabel).width + 16;
      ctx.fillStyle = '#0a1220';
      ctx.fillRect((rx1 + rx2) / 2 - textWidth / 2, topLineY - 9, textWidth, 18);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(combinedTopLabel, (rx1 + rx2) / 2, topLineY);

      // Left vertical dimension line
      const leftLineX = rx1 - 24;
      ctx.beginPath();
      ctx.moveTo(rx1 - 6, ry1);
      ctx.lineTo(leftLineX - 6, ry1);
      ctx.moveTo(rx1 - 6, ry2);
      ctx.lineTo(leftLineX - 6, ry2);
      ctx.moveTo(leftLineX, ry1);
      ctx.lineTo(leftLineX, ry2);
      ctx.stroke();

      ctx.save();
      ctx.translate(leftLineX, (ry1 + ry2) / 2);
      ctx.rotate(-Math.PI / 2);
      const dTextW = ctx.measureText(wLabel).width + 14;
      ctx.fillStyle = '#0a1220';
      ctx.fillRect(-dTextW / 2, -9, dTextW, 18);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(wLabel, 0, 0);
      ctx.restore();

      // Right vertical dimension line
      const rightLineX = rx2 + 24;
      ctx.beginPath();
      ctx.moveTo(rx2 + 6, ry1);
      ctx.lineTo(rightLineX + 6, ry1);
      ctx.moveTo(rx2 + 6, ry2);
      ctx.lineTo(rightLineX + 6, ry2);
      ctx.moveTo(rightLineX, ry1);
      ctx.lineTo(rightLineX, ry2);
      ctx.stroke();

      ctx.save();
      ctx.translate(rightLineX, (ry1 + ry2) / 2);
      ctx.rotate(Math.PI / 2);
      const rTextW = ctx.measureText(dLabel).width + 14;
      ctx.fillStyle = '#0a1220';
      ctx.fillRect(-rTextW / 2, -9, rTextW, 18);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(dLabel, 0, 0);
      ctx.restore();

      ctx.restore();
    }

    // 7. Placed Arcade Machines & Player Clearance Zones
    const selectedSet = new Set(selectedMachineIds);

    for (const machine of visibleMachines) {
      const def = catalogMap.get(machine.definitionId);
      const dims = getMachineDimensions(machine, catalogMap);
      const isSelected = selectedSet.has(machine.instanceId);
      const hasCollision = collisions.machineCollisionIds.has(machine.instanceId);
      const hasClearanceWarn = collisions.clearanceWarningIds.has(machine.instanceId);

      const cx = pan.x + machine.position.x * scale;
      const cz = pan.y + machine.position.z * scale;
      const wPx = dims.widthMm * scale;
      const dPx = dims.depthMm * scale;
      const clearPx = dims.playerClearanceMm * scale;

      ctx.save();
      ctx.translate(cx, cz);
      // In our coordinate system: 0 deg = facing South (+Z = +Y on screen).
      // Standard canvas rotation is clockwise, so to rotate (0,+1) to (+1,0) at 90 deg East, we rotate by -rotationYDeg.
      ctx.rotate((-machine.rotationYDeg * Math.PI) / 180);

      // 7a. Dashed Purple Player Clearance Zone (in front of machine, +Y local direction)
      if (showClearanceZones && clearPx > 4) {
        ctx.save();
        ctx.strokeStyle = hasCollision
          ? '#ef4444'
          : hasClearanceWarn
            ? '#f59e0b'
            : '#a855f7';
        ctx.fillStyle = hasCollision
          ? 'rgba(239, 68, 68, 0.14)'
          : hasClearanceWarn
            ? 'rgba(245, 158, 11, 0.12)'
            : 'rgba(168, 85, 247, 0.08)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        // Surround machine + front clearance like in the mockup
        ctx.strokeRect(
          -wPx / 2 - 3,
          -dPx / 2 - 3,
          wPx + 6,
          dPx + clearPx + 6
        );
        ctx.fillRect(-wPx / 2, dPx / 2, wPx, clearPx);
        ctx.setLineDash([]);

        // Crisp white directional facing arrow inside clearance zone
        const arrowStartY = dPx / 2 + 4;
        const arrowEndY = dPx / 2 + clearPx - 5;
        if (arrowEndY > arrowStartY + 6) {
          ctx.strokeStyle = '#e2e8f0';
          ctx.fillStyle = '#e2e8f0';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, arrowStartY);
          ctx.lineTo(0, arrowEndY);
          ctx.stroke();

          // Arrowhead
          ctx.beginPath();
          ctx.moveTo(0, arrowEndY + 2);
          ctx.lineTo(-4, arrowEndY - 5);
          ctx.lineTo(4, arrowEndY - 5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 7b. Physical Machine Footprint Schematic
      const cabColor = machine.cabinetColor ?? def?.cabinetColor ?? '#1e293b';
      const accColor = machine.accentColor ?? def?.accentColor ?? '#38bdf8';

      // Base cabinet body
      ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a';
      ctx.strokeStyle = hasCollision
        ? '#ef4444'
        : isSelected
          ? '#38bdf8'
          : '#94a3b8';
      ctx.lineWidth = isSelected ? 2.2 : 1.3;
      ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx);
      ctx.strokeRect(-wPx / 2, -dPx / 2, wPx, dPx);

      // Colored accent side strips
      ctx.fillStyle = cabColor;
      ctx.fillRect(-wPx / 2 + 1.5, -dPx / 2 + 1.5, Math.max(2, wPx * 0.12), dPx - 3);
      ctx.fillRect(wPx / 2 - 1.5 - Math.max(2, wPx * 0.12), -dPx / 2 + 1.5, Math.max(2, wPx * 0.12), dPx - 3);

      // Internal CAD details based on category
      if (def?.category === 'pinball') {
        // Backbox at rear (-Y)
        ctx.fillStyle = accColor;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.fillRect(-wPx * 0.42, -dPx / 2 + 2, wPx * 0.84, dPx * 0.24);
        ctx.strokeRect(-wPx * 0.42, -dPx / 2 + 2, wPx * 0.84, dPx * 0.24);
        // Playfield glass
        ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
        ctx.fillRect(-wPx * 0.36, -dPx * 0.22, wPx * 0.72, dPx * 0.65);
        ctx.strokeRect(-wPx * 0.36, -dPx * 0.22, wPx * 0.72, dPx * 0.65);
      } else if (def?.category === 'racing-cockpit') {
        // Screen housing at rear (-Y)
        ctx.fillStyle = def.screenColor;
        ctx.fillRect(-wPx * 0.38, -dPx / 2 + 3, wPx * 0.76, dPx * 0.32);
        // Seat at front (+Y)
        ctx.fillStyle = cabColor;
        ctx.fillRect(-wPx * 0.32, dPx * 0.08, wPx * 0.64, dPx * 0.34);
      } else {
        // Upright / 4-Player CRT screen bezel & control panel deck
        ctx.fillStyle = def?.screenColor ?? '#1e3a8a';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.fillRect(-wPx * 0.36, -dPx * 0.32, wPx * 0.72, dPx * 0.44);
        ctx.strokeRect(-wPx * 0.36, -dPx * 0.32, wPx * 0.72, dPx * 0.44);

        // Control panel strip with tiny buttons at front (+Y)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-wPx * 0.42, dPx * 0.16, wPx * 0.84, dPx * 0.26);
        ctx.strokeRect(-wPx * 0.42, dPx * 0.16, wPx * 0.84, dPx * 0.26);

        if (wPx > 20) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(-wPx * 0.18, dPx * 0.29, Math.max(1.5, wPx * 0.05), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(wPx * 0.12, dPx * 0.29, Math.max(1.3, wPx * 0.04), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(wPx * 0.24, dPx * 0.29, Math.max(1.3, wPx * 0.04), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      // 7c. Label Tag (unrotated for readability)
      if (showLabels && wPx > 18) {
        ctx.save();
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tag = machine.label || def?.shortTag.slice(0, 4) || 'M';
        const tagW = ctx.measureText(tag).width + 8;
        ctx.fillStyle = isSelected ? '#0284c7' : 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(cx - tagW / 2, cz - dPx / 2 - 9, tagW, 14);
        ctx.strokeStyle = isSelected ? '#7dd3fc' : '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - tagW / 2, cz - dPx / 2 - 9, tagW, 14);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(tag, cx, cz - dPx / 2 - 2);
        ctx.restore();
      }
    }

    // 8. Ghost Preview during Sidebar Drag-and-Drop
    if (dropPreview) {
      const def = catalogMap.get(dropPreview.definitionId);
      if (def) {
        const cx = pan.x + dropPreview.x * scale;
        const cz = pan.y + dropPreview.z * scale;
        const wPx = def.widthMm * scale;
        const dPx = def.depthMm * scale;
        ctx.save();
        ctx.strokeStyle = '#22d3ee';
        ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.fillRect(cx - wPx / 2, cz - dPx / 2, wPx, dPx);
        ctx.strokeRect(cx - wPx / 2, cz - dPx / 2, wPx, dPx);
        ctx.restore();
      }
    }

    // 9. Active Wall / Rect / Measure Drawing Overlay
    if (drawStartMm && drawCurrentMm) {
      const sx1 = pan.x + drawStartMm.x * scale;
      const sy1 = pan.y + drawStartMm.z * scale;
      const sx2 = pan.x + drawCurrentMm.x * scale;
      const sy2 = pan.y + drawCurrentMm.z * scale;

      ctx.save();
      if (activeTool === 'draw-rect') {
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 2;
        ctx.fillRect(sx1, sy1, sx2 - sx1, sy2 - sy1);
        ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);

        const wMm = Math.abs(drawCurrentMm.x - drawStartMm.x);
        const dMm = Math.abs(drawCurrentMm.z - drawStartMm.z);
        const label = `${formatLength(wMm, unitDisplay)} × ${formatLength(dMm, unitDisplay)}`;
        ctx.fillStyle = '#0ea5e9';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.fillText(label, (sx1 + sx2) / 2, (sy1 + sy2) / 2);
      } else {
        ctx.strokeStyle = activeTool === 'measure' ? '#facc15' : '#38bdf8';
        ctx.lineWidth = 2.5;
        if (activeTool === 'measure') ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();

        const distMm = Math.hypot(
          drawCurrentMm.x - drawStartMm.x,
          drawCurrentMm.z - drawStartMm.z
        );
        const label = formatLength(distMm, unitDisplay);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect((sx1 + sx2) / 2 - 36, (sy1 + sy2) / 2 - 12, 72, 22);
        ctx.fillStyle = activeTool === 'measure' ? '#facc15' : '#38bdf8';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, (sx1 + sx2) / 2, (sy1 + sy2) / 2 + 3);
      }
      ctx.restore();
    }

    // 10. Rubberband Box Select Overlay
    if (boxSelect) {
      const sx1 = pan.x + boxSelect.startX * scale;
      const sy1 = pan.y + boxSelect.startZ * scale;
      const sx2 = pan.x + boxSelect.endX * scale;
      const sy2 = pan.y + boxSelect.endZ * scale;
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.fillRect(sx1, sy1, sx2 - sx1, sy2 - sy1);
      ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);
      ctx.restore();
    }

    // 11. Top & Left Architectural Rulers (matching mockup)
    const rulerThickness = 24;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, rulerThickness);
    ctx.fillRect(0, 0, rulerThickness, H);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerThickness);
    ctx.lineTo(W, rulerThickness);
    ctx.moveTo(rulerThickness, 0);
    ctx.lineTo(rulerThickness, H);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '500 10px Inter, monospace';
    ctx.textAlign = 'center';

    // Top ruler ticks
    for (let x = startMajX; x <= worldRight; x += majorStepMm) {
      const sx = pan.x + x * scale;
      if (sx < rulerThickness) continue;
      ctx.beginPath();
      ctx.moveTo(sx, rulerThickness - 6);
      ctx.lineTo(sx, rulerThickness);
      ctx.strokeStyle = '#475569';
      ctx.stroke();
      const valStr =
        unitSystem === 'imperial'
          ? `${Math.round(x / MM_PER_FOOT)}'`
          : `${(x / MM_PER_METER).toFixed(1)}m`;
      ctx.fillText(valStr, sx, 12);
    }

    // Left ruler ticks
    for (let z = startMajZ; z <= worldBottom; z += majorStepMm) {
      const sy = pan.y + z * scale;
      if (sy < rulerThickness) continue;
      ctx.beginPath();
      ctx.moveTo(rulerThickness - 6, sy);
      ctx.lineTo(rulerThickness, sy);
      ctx.strokeStyle = '#475569';
      ctx.stroke();
      const valStr =
        unitSystem === 'imperial'
          ? `${Math.round(z / MM_PER_FOOT)}'`
          : `${(z / MM_PER_METER).toFixed(1)}m`;
      ctx.save();
      ctx.translate(11, sy);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(valStr, 0, 0);
      ctx.restore();
    }

    // Corner square
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, rulerThickness, rulerThickness);

    // 12. Bottom-Left X/Y CAD Axis Gizmo
    const axisX = 48;
    const axisY = H - 32;
    ctx.save();
    // Y axis (Cyan up)
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(axisX, axisY);
    ctx.lineTo(axisX, axisY - 34);
    ctx.stroke();
    ctx.font = '700 10px Inter, sans-serif';
    ctx.fillText('Y', axisX, axisY - 40);

    // X axis (Red right)
    ctx.strokeStyle = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(axisX, axisY);
    ctx.lineTo(axisX + 34, axisY);
    ctx.stroke();
    ctx.fillText('X', axisX + 42, axisY + 3);

    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(axisX - 3, axisY - 3, 6, 6);
    ctx.restore();

    ctx.restore();
  }, [
    project,
    pan,
    scale,
    selectedMachineIds,
    selectedWallId,
    selectedOpeningId,
    snapGuides,
    dropPreview,
    wallOpeningHover,
    drawStartMm,
    drawCurrentMm,
    boxSelect,
    activeTool,
    visibleMachines,
    catalogMap,
    collisions,
  ]);

  const totalCollisions =
    collisions.machineCollisionIds.size + collisions.clearanceWarningIds.size;

  const selectedWall = selectedWallId
    ? project.floorPlan.walls.find((w) => w.id === selectedWallId)
    : null;
  const selectedOp =
    selectedWall && selectedOpeningId
      ? getWallOpenings(selectedWall).find((op) => op.id === selectedOpeningId)
      : null;

  let opScreenPos: { x: number; y: number } | null = null;
  if (selectedWall && selectedOp) {
    const sx1 = pan.x + selectedWall.start.x * scale;
    const sy1 = pan.y + selectedWall.start.y * scale;
    const sx2 = pan.x + selectedWall.end.x * scale;
    const sy2 = pan.y + selectedWall.end.y * scale;
    opScreenPos = {
      x: sx1 + (sx2 - sx1) * selectedOp.offsetRatio,
      y: sy1 + (sy2 - sy1) * selectedOp.offsetRatio,
    };
  }

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={() => setDropPreview(null)}
      className="relative flex-1 h-full overflow-hidden select-none bg-[#0a1220]"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`block w-full h-full ${
          isPanning
            ? 'cursor-grabbing'
            : activeTool !== 'select'
              ? 'cursor-crosshair'
              : 'cursor-default'
        }`}
      />

      {/* Collision / Clearance Alert Banner */}
      {totalCollisions > 0 && (
        <div className="absolute top-9 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/90 border border-red-500/60 text-red-200 text-xs font-medium shadow-lg backdrop-blur-md">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>
            {collisions.machineCollisionIds.size > 0
              ? `${collisions.machineCollisionIds.size} cabinet overlap collision(s) detected`
              : `${collisions.clearanceWarningIds.size} player clearance zone warning(s)`}
          </span>
        </div>
      )}

      {/* Active Drawing Tool Helper Banner */}
      {activeTool !== 'select' && (
        <div className="absolute top-9 left-9 flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs shadow-lg">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {activeTool === 'draw-wall' &&
              'Click start & end points to draw wall (Hold Shift for 90° snap)'}
            {activeTool === 'draw-rect' &&
              'Click two opposite corners to generate a rectangular room'}
            {activeTool === 'add-door' &&
              'Click on any wall to place a Door (Hold Shift for Double Entrance Door)'}
            {activeTool === 'add-window' &&
              'Click on any wall to place an Architectural Window'}
            {activeTool === 'measure' &&
              'Click two points on the blueprint to measure exact distance'}
          </span>
          {drawStartMm && (
            <button
              onClick={() => {
                setDrawStartMm(null);
                setDrawCurrentMm(null);
              }}
              className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Floating In-Canvas Dimension Editor for Selected Window or Door on the 2D Floor Plan */}
      {selectedWall && selectedOp && opScreenPos && (
        <div
          style={{
            left: `${Math.max(120, Math.min(window.innerWidth - 340, opScreenPos.x))}px`,
            top: `${Math.max(65, Math.min(window.innerHeight - 130, opScreenPos.y - 36))}px`,
          }}
          className="absolute -translate-x-1/2 -translate-y-full z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/80 shadow-2xl backdrop-blur-md text-xs text-slate-100 select-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {selectedOp.type === 'window' ? (
            <Columns2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          ) : (
            <DoorOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-200 whitespace-nowrap">
            {selectedOp.type === 'window' ? 'Window' : 'Door'} Width:
          </span>
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-700">
            <NumericInput
              min={unitSystem === 'imperial' ? 6 : 15}
              max={unitSystem === 'imperial' ? 360 : 900}
              step={unitSystem === 'imperial' ? 1 : 5}
              value={parseFloat(formatMachineDimValue(selectedOp.widthMm, unitSystem, unitDisplay))}
              onChange={(num) => {
                updateWallOpening(selectedWall.id, selectedOp.id, {
                  widthMm: parseMachineDimInput(num, unitSystem, unitDisplay),
                });
              }}
              autoFocus
              className="w-16 bg-transparent text-right font-mono text-cyan-300 font-bold text-xs focus:outline-none"
            />
            <span className="font-mono text-slate-400 text-[11px]">{dimUnit}</span>
          </div>
          <button
            onClick={() => selectWall(selectedWall.id, null)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white ml-0.5"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Floating Bottom-Right Viewport Zoom & Fit Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 shadow-xl backdrop-blur-md">
        <button
          onClick={() => {
            const next = Math.min(0.3, scale * 1.2);
            setScale(next);
            setOrbitStats({ zoomPercent: Math.round((next / 0.05) * 100) });
          }}
          title="Zoom In"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="px-2 text-[11px] font-mono text-slate-300 min-w-[46px] text-center">
          {Math.round((scale / 0.05) * 100)}%
        </span>
        <button
          onClick={() => {
            const next = Math.max(0.008, scale / 1.2);
            setScale(next);
            setOrbitStats({ zoomPercent: Math.round((next / 0.05) * 100) });
          }}
          title="Zoom Out"
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-0.5" />
        <button
          onClick={fitViewToRoom}
          title="Fit Room to View"
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 text-xs text-cyan-300 hover:text-cyan-200 transition"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fit</span>
        </button>
      </div>
    </div>
  );
};


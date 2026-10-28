import {
  CollisionStatus,
  MachineDefinition,
  PlacedMachine,
  WallOpening,
  WallSegment,
} from '../types/arcade';

export function getWallOpenings(wall: WallSegment): WallOpening[] {
  if (wall.openings && wall.openings.length > 0) {
    return wall.openings;
  }
  if (wall.hasDoor && wall.doorWidthMm) {
    return [
      {
        id: `${wall.id}-legacy-door`,
        type: wall.doorWidthMm >= 1500 ? 'double-door' : 'single-door',
        offsetRatio: wall.doorOffsetRatio ?? 0.5,
        widthMm: wall.doorWidthMm,
        heightMm: 2134,
        sillHeightMm: 0,
        swingDirection: 'inward',
      },
    ];
  }
  return [];
}

export function findClosestWallProjection(
  wx: number,
  wz: number,
  walls: WallSegment[],
  maxDistanceMm = 1200
): {
  wall: WallSegment;
  offsetRatio: number;
  projX: number;
  projZ: number;
  distanceMm: number;
} | null {
  let best: {
    wall: WallSegment;
    offsetRatio: number;
    projX: number;
    projZ: number;
    distanceMm: number;
  } | null = null;

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1000) continue;

    const rawT = ((wx - wall.start.x) * dx + (wz - wall.start.y) * dy) / lenSq;
    const clampedT = Math.max(0.08, Math.min(0.92, rawT));
    const projX = wall.start.x + clampedT * dx;
    const projZ = wall.start.y + clampedT * dy;
    const dist = Math.hypot(wx - projX, wz - projZ);

    if (dist <= maxDistanceMm && (!best || dist < best.distanceMm)) {
      best = {
        wall,
        offsetRatio: Math.round(clampedT * 1000) / 1000,
        projX,
        projZ,
        distanceMm: dist,
      };
    }
  }
  return best;
}

export interface Box2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
}

export function getMachineDimensions(
  machine: PlacedMachine,
  catalogMap: Map<string, MachineDefinition>
): {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  playerClearanceMm: number;
  serviceClearanceMm: number;
} {
  const def = catalogMap.get(machine.definitionId);
  const widthMm = machine.customDimensions?.widthMm ?? def?.widthMm ?? 635;
  const depthMm = machine.customDimensions?.depthMm ?? def?.depthMm ?? 838;
  const heightMm = machine.customDimensions?.heightMm ?? def?.heightMm ?? 1727;
  const playerClearanceMm =
    machine.customDimensions?.playerClearanceMm ?? def?.playerClearanceMm ?? 762;
  const serviceClearanceMm =
    machine.customDimensions?.serviceClearanceMm ?? def?.serviceClearanceMm ?? 152;
  return { widthMm, depthMm, heightMm, playerClearanceMm, serviceClearanceMm };
}

/**
 * Computes axis-aligned bounding box (AABB) of a rotated machine footprint in 2D floor coordinates (X, Z)
 */
export function getMachineFootprintBox(
  machine: PlacedMachine,
  catalogMap: Map<string, MachineDefinition>
): Box2D {
  const { widthMm, depthMm } = getMachineDimensions(machine, catalogMap);
  const rad = ((machine.rotationYDeg % 360) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const rotW = widthMm * cos + depthMm * sin;
  const rotD = widthMm * sin + depthMm * cos;

  const cx = machine.position.x;
  const cz = machine.position.z;

  return {
    minX: cx - rotW / 2,
    maxX: cx + rotW / 2,
    minZ: cz - rotD / 2,
    maxZ: cz + rotD / 2,
    centerX: cx,
    centerZ: cz,
    width: rotW,
    depth: rotD,
  };
}

/**
 * Computes the front player clearance zone AABB in world coordinates (X, Z)
 */
export function getMachineClearanceBox(
  machine: PlacedMachine,
  catalogMap: Map<string, MachineDefinition>
): Box2D {
  const { widthMm, depthMm, playerClearanceMm } = getMachineDimensions(machine, catalogMap);
  const rad = ((machine.rotationYDeg % 360) * Math.PI) / 180;
  // Local front vector at rotation=0 is +Z (0, +1).
  // Standard rotation around Y: dirX = sin(rad), dirZ = cos(rad)
  const dirX = Math.sin(rad);
  const dirZ = Math.cos(rad);

  const offsetDist = depthMm / 2 + playerClearanceMm / 2;
  const cx = machine.position.x + dirX * offsetDist;
  const cz = machine.position.z + dirZ * offsetDist;

  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotW = widthMm * cos + playerClearanceMm * sin;
  const rotD = widthMm * sin + playerClearanceMm * cos;

  return {
    minX: cx - rotW / 2,
    maxX: cx + rotW / 2,
    minZ: cz - rotD / 2,
    maxZ: cz + rotD / 2,
    centerX: cx,
    centerZ: cz,
    width: rotW,
    depth: rotD,
  };
}

export function boxesOverlap(a: Box2D, b: Box2D, marginMm = 15): boolean {
  return (
    a.minX + marginMm < b.maxX &&
    a.maxX - marginMm > b.minX &&
    a.minZ + marginMm < b.maxZ &&
    a.maxZ - marginMm > b.minZ
  );
}

/**
 * Checks if a 2D box intersects a wall segment
 */
export function boxIntersectsWall(box: Box2D, wall: WallSegment): boolean {
  const halfT = wall.thicknessMm / 2;
  const wMinX = Math.min(wall.start.x, wall.end.x) - halfT;
  const wMaxX = Math.max(wall.start.x, wall.end.x) + halfT;
  const wMinZ = Math.min(wall.start.y, wall.end.y) - halfT;
  const wMaxZ = Math.max(wall.start.y, wall.end.y) + halfT;

  // Quick AABB check first
  if (box.maxX <= wMinX || box.minX >= wMaxX || box.maxZ <= wMinZ || box.minZ >= wMaxZ) {
    return false;
  }

  // Distance from box center to line segment
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;

  const t = Math.max(
    0,
    Math.min(1, ((box.centerX - wall.start.x) * dx + (box.centerZ - wall.start.y) * dy) / lenSq)
  );
  const projX = wall.start.x + t * dx;
  const projZ = wall.start.y + t * dy;

  const halfW = box.width / 2 + halfT - 20;
  const halfD = box.depth / 2 + halfT - 20;

  return Math.abs(box.centerX - projX) < halfW && Math.abs(box.centerZ - projZ) < halfD;
}

/**
 * Evaluates physical collisions and clearance warnings for all placed machines
 */
export function evaluateCollisions(
  machines: PlacedMachine[],
  walls: WallSegment[],
  catalogMap: Map<string, MachineDefinition>
): CollisionStatus {
  const machineCollisionIds = new Set<string>();
  const clearanceWarningIds = new Set<string>();

  const footprints = machines.map((m) => ({
    id: m.instanceId,
    box: getMachineFootprintBox(m, catalogMap),
    clearance: getMachineClearanceBox(m, catalogMap),
  }));

  for (let i = 0; i < footprints.length; i++) {
    const a = footprints[i];

    // Check against walls
    for (const wall of walls) {
      if (boxIntersectsWall(a.box, wall)) {
        machineCollisionIds.add(a.id);
      } else if (boxIntersectsWall(a.clearance, wall)) {
        clearanceWarningIds.add(a.id);
      }
    }

    // Check against other machines
    for (let j = i + 1; j < footprints.length; j++) {
      const b = footprints[j];
      if (boxesOverlap(a.box, b.box, 20)) {
        machineCollisionIds.add(a.id);
        machineCollisionIds.add(b.id);
      } else if (
        boxesOverlap(a.clearance, b.box, 35) ||
        boxesOverlap(b.clearance, a.box, 35)
      ) {
        clearanceWarningIds.add(a.id);
        clearanceWarningIds.add(b.id);
      }
    }
  }

  return { machineCollisionIds, clearanceWarningIds };
}

/**
 * Computes total room bounding box and approximate floor area from walls
 */
export function computeRoomMetrics(walls: WallSegment[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  widthMm: number;
  depthMm: number;
  areaMm2: number;
} {
  if (walls.length === 0) {
    return {
      minX: 0,
      maxX: 18288,
      minY: 0,
      maxY: 13716,
      widthMm: 18288,
      depthMm: 13716,
      areaMm2: 18288 * 13716,
    };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const w of walls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  }
  const widthMm = Math.max(1000, maxX - minX);
  const depthMm = Math.max(1000, maxY - minY);
  return {
    minX,
    maxX,
    minY,
    maxY,
    widthMm,
    depthMm,
    areaMm2: widthMm * depthMm,
  };
}


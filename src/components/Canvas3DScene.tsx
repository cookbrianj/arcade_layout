import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useArcadeStore } from '../store/useArcadeStore';
import {
  buildArcadeCabinetGroup,
  createDropCeilingTexture,
  createFloorTexture,
} from '../utils/threeBuilders';
import {
  computeRoomMetrics,
  getMachineFootprintBox,
  getWallOpenings,
} from '../utils/geometry';
import { Compass, Eye, Navigation, Plane, Sparkles } from 'lucide-react';

export const Canvas3DScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    project,
    viewMode,
    selectedMachineIds,
    selectMachine,
    walkPlayer,
    setWalkPlayer,
    setOrbitStats,
    toggleUnitSystem,
    updateSettings,
    setViewMode,
    getCatalogMap,
  } = useArcadeStore();

  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Refs for mutable animation loop state
  const keysPressedRef = useRef<Set<string>>(new Set());
  const walkStateRef = useRef(walkPlayer);
  const lastStoreSyncTimeRef = useRef<number>(0);

  const isDraggingLookRef = useRef(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const flyHeightRef = useRef<number>(3.4);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);

  const catalogMap = getCatalogMap();
  const visibleLayerIds = new Set(
    project.layers.filter((l) => l.visible).map((l) => l.id)
  );
  const visibleMachines = project.placedMachines.filter(
    (m) => !m.layerId || visibleLayerIds.has(m.layerId)
  );

  // Keep latest collision & environment state in ref so WebGL loop doesn't re-mount
  const envRef = useRef({
    walls: project.floorPlan.walls,
    visibleMachines,
    catalogMap,
  });
  envRef.current = {
    walls: project.floorPlan.walls,
    visibleMachines,
    catalogMap,
  };

  // Smooth sliding collision checker for Walkthrough Mode
  const isPointBlocked = useCallback((px: number, pz: number, margin = 200): boolean => {
    const { walls, visibleMachines: machines, catalogMap: catMap } = envRef.current;
    const metrics = computeRoomMetrics(walls);

    // Keep inside venue boundaries with margin
    if (
      px < metrics.minX + margin ||
      px > metrics.maxX - margin ||
      pz < metrics.minY + margin ||
      pz > metrics.maxY - margin
    ) {
      return true;
    }

    // Check against placed machine footprints
    for (const m of machines) {
      const box = getMachineFootprintBox(m, catMap);
      if (
        px + margin > box.minX &&
        px - margin < box.maxX &&
        pz + margin > box.minZ &&
        pz - margin < box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }, []);

  const resolveWalkStep = useCallback(
    (currX: number, currZ: number, dx: number, dz: number): { x: number; z: number } => {
      // 1. Full diagonal step
      if (!isPointBlocked(currX + dx, currZ + dz, 220)) {
        return { x: currX + dx, z: currZ + dz };
      }
      // 2. Sliding along X
      const canX = !isPointBlocked(currX + dx, currZ, 220);
      // 3. Sliding along Z
      const canZ = !isPointBlocked(currX, currZ + dz, 220);

      if (canX && canZ) {
        return Math.abs(dx) > Math.abs(dz)
          ? { x: currX + dx, z: currZ }
          : { x: currX, z: currZ + dz };
      }
      if (canX) return { x: currX + dx, z: currZ };
      if (canZ) return { x: currX, z: currZ + dz };

      // 4. Fallback for tight spaces: small step
      if (!isPointBlocked(currX + dx * 0.35, currZ + dz * 0.35, 140)) {
        return { x: currX + dx * 0.35, z: currZ + dz * 0.35 };
      }

      // 5. Anti-jamming: if already stuck inside an obstacle, allow moving
      if (isPointBlocked(currX, currZ, 220)) {
        return { x: currX + dx, z: currZ + dz };
      }

      return { x: currX, z: currZ };
    },
    [isPointBlocked]
  );

  // Initialize WebGL Renderer, Scene, Camera, OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    scene.fog = new THREE.FogExp2('#090d16', 0.022);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55,
      rect.width / Math.max(1, rect.height),
      0.1,
      150
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.maxPolarAngle = Math.PI / 2 - 0.04;
    orbit.minDistance = 2.5;
    orbit.maxDistance = 65;
    orbitControlsRef.current = orbit;

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const r = container.getBoundingClientRect();
      camera.aspect = r.width / Math.max(1, r.height);
      camera.updateProjectionMatrix();
      renderer.setSize(r.width, r.height);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard listeners for WASD in all 3D modes (Orbit, Walkthrough, Flythrough)
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const code = e.code.toLowerCase();
      const key = e.key.toLowerCase();
      keysPressedRef.current.add(code);
      keysPressedRef.current.add(key);

      // Prevent page scroll for directional movement keys while in 3D scene
      if (['space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(code)) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code.toLowerCase();
      const key = e.key.toLowerCase();
      keysPressedRef.current.delete(code);
      keysPressedRef.current.delete(key);

      // Sync final position to store when movement keys are released
      const store = useArcadeStore.getState();
      if (store.viewMode === '3d-walk' || store.viewMode === '3d-fly') {
        store.setWalkPlayer({
          x: Math.round(walkStateRef.current.x),
          z: Math.round(walkStateRef.current.z),
        });
      }
    };

    const onWindowBlur = () => {
      keysPressedRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    // Pointer lock state change
    const onPointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === renderer.domElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Mouse move for pointer-lock OR drag look in 3d-walk / 3d-fly
    const onMouseMove = (e: MouseEvent) => {
      const mode = useArcadeStore.getState().viewMode;
      if (mode !== '3d-walk' && mode !== '3d-fly') return;

      if (document.pointerLockElement === renderer.domElement) {
        const yaw = walkStateRef.current.yaw - e.movementX * 0.0024;
        const pitch = Math.max(
          -Math.PI / 2.6,
          Math.min(Math.PI / 2.6, walkStateRef.current.pitch - e.movementY * 0.0022)
        );
        walkStateRef.current = { ...walkStateRef.current, yaw, pitch };
      } else if (isDraggingLookRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        const yaw = walkStateRef.current.yaw - dx * 0.004;
        const pitch = Math.max(
          -Math.PI / 2.6,
          Math.min(Math.PI / 2.6, walkStateRef.current.pitch - dy * 0.0035)
        );
        walkStateRef.current = { ...walkStateRef.current, yaw, pitch };
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const mode = useArcadeStore.getState().viewMode;
      if (mode === '3d-walk' || mode === '3d-fly') {
        isDraggingLookRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onMouseUp = () => {
      if (isDraggingLookRef.current) {
        isDraggingLookRef.current = false;
        const store = useArcadeStore.getState();
        store.setWalkPlayer({
          yaw: walkStateRef.current.yaw,
          pitch: walkStateRef.current.pitch,
        });
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation loop
    let animId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      const store = useArcadeStore.getState();
      const mode = store.viewMode;
      const keys = keysPressedRef.current;

      const isFwd = keys.has('keyw') || keys.has('w') || keys.has('arrowup');
      const isBack = keys.has('keys') || keys.has('s') || keys.has('arrowdown');
      const isLeft = keys.has('keya') || keys.has('a') || keys.has('arrowleft');
      const isRight = keys.has('keyd') || keys.has('d') || keys.has('arrowright');
      const isUp = keys.has('keye') || keys.has('e') || keys.has('space');
      const isDown = keys.has('keyq') || keys.has('q') || keys.has('keyc') || keys.has('c');
      const isSprint = keys.has('shiftleft') || keys.has('shiftright') || keys.has('shift');

      if (mode === '3d-orbit') {
        orbit.enabled = true;

        // Support WASD in 3D Orbit Mode: glides camera & orbit pivot horizontally across venue in view direction
        let moveFwd = 0;
        let moveSide = 0;
        let moveElev = 0;
        if (isFwd) moveFwd += 1;
        if (isBack) moveFwd -= 1;
        if (isRight) moveSide += 1;
        if (isLeft) moveSide -= 1;
        if (isUp) moveElev += 1;
        if (isDown) moveElev -= 1;

        if (moveFwd !== 0 || moveSide !== 0 || moveElev !== 0) {
          const orbitPanSpeed = (isSprint ? 24 : 12) * dt;
          const fwdDir = new THREE.Vector3();
          camera.getWorldDirection(fwdDir);
          fwdDir.y = 0;
          if (fwdDir.lengthSq() > 0.001) fwdDir.normalize();
          else fwdDir.set(0, 0, -1);

          const rightDir = new THREE.Vector3()
            .crossVectors(fwdDir, new THREE.Vector3(0, 1, 0))
            .normalize();

          const deltaVec = new THREE.Vector3()
            .addScaledVector(fwdDir, moveFwd * orbitPanSpeed)
            .addScaledVector(rightDir, moveSide * orbitPanSpeed);
          deltaVec.y += moveElev * orbitPanSpeed;

          camera.position.add(deltaVec);
          orbit.target.add(deltaVec);
        }

        orbit.update();

        // Update live camera altitude & tilt angle readout
        const dist = camera.position.distanceTo(orbit.target);
        const altM = Math.max(1, Math.round(camera.position.y));
        const polarDeg = Math.round(
          (Math.acos(Math.max(-1, Math.min(1, camera.position.y / Math.max(0.1, dist)))) * 180) /
            Math.PI
        );
        const zoomPct = Math.round(Math.max(20, Math.min(200, (22 / Math.max(3, dist)) * 100)));
        store.setOrbitStats({ altitudeM: altM, angleDeg: polarDeg, zoomPercent: zoomPct });
      } else {
        orbit.enabled = false;
        const speedPct = store.project.settings.walkSpeedPercent / 100;
        const sprintMult = isSprint ? 1.85 : 1.0;
        const baseSpeedMmPerSec =
          (mode === '3d-fly' ? 7000 : 3800) * (0.35 + speedPct * 1.1) * sprintMult;

        let moveForward = 0;
        let moveRight = 0;
        let moveUp = 0;

        if (isFwd) moveForward += 1;
        if (isBack) moveForward -= 1;
        if (isRight) moveRight += 1;
        if (isLeft) moveRight -= 1;
        if (isUp) moveUp += 1;
        if (isDown) moveUp -= 1;

        // Position camera and apply look orientation
        const eyeHeightM = mode === '3d-fly' ? flyHeightRef.current : 1.7; // 5'7" human eye level
        camera.position.set(
          walkStateRef.current.x / 1000,
          eyeHeightM,
          walkStateRef.current.z / 1000
        );

        const { yaw, pitch } = walkStateRef.current;
        const lookTarget = new THREE.Vector3(
          camera.position.x - Math.sin(yaw) * Math.cos(pitch),
          camera.position.y + Math.sin(pitch),
          camera.position.z - Math.cos(yaw) * Math.cos(pitch)
        );
        camera.lookAt(lookTarget);

        // Compute forward and right vectors DIRECTLY from the camera's current viewing direction!
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        if (mode === '3d-walk') {
          fwd.y = 0; // In walkthrough mode, keep movement horizontal on the floor
          if (fwd.lengthSq() > 0.001) fwd.normalize();
        }
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

        if (moveForward !== 0 || moveRight !== 0 || (mode === '3d-fly' && moveUp !== 0)) {
          const stepMm = baseSpeedMmPerSec * dt;
          const moveVec = new THREE.Vector3()
            .addScaledVector(fwd, moveForward)
            .addScaledVector(right, moveRight);
          if (moveVec.lengthSq() > 0.001) moveVec.normalize();

          const dxMm = moveVec.x * stepMm;
          const dzMm = moveVec.z * stepMm;

          let nextX = walkStateRef.current.x;
          let nextZ = walkStateRef.current.z;

          if (mode === '3d-fly') {
            nextX += dxMm;
            nextZ += dzMm;
            flyHeightRef.current = Math.max(
              0.8,
              Math.min(22, flyHeightRef.current + (moveUp + moveVec.y * moveForward) * 5 * dt)
            );
          } else {
            // Smooth sliding collision with obstacle resolver
            const resolved = resolveWalkStep(walkStateRef.current.x, walkStateRef.current.z, dxMm, dzMm);
            nextX = resolved.x;
            nextZ = resolved.z;
          }

          walkStateRef.current = { ...walkStateRef.current, x: nextX, z: nextZ };
          camera.position.x = nextX / 1000;
          camera.position.z = nextZ / 1000;

          // Throttled store update for the Mini-Map Radar (runs every ~120ms to avoid re-rendering loop)
          const nowMs = performance.now();
          if (nowMs - lastStoreSyncTimeRef.current > 120) {
            lastStoreSyncTimeRef.current = nowMs;
            store.setWalkPlayer({
              x: nextX,
              z: nextZ,
              yaw: walkStateRef.current.yaw,
              pitch: walkStateRef.current.pitch,
            });
          }
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      orbit.dispose();
      renderer.dispose();
    };
  }, [resolveWalkStep]);

  // Reposition camera when switching between 3d-orbit, 3d-walk, and 3d-fly
  useEffect(() => {
    const camera = cameraRef.current;
    const orbit = orbitControlsRef.current;
    if (!camera || !orbit) return;

    const metrics = computeRoomMetrics(project.floorPlan.walls);
    const centerXM = (metrics.minX + metrics.maxX) / 2000;
    const centerZM = (metrics.minY + metrics.maxY) / 2000;

    if (viewMode === '3d-orbit') {
      if (document.pointerLockElement) document.exitPointerLock();
      camera.fov = 46;
      camera.updateProjectionMatrix();
      orbit.target.set(centerXM, 0.8, centerZM);
      camera.position.set(centerXM - 11.5, 13.5, centerZM + 15.5);
      orbit.update();
    } else if (viewMode === '3d-walk') {
      camera.fov = 64;
      camera.updateProjectionMatrix();
    } else if (viewMode === '3d-fly') {
      camera.fov = 60;
      camera.updateProjectionMatrix();
      flyHeightRef.current = 4.2;
    }
  }, [viewMode]);

  // Rebuild 3D Room, Walls, Ceiling Ducts/Lights, Neon Signs & Arcade Machines whenever project updates
  useEffect(() => {
    const dynamicGroup = dynamicGroupRef.current;
    if (!dynamicGroup) return;

    // Clear previous children
    while (dynamicGroup.children.length > 0) {
      dynamicGroup.remove(dynamicGroup.children[0]);
    }

    const metrics = computeRoomMetrics(project.floorPlan.walls);
    const roomWM = metrics.widthMm / 1000;
    const roomDM = metrics.depthMm / 1000;
    const centerXM = (metrics.minX + metrics.maxX) / 2000;
    const centerZM = (metrics.minY + metrics.maxY) / 2000;
    const wallHM = project.settings.wallHeightMm / 1000;
    const isNight = project.settings.lightingMode === 'arcade-night';

    // 1. Lighting System
    const ambientLight = new THREE.AmbientLight(
      isNight ? '#3b4268' : '#e2e8f0',
      isNight ? 0.85 : 1.75
    );
    dynamicGroup.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(
      isNight ? '#818cf8' : '#ffffff',
      isNight ? 0.65 : 1.35
    );
    dirLight.position.set(centerXM + 8, 18, centerZM + 10);
    dynamicGroup.add(dirLight);

    // Warm & Neon Track Spotlights across the venue
    const spotColors = ['#facc15', '#38bdf8', '#e879f9', '#fb923c'];
    for (let i = 0; i < 4; i++) {
      const ptLight = new THREE.PointLight(
        isNight ? spotColors[i % spotColors.length] : '#fffbeb',
        isNight ? 4.5 : 3.0,
        14
      );
      ptLight.position.set(
        metrics.minX / 1000 + roomWM * (0.2 + i * 0.2),
        wallHM - 0.35,
        centerZM + (i % 2 === 0 ? -roomDM * 0.2 : roomDM * 0.2)
      );
      dynamicGroup.add(ptLight);
    }

    // 2. Floor Plane with Selected Texture (Neon Galaxy Carpet, Concrete, Wood, Grid)
    const floorTex = createFloorTexture(project.floorPlan.material);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: project.floorPlan.material === 'polished-concrete' ? 0.25 : 0.7,
      metalness: 0.1,
    });
    const floorGeo = new THREE.PlaneGeometry(roomWM + 0.4, roomDM + 0.4);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(centerXM, 0, centerZM);
    dynamicGroup.add(floorMesh);

    // 3. Outer Dark Surround Floor
    const surroundGeo = new THREE.PlaneGeometry(80, 80);
    const surroundMat = new THREE.MeshBasicMaterial({ color: '#070b13' });
    const surroundMesh = new THREE.Mesh(surroundGeo, surroundMat);
    surroundMesh.rotation.x = -Math.PI / 2;
    surroundMesh.position.set(centerXM, -0.02, centerZM);
    dynamicGroup.add(surroundMesh);

    // 4. Architectural 3D Walls & Neon Wall Signs
    // In 3D Orbit mode, make walls lower cutaway (2.3m) so dollhouse interior is clearly visible
    const effectiveWallHM = viewMode === '3d-orbit' ? Math.min(2.35, wallHM) : wallHM;
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#182030',
      roughness: 0.75,
      metalness: 0.15,
    });
    const wallCapMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.5,
    });

    for (const wall of project.floorPlan.walls) {
      const x1 = wall.start.x / 1000;
      const z1 = wall.start.y / 1000;
      const x2 = wall.end.x / 1000;
      const z2 = wall.end.y / 1000;
      const dx = x2 - x1;
      const dz = z2 - z1;
      const lengthM = Math.hypot(dx, dz);
      if (lengthM < 0.1) continue;

      const angle = Math.atan2(dz, dx);
      const thickM = Math.max(0.18, wall.thicknessMm / 1000);

      const wallGroup = new THREE.Group();
      wallGroup.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
      wallGroup.rotation.y = -angle;

      const wallMesh = new THREE.Mesh(
        new THREE.BoxGeometry(lengthM, effectiveWallHM, thickM),
        wallMat
      );
      wallMesh.position.y = effectiveWallHM / 2;
      wallGroup.add(wallMesh);

      // Top cap trim for dollhouse view
      const capMesh = new THREE.Mesh(
        new THREE.BoxGeometry(lengthM + 0.02, 0.05, thickM + 0.02),
        wallCapMat
      );
      capMesh.position.y = effectiveWallHM + 0.025;
      wallGroup.add(capMesh);

      // 3D Doors & Windows along this Wall Segment
      const openings = getWallOpenings(wall);
      const frameMat = new THREE.MeshStandardMaterial({
        color: '#475569',
        metalness: 0.6,
        roughness: 0.35,
      });
      const doorPanelMat = new THREE.MeshStandardMaterial({
        color: '#0f172a',
        metalness: 0.3,
        roughness: 0.5,
      });
      const windowGlassMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0369a1',
        emissiveIntensity: 0.65,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.72,
      });
      const exitSignMat = new THREE.MeshBasicMaterial({
        color: '#22c55e',
      });

      for (const op of openings) {
        const opWM = op.widthMm / 1000;
        if (opWM >= lengthM * 0.92) continue;
        const opX = (op.offsetRatio - 0.5) * lengthM;

        if (op.type === 'window') {
          const sillM = Math.min(effectiveWallHM * 0.4, (op.sillHeightMm || 914) / 1000);
          const winHM = Math.min(
            effectiveWallHM - sillM - 0.12,
            (op.heightMm || 1219) / 1000
          );
          if (winHM > 0.2) {
            const winCenterY = sillM + winHM / 2;
            // Outer Window Frame & Sill
            const frameBox = new THREE.Mesh(
              new THREE.BoxGeometry(opWM + 0.08, winHM + 0.08, thickM + 0.03),
              frameMat
            );
            frameBox.position.set(opX, winCenterY, 0);
            wallGroup.add(frameBox);

            // Glowing Window Glass Pane (both sides of wall)
            const glassBox = new THREE.Mesh(
              new THREE.BoxGeometry(opWM - 0.04, winHM - 0.04, thickM + 0.045),
              windowGlassMat
            );
            glassBox.position.set(opX, winCenterY, 0);
            wallGroup.add(glassBox);

            // Center Vertical & Horizontal Mullion Bars
            const vMullion = new THREE.Mesh(
              new THREE.BoxGeometry(0.035, winHM, thickM + 0.055),
              frameMat
            );
            vMullion.position.set(opX, winCenterY, 0);
            wallGroup.add(vMullion);

            const hMullion = new THREE.Mesh(
              new THREE.BoxGeometry(opWM, 0.035, thickM + 0.055),
              frameMat
            );
            hMullion.position.set(opX, winCenterY, 0);
            wallGroup.add(hMullion);
          }
        } else {
          // Single or Double Doorway
          const doorHM = Math.min(effectiveWallHM - 0.1, (op.heightMm || 2134) / 1000);
          const doorCenterY = doorHM / 2;

          // Door Frame Surround
          const doorFrame = new THREE.Mesh(
            new THREE.BoxGeometry(opWM + 0.1, doorHM + 0.06, thickM + 0.03),
            frameMat
          );
          doorFrame.position.set(opX, doorCenterY, 0);
          wallGroup.add(doorFrame);

          // Recessed Door Panel
          const doorPanel = new THREE.Mesh(
            new THREE.BoxGeometry(opWM - 0.04, doorHM - 0.04, thickM + 0.042),
            doorPanelMat
          );
          doorPanel.position.set(opX, doorCenterY, 0);
          wallGroup.add(doorPanel);

          // Upper Glass Vision Lite(s) & Chrome Pushbar
          if (op.type === 'double-door') {
            // Center seam
            const seam = new THREE.Mesh(
              new THREE.BoxGeometry(0.025, doorHM, thickM + 0.055),
              frameMat
            );
            seam.position.set(opX, doorCenterY, 0);
            wallGroup.add(seam);

            // Two vision lites
            [-opWM * 0.24, opWM * 0.24].forEach((dxLite) => {
              const lite = new THREE.Mesh(
                new THREE.BoxGeometry(opWM * 0.28, doorHM * 0.36, thickM + 0.05),
                windowGlassMat
              );
              lite.position.set(opX + dxLite, doorHM * 0.66, 0);
              wallGroup.add(lite);
            });
          } else {
            const lite = new THREE.Mesh(
              new THREE.BoxGeometry(opWM * 0.52, doorHM * 0.36, thickM + 0.05),
              windowGlassMat
            );
            lite.position.set(opX, doorHM * 0.66, 0);
            wallGroup.add(lite);
          }

          // Chrome Push Bar
          const pushBar = new THREE.Mesh(
            new THREE.BoxGeometry(opWM * 0.78, 0.04, thickM + 0.065),
            frameMat
          );
          pushBar.position.set(opX, doorHM * 0.44, 0);
          wallGroup.add(pushBar);

          // Glowing Green EXIT Sign above Door
          if (doorHM + 0.18 < effectiveWallHM) {
            const exitBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.36, 0.14, thickM + 0.05),
              exitSignMat
            );
            exitBox.position.set(opX, doorHM + 0.12, 0);
            wallGroup.add(exitBox);
          }
        }
      }

      dynamicGroup.add(wallGroup);
    }

    // 5. Simple 8ft Commercial Drop Ceiling (Suspended T-Bar Acoustic Grid)
    if (viewMode !== '3d-orbit') {
      const dropCeilingTex = createDropCeilingTexture();
      const ceilingGeo = new THREE.PlaneGeometry(roomWM + 0.4, roomDM + 0.4);
      const ceilingMat = new THREE.MeshStandardMaterial({
        map: dropCeilingTex,
        roughness: 0.88,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
      ceilingMesh.rotation.x = Math.PI / 2;
      ceilingMesh.position.set(centerXM, wallHM, centerZM);
      dynamicGroup.add(ceilingMesh);

      // Soft troffer downlight from the 8ft drop ceiling
      const trofferLight = new THREE.DirectionalLight('#f8fafc', isNight ? 0.4 : 0.9);
      trofferLight.position.set(centerXM, wallHM - 0.05, centerZM);
      trofferLight.target.position.set(centerXM, 0, centerZM);
      dynamicGroup.add(trofferLight);
      dynamicGroup.add(trofferLight.target);
    }

    // 6. Placed 3D Arcade Machines
    const selectedSet = new Set(selectedMachineIds);
    for (const machine of visibleMachines) {
      const def = catalogMap.get(machine.definitionId);
      const cabGroup = buildArcadeCabinetGroup(
        machine,
        def,
        catalogMap,
        selectedSet.has(machine.instanceId)
      );
      dynamicGroup.add(cabGroup);
    }
  }, [project, viewMode, selectedMachineIds, visibleMachines, catalogMap]);

  // Raycast click to select machine in 3D Orbit mode
  const handleSceneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Release focus from any text inputs or buttons so WASD keyboard navigation immediately receives events
    if (document.activeElement && (document.activeElement as HTMLElement).blur) {
      (document.activeElement as HTMLElement).blur();
    }

    if (viewMode === '3d-walk' || viewMode === '3d-fly') {
      return;
    }

    const container = mountRef.current;
    const camera = cameraRef.current;
    const dynamicGroup = dynamicGroupRef.current;
    if (!container || !camera || !dynamicGroup) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(dynamicGroup.children, true);

    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData?.instanceId) {
          selectMachine(obj.userData.instanceId, e.shiftKey);
          return;
        }
        obj = obj.parent;
      }
    }
  };

  // Render Top-Right Circular Mini-Map Radar in Walkthrough & Flythrough modes
  useEffect(() => {
    if (viewMode !== '3d-walk' && viewMode !== '3d-fly') return;
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 180;
    ctx.clearRect(0, 0, size, size);

    // Circular radar background
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, size, size);

    const metrics = computeRoomMetrics(project.floorPlan.walls);
    const pad = 22;
    const scaleM = Math.min(
      (size - pad * 2) / metrics.widthMm,
      (size - pad * 2) / metrics.depthMm
    );
    const offsetX = (size - metrics.widthMm * scaleM) / 2 - metrics.minX * scaleM;
    const offsetY = (size - metrics.depthMm * scaleM) / 2 - metrics.minY * scaleM;

    // Draw walls & door/window openings on radar
    for (const w of project.floorPlan.walls) {
      const sx1 = offsetX + w.start.x * scaleM;
      const sy1 = offsetY + w.start.y * scaleM;
      const sx2 = offsetX + w.end.x * scaleM;
      const sy2 = offsetY + w.end.y * scaleM;

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      const openings = getWallOpenings(w);
      for (const op of openings) {
        const cx = sx1 + (sx2 - sx1) * op.offsetRatio;
        const cy = sy1 + (sy2 - sy1) * op.offsetRatio;
        ctx.fillStyle = op.type === 'window' ? '#38bdf8' : '#34d399';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw machines on radar
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    for (const m of visibleMachines) {
      const box = getMachineFootprintBox(m, catalogMap);
      const bx = offsetX + box.minX * scaleM;
      const by = offsetY + box.minZ * scaleM;
      const bw = box.width * scaleM;
      const bd = box.depth * scaleM;
      ctx.fillRect(bx, by, bw, bd);
      ctx.strokeRect(bx, by, bw, bd);
    }

    // Draw Player Position & Viewing Cone (matching 3D Walkthrough screenshot!)
    const px = offsetX + walkPlayer.x * scaleM;
    const py = offsetY + walkPlayer.z * scaleM;
    const lookAngle = Math.atan2(-Math.cos(walkPlayer.yaw), -Math.sin(walkPlayer.yaw));

    // Blue FOV Cone
    const coneGrad = ctx.createRadialGradient(px, py, 4, px, py, 52);
    coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
    coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 52, lookAngle - 0.52, lookAngle + 0.52);
    ctx.closePath();
    ctx.fill();

    // Player Circle & Arrow
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Directional dart inside circle
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(lookAngle + Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4.5, 4.5);
    ctx.lineTo(0, 2);
    ctx.lineTo(4.5, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#bae6fd';
    ctx.font = '700 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You', px, py + 21);

    ctx.restore();
  }, [viewMode, project.floorPlan.walls, visibleMachines, walkPlayer, catalogMap]);

  // Teleport player when clicking on the Mini-Map Radar
  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const size = 180;
    const metrics = computeRoomMetrics(project.floorPlan.walls);
    const pad = 22;
    const scaleM = Math.min(
      (size - pad * 2) / metrics.widthMm,
      (size - pad * 2) / metrics.depthMm
    );
    const offsetX = (size - metrics.widthMm * scaleM) / 2 - metrics.minX * scaleM;
    const offsetY = (size - metrics.depthMm * scaleM) / 2 - metrics.minY * scaleM;

    const targetX = (sx - offsetX) / scaleM;
    const targetZ = (sy - offsetY) / scaleM;
    walkStateRef.current = { ...walkStateRef.current, x: targetX, z: targetZ };
    setWalkPlayer({
      x: targetX,
      z: targetZ,
      yaw: walkStateRef.current.yaw,
      pitch: walkStateRef.current.pitch,
    });
  };

  const lockPointer = () => {
    const canvas = mountRef.current?.querySelector('canvas');
    if (canvas && canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  };

  return (
    <div className="relative flex-1 h-full overflow-hidden bg-[#090d16] select-none">
      {/* Three.js WebGL Mount */}
      <div
        ref={mountRef}
        onClick={handleSceneClick}
        onDoubleClick={() => {
          if (viewMode === '3d-walk' || viewMode === '3d-fly') lockPointer();
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* WALKTHROUGH & FLYTHROUGH OVERLAY HUD (Matches arcade_ui_3d_walk_1793131422206.jpg) */}
      {(viewMode === '3d-walk' || viewMode === '3d-fly') && (
        <>
          {/* Top-Left Walkthrough Mode Badge */}
          <div className="absolute top-4 left-4 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/70 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <span>ArcadeLayout 3D</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">
                {viewMode === '3d-walk' ? 'Walkthrough Mode' : 'Flythrough Drone Mode'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Controls: <span className="text-slate-200 font-mono">[WASD]</span> Move,{' '}
              <span className="text-slate-200 font-mono">[MOUSE DRAG]</span> Look
              {viewMode === '3d-fly' && (
                <span>
                  , <span className="text-slate-200 font-mono">[E/Q]</span> Up/Down
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={lockPointer}
                className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-[11px] font-medium text-cyan-300 transition"
              >
                {isPointerLocked ? 'ESC to Unlock Mouse' : 'Lock Mouse Look (FPS)'}
              </button>
              <button
                onClick={() =>
                  setViewMode(viewMode === '3d-walk' ? '3d-fly' : '3d-walk')
                }
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] text-slate-200 transition"
              >
                <Plane className="w-3 h-3 text-purple-400" />
                <span>{viewMode === '3d-walk' ? 'Switch to Fly Mode' : 'Switch to Walk Mode'}</span>
              </button>
            </div>
          </div>

          {/* Top-Center Speed Slider & Unit Switch Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/70 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-slate-300">Speed</span>
              <input
                type="range"
                min={10}
                max={100}
                value={project.settings.walkSpeedPercent}
                onChange={(e) =>
                  updateSettings({ walkSpeedPercent: Number(e.target.value) })
                }
                className="w-32 accent-orange-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-200 w-9">
                {project.settings.walkSpeedPercent}%
              </span>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">Unit</span>
              <button
                onClick={toggleUnitSystem}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  project.settings.unitSystem === 'metric'
                    ? 'bg-cyan-600'
                    : 'bg-slate-700'
                }`}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform translate-y-0.75 ${
                    project.settings.unitSystem === 'metric'
                      ? 'translate-x-5.5'
                      : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs font-mono text-slate-200">
                {project.settings.unitSystem === 'imperial' ? 'ft/in' : 'm/cm'}
              </span>
            </div>
          </div>

          {/* Top-Right Circular Mini-Map Radar (Click to Teleport) */}
          <div className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-950/75 border border-slate-700/70 backdrop-blur-md shadow-2xl flex flex-col items-center">
            <canvas
              ref={minimapCanvasRef}
              width={180}
              height={180}
              onClick={handleMinimapClick}
              title="Click anywhere on mini-map to teleport camera"
              className="rounded-full border border-slate-600/80 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5 text-cyan-400" />
              Click radar to teleport
            </span>
          </div>
        </>
      )}

      {/* 3D ORBIT MODE FLOATING CONTROLS */}
      {viewMode === '3d-orbit' && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-700/80 backdrop-blur-md shadow-xl text-xs text-slate-300">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span>WASD / Drag: Move & Orbit</span>
          <span className="text-slate-600">•</span>
          <span>Right-drag: Pan</span>
          <span className="text-slate-600">•</span>
          <span>Scroll: Zoom</span>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={() =>
              updateSettings({
                lightingMode:
                  project.settings.lightingMode === 'arcade-night'
                    ? 'work-daylight'
                    : 'arcade-night',
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {project.settings.lightingMode === 'arcade-night'
                ? 'Neon Night Ambiance'
                : 'Daylight Work Mode'}
            </span>
          </button>
          <button
            onClick={() => setViewMode('3d-fly')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 transition"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Free-Flight Drone</span>
          </button>
        </div>
      )}
    </div>
  );
};


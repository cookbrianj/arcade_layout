import * as THREE from 'three';
import { FloorMaterial, MachineDefinition, PlacedMachine } from '../types/arcade';
import { getMachineDimensions } from './geometry';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates floor material texture (90s Neon Galaxy Carpet, Polished Concrete, Wood, or CAD Grid)
 */
export function createFloorTexture(materialType: FloorMaterial): THREE.CanvasTexture {
  const key = `floor-${materialType}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (materialType === 'neon-carpet') {
    // Deep indigo / cosmic dark background
    ctx.fillStyle = '#0e0b24';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle geometric constellation grid (matching the 3D walkthrough screenshot)
    ctx.strokeStyle = 'rgba(217, 70, 239, 0.32)';
    ctx.lineWidth = 2;
    const pts = [
      [0, 0],
      [256, 64],
      [512, 0],
      [128, 192],
      [384, 192],
      [0, 256],
      [256, 320],
      [512, 256],
      [140, 440],
      [380, 440],
      [0, 512],
      [256, 512],
      [512, 512],
    ];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
        if (d < 270) {
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
    }

    // Neon cyan & orange confetti triangles & stardust
    const colors = ['#22d3ee', '#e879f9', '#f97316', '#facc15', '#38bdf8'];
    for (let i = 0; i < 140; i++) {
      const x = ((i * 97) % 500) + 6;
      const y = ((i * 173) % 500) + 6;
      ctx.fillStyle = colors[i % colors.length];
      if (i % 5 === 0) {
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, (i % 3) + 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (materialType === 'polished-concrete') {
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#151922';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.strokeRect(256, 0, 256, 256);
    ctx.strokeRect(0, 256, 256, 256);
    ctx.strokeRect(256, 256, 256, 256);
  } else if (materialType === 'wood') {
    ctx.fillStyle = '#3b2314';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#27150b';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#0b1322';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 6);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates an authentic 8ft commercial acoustic drop ceiling texture (2x2 / 2x4 suspended T-bar grid with flush lighting troffers)
 */
export function createDropCeilingTexture(): THREE.CanvasTexture {
  const key = 'drop-ceiling-tile';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Off-white / light neutral acoustic drop ceiling tile surface
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle acoustic fissure/stipple pattern
  ctx.fillStyle = 'rgba(100, 116, 139, 0.22)';
  for (let i = 0; i < 280; i++) {
    const rx = ((i * 73) % 504) + 4;
    const ry = ((i * 127) % 504) + 4;
    ctx.fillRect(rx, ry, (i % 3) + 1, (i % 2) + 1);
  }

  // Flush recessed 2x4 LED / Fluorescent Troffer Light fixture in center of grid
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(136, 136, 240, 240);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(136, 136, 240, 240);
  // Troffer diffusers
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  for (let y = 160; y < 360; y += 32) {
    ctx.beginPath();
    ctx.moveTo(138, y);
    ctx.lineTo(374, y);
    ctx.stroke();
  }

  // Suspended metal T-bar grid lines (2x2 / 2x4 grid)
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  // Fine inner grid bevel
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.strokeRect(260, 4, 248, 248);
  ctx.strokeRect(4, 260, 248, 248);
  ctx.strokeRect(260, 260, 248, 248);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 8);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates glowing backlit marquee texture for an arcade machine
 */
export function createMarqueeTexture(
  title: string,
  bgColor: string,
  textColor: string,
  accentColor: string
): THREE.CanvasTexture {
  const key = `marquee-${title}-${bgColor}-${textColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 160);

  // Decorative inner border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);

  // Bold Arcade Typography
  ctx.fillStyle = textColor;
  const fontSize = title.length > 16 ? 34 : title.length > 10 ? 44 : 56;
  ctx.font = `900 ${fontSize}px Impact, Haettenschweiler, "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.toUpperCase(), 256, 82);

  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates retro CRT screen or pinball playfield texture
 */
export function createScreenTexture(
  category: string,
  screenColor: string,
  accentColor: string,
  title: string
): THREE.CanvasTexture {
  const key = `screen-${category}-${screenColor}-${title}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#050811';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = screenColor;
  ctx.fillRect(12, 12, 232, 232);

  if (category === 'pinball') {
    // Pinball playfield lanes, bumpers, flippers
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 90, 55, Math.PI, 0);
    ctx.stroke();

    // Glowing bumpers
    const bumperColors = ['#facc15', '#ef4444', '#22d3ee', '#e879f9'];
    [
      [95, 85],
      [160, 85],
      [128, 125],
    ].forEach(([bx, by], i) => {
      ctx.fillStyle = bumperColors[i % bumperColors.length];
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.fill();
    });

    // Flippers at bottom
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(75, 210);
    ctx.lineTo(115, 225);
    ctx.moveTo(181, 210);
    ctx.lineTo(141, 225);
    ctx.stroke();
  } else if (category === 'racing-cockpit' || title.toUpperCase().includes('MONACO')) {
    // Sky & road horizon
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(12, 12, 232, 110);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(12, 122, 232, 122);
    // Perspective road stripes
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(128, 122);
    ctx.lineTo(40, 244);
    ctx.moveTo(128, 122);
    ctx.lineTo(216, 244);
    ctx.stroke();

    if (title.toUpperCase().includes('MONACO')) {
      // Red and white Formula 1 curb rumble strips
      for (let i = 0; i < 6; i++) {
        const y = 135 + i * 18;
        const xL = 120 - i * 14;
        const xR = 136 + i * 14;
        ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#ffffff';
        ctx.fillRect(xL - 10, y, 10, 14);
        ctx.fillRect(xR, y, 10, 14);
      }
      // F1 HUD Tachometer / RPM gear indicator
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(20, 22, 216, 30);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(28, 30, 44, 12);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(76, 30, 44, 12);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(124, 30, 36, 12);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('6TH GEAR', 168, 40);
    }
  } else if (title.toUpperCase().includes('XYBOTS')) {
    // Authentic Xybots Split-Screen 3D Wireframe Corridor
    ctx.fillStyle = '#03172e';
    ctx.fillRect(12, 12, 232, 232);

    // Split-screen divider
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128, 12);
    ctx.lineTo(128, 244);
    ctx.stroke();

    // Player 1 3D Perspective Corridor (Left)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 30); ctx.lineTo(68, 75);
    ctx.moveTo(120, 30); ctx.lineTo(68, 75);
    ctx.moveTo(20, 160); ctx.lineTo(68, 115);
    ctx.moveTo(120, 160); ctx.lineTo(68, 115);
    ctx.rect(48, 75, 40, 40);
    ctx.stroke();
    // P1 Robot Avatar & HUD
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(68, 95, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('P1: 4200', 32, 190);

    // Player 2 3D Perspective Corridor (Right)
    ctx.strokeStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(136, 30); ctx.lineTo(188, 75);
    ctx.moveTo(236, 30); ctx.lineTo(188, 75);
    ctx.moveTo(136, 160); ctx.lineTo(188, 115);
    ctx.moveTo(236, 160); ctx.lineTo(188, 115);
    ctx.rect(168, 75, 40, 40);
    ctx.stroke();
    // P2 Robot Avatar & HUD
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(188, 95, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('P2: 3850', 152, 190);

    // Floor Energy / Key gauges
    ctx.fillStyle = '#10b981';
    ctx.fillRect(24, 210, 88, 6);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(144, 210, 88, 6);
  } else {
    // Classic retro arcade maze / pixel HUD
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, 204, 204);
    for (let y = 55; y < 200; y += 40) {
      ctx.strokeRect(48, y, 65, 20);
      ctx.strokeRect(140, y, 65, 20);
    }
    // Pac-Man / player sprite
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(128, 165, 11, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(128, 165);
    ctx.fill();
    // Ghosts / enemies
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(95, 105, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(160, 105, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Generates glowing neon wall sign texture
 */
export function createNeonSignTexture(text: string, color: string): THREE.CanvasTexture {
  const key = `neon-${text}-${color}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 16, 488, 96);

  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 42px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Builds a complete, scaled 3D arcade machine Group (1 unit = 1 meter = 1000 mm).
 * Machine local origin is at floor level (y = 0), centered at (x = 0, z = 0), facing +Z when rotationY = 0.
 */
export function buildArcadeCabinetGroup(
  machine: PlacedMachine,
  def: MachineDefinition | undefined,
  catalogMap: Map<string, MachineDefinition>,
  isSelected: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { instanceId: machine.instanceId };

  const dims = getMachineDimensions(machine, catalogMap);
  const w = dims.widthMm / 1000;
  const d = dims.depthMm / 1000;
  const h = dims.heightMm / 1000;

  const cabColor = machine.cabinetColor ?? def?.cabinetColor ?? '#eab308';
  const accentColor = machine.accentColor ?? def?.accentColor ?? '#ef4444';
  const marqueeTitle = machine.marqueeTitle ?? def?.marqueeTitle ?? machine.name;
  const marqueeBg = def?.marqueeBgColor ?? '#fef08a';
  const marqueeText = def?.marqueeTextColor ?? '#dc2626';
  const screenColor = def?.screenColor ?? '#1e3a8a';
  const category = def?.category ?? 'classic-upright';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: cabColor,
    roughness: 0.35,
    metalness: 0.15,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.5,
    metalness: 0.3,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.25,
    metalness: 0.4,
  });

  const marqueeTex = createMarqueeTexture(marqueeTitle, marqueeBg, marqueeText, accentColor);
  const marqueeMat = new THREE.MeshStandardMaterial({
    map: marqueeTex,
    emissive: new THREE.Color(marqueeBg),
    emissiveMap: marqueeTex,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  const screenTex = createScreenTexture(category, screenColor, accentColor, marqueeTitle);
  const screenMat = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: screenTex,
    emissiveIntensity: 0.8,
    roughness: 0.15,
  });

  if (category === 'pinball') {
    // 4 Chrome Legs
    const legH = h * 0.42;
    const legGeo = new THREE.CylinderGeometry(0.022, 0.018, legH, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.85,
      roughness: 0.2,
    });
    [
      [-w * 0.43, -d * 0.42],
      [w * 0.43, -d * 0.42],
      [-w * 0.43, d * 0.42],
      [w * 0.43, d * 0.42],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, legH / 2, lz);
      group.add(leg);
    });

    // Sloped Playfield Box
    const bodyH = h * 0.2;
    const playfieldBody = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d * 0.92), bodyMat);
    playfieldBody.position.set(0, legH + bodyH * 0.45, 0.02);
    playfieldBody.rotation.x = 0.11; // Sloped toward player (+Z)
    group.add(playfieldBody);

    // Illuminated Playfield Glass Top
    const glassMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.88, d * 0.84), screenMat);
    glassMesh.rotation.x = -Math.PI / 2 + 0.11;
    glassMesh.position.set(0, legH + bodyH * 0.96, 0.02);
    group.add(glassMesh);

    // Tall Backbox at Rear (-Z)
    const backboxH = h * 0.46;
    const backboxD = d * 0.22;
    const backbox = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, backboxH, backboxD), bodyMat);
    backbox.position.set(0, h - backboxH / 2, -d / 2 + backboxD / 2);
    group.add(backbox);

    // Glowing Backglass on front (+Z) of Backbox
    const backglass = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.94, backboxH * 0.82),
      marqueeMat
    );
    backglass.position.set(0, h - backboxH * 0.48, -d / 2 + backboxD + 0.006);
    group.add(backglass);
  } else if (category === 'racing-cockpit') {
    // Base Sled
    const sled = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), darkMat);
    sled.position.set(0, 0.08, 0);
    group.add(sled);

    // Front Monitor & Dashboard Tower (at -Z)
    const towerH = h * 0.82;
    const towerD = d * 0.45;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, towerH, towerD), bodyMat);
    tower.position.set(0, 0.16 + towerH / 2, -d / 2 + towerD / 2);
    group.add(tower);

    // Screen on Tower
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, towerH * 0.42), screenMat);
    screen.position.set(0, h * 0.56, -d / 2 + towerD + 0.008);
    group.add(screen);

    // Overhead Marquee Topper
    const topper = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.16), marqueeMat);
    topper.position.set(0, h * 0.88, -d / 2 + towerD + 0.01);
    group.add(topper);

    // Bucket Seat at Front (+Z)
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, 0.35, d * 0.32), trimMat);
    seatBase.position.set(0, 0.32, d * 0.22);
    group.add(seatBase);

    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.64, h * 0.48, 0.12), trimMat);
    seatBack.position.set(0, 0.68, d * 0.36);
    seatBack.rotation.x = -0.15;
    group.add(seatBack);
  } else if (category === 'novelty-rhythm') {
    // Dance Platform Pad or Skee-Ball
    const pad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d * 0.72), darkMat);
    pad.position.set(0, 0.075, d * 0.12);
    group.add(pad);

    // Glowing Dance Pads
    const arrowMat = new THREE.MeshStandardMaterial({
      color: '#ec4899',
      emissive: '#ec4899',
      emissiveIntensity: 0.75,
    });
    const arrowGeo = new THREE.PlaneGeometry(w * 0.35, d * 0.35);
    const leftPad = new THREE.Mesh(arrowGeo, arrowMat);
    leftPad.rotation.x = -Math.PI / 2;
    leftPad.position.set(-w * 0.24, 0.155, d * 0.14);
    group.add(leftPad);

    const rightPad = new THREE.Mesh(arrowGeo, screenMat);
    rightPad.rotation.x = -Math.PI / 2;
    rightPad.position.set(w * 0.24, 0.155, d * 0.14);
    group.add(rightPad);

    // Rear Speaker & Screen Tower
    const towerD = d * 0.26;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h, towerD), bodyMat);
    tower.position.set(0, h / 2, -d / 2 + towerD / 2);
    group.add(tower);

    const marquee = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.84, h * 0.15), marqueeMat);
    marquee.position.set(0, h * 0.88, -d / 2 + towerD + 0.01);
    group.add(marquee);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.56, h * 0.32), screenMat);
    screen.position.set(0, h * 0.58, -d / 2 + towerD + 0.01);
    group.add(screen);
  } else {
    // Classic Upright / Deluxe / 4-Player Cabinet
    // Lower pedestal base
    const lowerH = h * 0.52;
    const lowerBox = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, lowerH, d * 0.88), darkMat);
    lowerBox.position.set(0, lowerH / 2, -d * 0.04);
    group.add(lowerBox);

    // Left & Right Side Panels with Authentic Profile
    const sideThickness = 0.032;
    const sideGeo = new THREE.BoxGeometry(sideThickness, h, d * 0.92);
    const leftSide = new THREE.Mesh(sideGeo, bodyMat);
    leftSide.position.set(-w / 2 + sideThickness / 2, h / 2, -d * 0.02);
    group.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, bodyMat);
    rightSide.position.set(w / 2 - sideThickness / 2, h / 2, -d * 0.02);
    group.add(rightSide);

    // Colored T-Molding Front Trim
    const trimGeo = new THREE.BoxGeometry(0.018, h, 0.025);
    const leftTrim = new THREE.Mesh(trimGeo, trimMat);
    leftTrim.position.set(-w / 2 + 0.016, h / 2, d * 0.44);
    group.add(leftTrim);
    const rightTrim = new THREE.Mesh(trimGeo, trimMat);
    rightTrim.position.set(w / 2 - 0.016, h / 2, d * 0.44);
    group.add(rightTrim);

    // Upper Back Housing
    const upperH = h * 0.48;
    const upperBox = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.94, upperH, d * 0.65),
      darkMat
    );
    upperBox.position.set(0, lowerH + upperH / 2, -d * 0.14);
    group.add(upperBox);

    // Angled Backlit Marquee Sign at Top (+Z)
    const marqueeH = h * 0.13;
    const marqueePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.92, marqueeH),
      marqueeMat
    );
    marqueePlane.position.set(0, h - marqueeH * 0.62, d * 0.22);
    marqueePlane.rotation.x = 0.18;
    group.add(marqueePlane);

    // Recessed Angled CRT Screen
    const screenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.8, h * 0.26),
      screenMat
    );
    screenPlane.position.set(0, h * 0.67, d * 0.18);
    screenPlane.rotation.x = -0.28;
    group.add(screenPlane);

    // Control Panel Deck jutting forward (+Z)
    const cpWidth = category === 'four-player' ? w * 1.12 : w * 0.96;
    const cpBox = new THREE.Mesh(
      new THREE.BoxGeometry(cpWidth, 0.09, d * 0.34),
      trimMat
    );
    cpBox.position.set(0, lowerH + 0.02, d * 0.32);
    cpBox.rotation.x = 0.15;
    group.add(cpBox);

    // Joystick Red Ball Top
    const joyBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 12, 12),
      new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.2 })
    );
    joyBall.position.set(-w * 0.18, lowerH + 0.09, d * 0.34);
    group.add(joyBall);

    // Glowing Orange Coin Reject Buttons on Front Coin Door
    const coinSlotMat = new THREE.MeshStandardMaterial({
      color: '#f97316',
      emissive: '#f97316',
      emissiveIntensity: 0.9,
    });
    const coinLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.05), coinSlotMat);
    coinLeft.position.set(-0.045, lowerH * 0.55, d * 0.405);
    group.add(coinLeft);
    const coinRight = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.05), coinSlotMat);
    coinRight.position.set(0.045, lowerH * 0.55, d * 0.405);
    group.add(coinRight);
  }

  // Selection Ring on Floor if selected
  if (isSelected) {
    const ringGeo = new THREE.RingGeometry(
      Math.max(w, d) * 0.58,
      Math.max(w, d) * 0.65,
      32
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    group.add(ring);
  }

  // Position & rotate in 3D scene (1m = 1000mm)
  group.position.set(
    machine.position.x / 1000,
    machine.position.y / 1000,
    machine.position.z / 1000
  );
  group.rotation.y = (machine.rotationYDeg * Math.PI) / 180;

  return group;
}


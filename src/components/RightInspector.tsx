import React, { useState } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { CabinetThumb } from './CabinetThumb';
import {
  getMachineDimensions,
  getMachineFootprintBox,
  getWallOpenings,
} from '../utils/geometry';
import { OpeningType } from '../types/arcade';
import { NumericInput } from './NumericInput';
import {
  formatLength,
  formatMachineDimValue,
  getMachineDimUnitLabel,
  inchesToMm,
  parseMachineDimInput,
} from '../utils/units';
import {
  Copy,
  Eye,
  EyeOff,
  Layers,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
  Zap,
  Grid,
} from 'lucide-react';

export const RightInspector: React.FC = () => {
  const {
    project,
    viewMode,
    selectedMachineIds,
    selectedWallId,
    selectedOpeningId,
    selectMachine,
    selectWall,
    setMachineRotation,
    rotateSelectedMachines,
    updateMachineProps,
    duplicateSelected,
    cloneMachineRow,
    deleteSelected,
    deleteWallSegment,
    updateWallSegment,
    addWallOpening,
    updateWallOpening,
    deleteWallOpening,
    toggleLayerVisibility,
    addLayer,
    updateSettings,
    getCatalogMap,
  } = useArcadeStore();

  const [showClonePopover, setShowClonePopover] = useState(false);
  const [cloneCount, setCloneCount] = useState(4);
  const [cloneSpacingIn, setCloneSpacingIn] = useState(2);
  const [cloneDir, setCloneDir] = useState<'right' | 'down' | 'left' | 'up'>('right');
  const [newLayerName, setNewLayerName] = useState('');
  const [addingLayer, setAddingLayer] = useState(false);

  // Hide right inspector during immersive First-Person Walkthrough / Flythrough
  if (viewMode === '3d-walk' || viewMode === '3d-fly') {
    return null;
  }

  const catalogMap = getCatalogMap();
  const { unitSystem, unitDisplay } = project.settings;
  const dimUnit = getMachineDimUnitLabel(unitSystem, unitDisplay);

  const selectedMachines = project.placedMachines.filter((m) =>
    selectedMachineIds.includes(m.instanceId)
  );
  const primaryMachine = selectedMachines[0] ?? null;
  const primaryDef = primaryMachine
    ? catalogMap.get(primaryMachine.definitionId)
    : undefined;
  const primaryDims = primaryMachine
    ? getMachineDimensions(primaryMachine, catalogMap)
    : null;

  const selectedWall = selectedWallId
    ? project.floorPlan.walls.find((w) => w.id === selectedWallId)
    : null;

  // Handle interactive click on the 360° Rotation Dial
  const handleWheelClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!primaryMachine) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;
    // Angle in degrees (0 deg = South/Down, 90 deg = East/Right, 180 = North/Up, 270 = West/Left)
    const rawDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
    const snappedDeg = ((Math.round(rawDeg / 15) * 15) % 360 + 360) % 360;
    setMachineRotation(primaryMachine.instanceId, snappedDeg);
  };

  // Compute group / row metrics when multiple machines are selected or in 3D Orbit
  const totalSelectedPowerKw =
    selectedMachines.reduce((sum, m) => {
      const def = catalogMap.get(m.definitionId);
      return sum + (m.powerWatts ?? def?.powerWatts ?? 250);
    }, 0) / 1000;

  let groupSpanMm = 0;
  if (selectedMachines.length > 0) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const m of selectedMachines) {
      const b = getMachineFootprintBox(m, catalogMap);
      minX = Math.min(minX, b.minX);
      maxX = Math.max(maxX, b.maxX);
      minZ = Math.min(minZ, b.minZ);
      maxZ = Math.max(maxZ, b.maxZ);
    }
    groupSpanMm = Math.max(maxX - minX, maxZ - minZ);
  }

  return (
    <aside className="w-72 h-full bg-[#0d1526] border-l border-slate-800 flex flex-col select-none z-20">
      {/* Top Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
          {selectedWall ? 'WALL INSPECTOR' : 'MACHINE INSPECTOR'}
        </span>
        <span className="text-[10px] font-mono text-cyan-400">
          {selectedMachines.length > 1
            ? `${selectedMachines.length} Selected`
            : primaryMachine
              ? `#${primaryMachine.instanceId.slice(-4)}`
              : 'Ready'}
        </span>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* CASE 1: A Wall Segment (or Door/Window Opening) is Selected */}
        {selectedWall && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="text-xs font-semibold text-cyan-300 flex items-center justify-between">
                <span>Wall ({selectedWall.id})</span>
                <span className="font-mono text-slate-200">
                  {formatLength(
                    Math.hypot(
                      selectedWall.end.x - selectedWall.start.x,
                      selectedWall.end.y - selectedWall.start.y
                    ),
                    unitDisplay
                  )}
                </span>
              </div>

              {/* Quick Add Door / Window Buttons */}
              <div className="pt-1 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Add Doors & Windows
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => addWallOpening(selectedWall.id, 'single-door', 0.5)}
                    className="py-1.5 px-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-[11px] font-semibold text-emerald-200 transition"
                  >
                    + Door
                  </button>
                  <button
                    onClick={() => addWallOpening(selectedWall.id, 'double-door', 0.5)}
                    className="py-1.5 px-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-[11px] font-semibold text-emerald-200 transition"
                  >
                    + Double
                  </button>
                  <button
                    onClick={() => addWallOpening(selectedWall.id, 'window', 0.5)}
                    className="py-1.5 px-2 rounded-lg bg-sky-950/70 hover:bg-sky-900/80 border border-sky-500/40 text-[11px] font-semibold text-sky-200 transition"
                  >
                    + Window
                  </button>
                </div>
              </div>
            </div>

            {/* List of Doors & Windows on this Wall */}
            {(() => {
              const openings = getWallOpenings(selectedWall);
              if (openings.length === 0) {
                return (
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/70 text-[11px] text-slate-400 text-center">
                    No doors or windows on this wall yet. Use the buttons above or the left toolbar to add one.
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Openings on Wall ({openings.length})
                  </div>
                  {openings.map((op, idx) => {
                    const isFocused = selectedOpeningId === op.id;
                    const wVal = formatMachineDimValue(op.widthMm, unitSystem, unitDisplay);
                    return (
                      <div
                        key={op.id}
                        onClick={() => selectWall(selectedWall.id, op.id)}
                        className={`p-2.5 rounded-xl border space-y-2 transition cursor-pointer ${
                          isFocused
                            ? 'bg-slate-900 border-cyan-500/70 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <select
                            value={op.type}
                            onChange={(e) => {
                              const nextType = e.target.value as OpeningType;
                              updateWallOpening(selectedWall.id, op.id, {
                                type: nextType,
                                sillHeightMm: nextType === 'window' ? inchesToMm(36) : 0,
                              });
                            }}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-semibold text-cyan-300"
                          >
                            <option value="single-door">Single Door #{idx + 1}</option>
                            <option value="double-door">Double Door #{idx + 1}</option>
                            <option value="window">Window #{idx + 1}</option>
                          </select>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWallOpening(selectedWall.id, op.id);
                            }}
                            title="Remove Opening"
                            className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Position Along Wall Slider */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Wall Position:</span>
                            <span className="font-mono text-slate-200">
                              {Math.round(op.offsetRatio * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={92}
                            value={Math.round(op.offsetRatio * 100)}
                            onChange={(e) =>
                              updateWallOpening(selectedWall.id, op.id, {
                                offsetRatio: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full accent-cyan-500 cursor-pointer"
                          />
                        </div>

                        {/* Width & Swing Controls */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-slate-400">Width ({dimUnit}):</span>
                          <NumericInput
                            min={unitSystem === 'imperial' ? 6 : 15}
                            max={unitSystem === 'imperial' ? 360 : 900}
                            step={unitSystem === 'imperial' ? 1 : 5}
                            value={parseFloat(wVal)}
                            onChange={(num) => {
                              updateWallOpening(selectedWall.id, op.id, {
                                widthMm: parseMachineDimInput(num, unitSystem, unitDisplay),
                              });
                            }}
                            className="w-20 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-right font-mono text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                          />
                        </div>

                        {op.type !== 'window' && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Door Swing:</span>
                            <button
                              onClick={() =>
                                updateWallOpening(selectedWall.id, op.id, {
                                  swingDirection:
                                    op.swingDirection === 'outward' ? 'inward' : 'outward',
                                })
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700"
                            >
                              {op.swingDirection === 'outward' ? 'Outward Swing' : 'Inward Swing'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <button
              onClick={() => deleteWallSegment(selectedWall.id)}
              className="w-full py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 text-xs font-semibold text-rose-200 flex items-center justify-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Entire Wall Segment</span>
            </button>
          </div>
        )}

        {/* CASE 2: One or More Arcade Machines Selected */}
        {!selectedWall && primaryMachine && primaryDims && (
          <>
            {/* Machine Selector Dropdown */}
            <div>
              <select
                value={primaryMachine.instanceId}
                onChange={(e) => selectMachine(e.target.value, false)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {project.placedMachines.map((m) => (
                  <option key={m.instanceId} value={m.instanceId}>
                    {m.label} — {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Isometric Preview Box */}
            {primaryDef && (
              <div className="flex flex-col items-center justify-center py-3 rounded-xl bg-slate-950/80 border border-slate-800/90 relative">
                <CabinetThumb
                  definition={{
                    ...primaryDef,
                    cabinetColor: primaryMachine.cabinetColor ?? primaryDef.cabinetColor,
                    marqueeTitle: primaryMachine.marqueeTitle ?? primaryDef.marqueeTitle,
                  }}
                  size="lg"
                />
                {selectedMachines.length > 1 && (
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] text-cyan-300 font-semibold">
                    Row / Group ({selectedMachines.length} Cabinets)
                  </span>
                )}
              </div>
            )}

            {/* ID, Label, Position & Power Metrics */}
            <div className="space-y-1.5 text-xs bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Label / Tag:</span>
                <input
                  type="text"
                  value={primaryMachine.label}
                  onChange={(e) =>
                    updateMachineProps(primaryMachine.instanceId, { label: e.target.value })
                  }
                  className="w-24 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-right font-mono text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Position:</span>
                <span className="font-mono text-slate-200">
                  ({formatLength(primaryMachine.position.x, unitDisplay)},{' '}
                  {formatLength(primaryMachine.position.z, unitDisplay)})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Power Load:
                </span>
                <span className="font-mono text-amber-300">
                  {totalSelectedPowerKw.toFixed(2)} kW
                </span>
              </div>

              {selectedMachines.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Row Span Width:</span>
                  <span className="font-mono text-cyan-300">
                    {formatLength(groupSpanMm, unitDisplay)}
                  </span>
                </div>
              )}
            </div>

            {/* Physical Dimensions (Width, Depth, Height, Clearance) */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Dimensions ({dimUnit})
              </div>

              {[
                { label: 'Width:', key: 'widthMm' as const, valMm: primaryDims.widthMm },
                { label: 'Depth:', key: 'depthMm' as const, valMm: primaryDims.depthMm },
                { label: 'Height:', key: 'heightMm' as const, valMm: primaryDims.heightMm },
                {
                  label: 'Clearance:',
                  key: 'playerClearanceMm' as const,
                  valMm: primaryDims.playerClearanceMm,
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <label className="text-xs text-slate-400">{item.label}</label>
                  <div className="flex items-center bg-slate-950 border border-slate-700/90 rounded-lg px-2 py-1 w-36">
                    <NumericInput
                      min={unitSystem === 'imperial' ? 4 : 10}
                      max={unitSystem === 'imperial' ? 400 : 1000}
                      step={unitSystem === 'imperial' ? 0.5 : unitDisplay === 'meters' ? 0.05 : 1}
                      value={parseFloat(formatMachineDimValue(item.valMm, unitSystem, unitDisplay))}
                      onChange={(num) => {
                        const newMm = parseMachineDimInput(num, unitSystem, unitDisplay);
                        updateMachineProps(primaryMachine.instanceId, {
                          customDimensions: {
                            widthMm: primaryDims.widthMm,
                            depthMm: primaryDims.depthMm,
                            heightMm: primaryDims.heightMm,
                            playerClearanceMm: primaryDims.playerClearanceMm,
                            [item.key]: newMm,
                          },
                        });
                      }}
                      className="w-full bg-transparent text-xs font-mono text-slate-100 focus:outline-none"
                    />
                    <span className="text-[11px] font-mono text-slate-400 ml-1">
                      {dimUnit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Marquee & Cabinet Color */}
            <div className="grid grid-cols-3 gap-2 items-center">
              <div className="col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                  3D Marquee Title
                </label>
                <input
                  type="text"
                  value={primaryMachine.marqueeTitle ?? primaryDef?.marqueeTitle ?? ''}
                  onChange={(e) =>
                    updateMachineProps(primaryMachine.instanceId, {
                      marqueeTitle: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={primaryMachine.cabinetColor ?? primaryDef?.cabinetColor ?? '#eab308'}
                  onChange={(e) =>
                    updateMachineProps(primaryMachine.instanceId, {
                      cabinetColor: e.target.value,
                    })
                  }
                  className="w-full h-7 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Interactive 360° Rotation Wheel (matching mockup #1) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  2D / 3D Orientation
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => rotateSelectedMachines(-90)}
                    title="Rotate -90°"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => rotateSelectedMachines(90)}
                    title="Rotate +90°"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center py-1">
                <svg
                  width={108}
                  height={108}
                  viewBox="0 0 108 108"
                  onClick={handleWheelClick}
                  className="cursor-pointer select-none"
                >
                  {/* Crosshairs */}
                  <line x1="54" y1="6" x2="54" y2="102" stroke="#1e293b" strokeWidth="1.5" />
                  <line x1="6" y1="54" x2="102" y2="54" stroke="#1e293b" strokeWidth="1.5" />
                  {/* Outer dial ring */}
                  <circle
                    cx="54"
                    cy="54"
                    r="38"
                    fill="rgba(15, 23, 42, 0.9)"
                    stroke="#38bdf8"
                    strokeWidth="2"
                  />
                  {/* Inner dial ring */}
                  <circle
                    cx="54"
                    cy="54"
                    r="24"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  {/* Direction indicator dot on wheel */}
                  {(() => {
                    const rad = (primaryMachine.rotationYDeg * Math.PI) / 180;
                    const ix = 54 + Math.sin(rad) * 38;
                    const iy = 54 + Math.cos(rad) * 38;
                    return (
                      <>
                        <line
                          x1="54"
                          y1="54"
                          x2={ix}
                          y2={iy}
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <circle cx={ix} cy={iy} r="5" fill="#22d3ee" />
                      </>
                    );
                  })()}
                  {/* Center Degree Text */}
                  <text
                    x="54"
                    y="58"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="bold"
                    fill="#f8fafc"
                  >
                    {primaryMachine.rotationYDeg}°
                  </text>
                </svg>
              </div>
            </div>

            {/* Action Buttons: Duplicate | Clone | Delete (matching mockup #1) */}
            <div className="space-y-2 pt-1 relative">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={duplicateSelected}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-xs font-semibold text-slate-100 flex items-center justify-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duplicate</span>
                </button>

                <button
                  onClick={() => setShowClonePopover((v) => !v)}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600/80 text-xs font-semibold text-slate-100 flex items-center justify-center gap-1.5 transition"
                >
                  <Grid className="w-3.5 h-3.5 text-purple-400" />
                  <span>Clone Row</span>
                </button>
              </div>

              {/* Linear Row Clone Popover */}
              {showClonePopover && (
                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/50 shadow-2xl space-y-2.5 text-xs">
                  <div className="font-semibold text-cyan-300 flex items-center justify-between">
                    <span>Linear Row Cloner</span>
                    <button
                      onClick={() => setShowClonePopover(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Copies to Add:</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={cloneCount}
                      onChange={(e) => setCloneCount(Math.max(1, Number(e.target.value)))}
                      className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-right font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Gap Spacing (in):</span>
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={cloneSpacingIn}
                      onChange={(e) => setCloneSpacingIn(Math.max(0, Number(e.target.value)))}
                      className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-right font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Direction:</span>
                    <select
                      value={cloneDir}
                      onChange={(e) => setCloneDir(e.target.value as any)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                    >
                      <option value="right">East (+X)</option>
                      <option value="down">South (+Y)</option>
                      <option value="left">West (-X)</option>
                      <option value="up">North (-Y)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      cloneMachineRow(
                        primaryMachine.instanceId,
                        cloneCount,
                        inchesToMm(cloneSpacingIn),
                        cloneDir
                      );
                      setShowClonePopover(false);
                    }}
                    className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition"
                  >
                    Create {cloneCount} Clones
                  </button>
                </div>
              )}

              <button
                onClick={deleteSelected}
                className="w-full py-1.5 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-xs font-semibold text-rose-200 flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </>
        )}

        {/* CASE 3: Nothing selected */}
        {!selectedWall && !primaryMachine && (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center space-y-2">
            <div className="text-xs font-semibold text-slate-300">No Machine Selected</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Click any arcade machine on the floor plan (or drag one from the left library) to inspect and edit its dimensions, orientation, or clearance.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Layers Panel (matching mockup #1 & #3) */}
      <div className="p-3 border-t border-slate-800 bg-[#0a101d] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Layers</span>
          </span>
          <button
            onClick={() => setAddingLayer((v) => !v)}
            title="Add New Layer"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {addingLayer && (
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Layer name..."
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100"
            />
            <button
              onClick={() => {
                if (newLayerName.trim()) {
                  addLayer(newLayerName.trim());
                  setNewLayerName('');
                  setAddingLayer(false);
                }
              }}
              className="px-2.5 py-1 rounded bg-cyan-600 text-xs font-semibold text-white"
            >
              Add
            </button>
          </div>
        )}

        <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
          {project.layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => toggleLayerVisibility(layer.id)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs transition"
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                <span
                  className={
                    layer.visible ? 'text-slate-200 font-medium truncate' : 'text-slate-500 line-through truncate'
                  }
                >
                  {layer.name}
                </span>
              </span>
              {layer.visible ? (
                <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
            </button>
          ))}

          {/* Built-in Overlay Toggles */}
          <button
            onClick={() =>
              updateSettings({
                showClearanceZones: !project.settings.showClearanceZones,
              })
            }
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/70 text-xs transition"
          >
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Player Clearance Zones</span>
            </span>
            <input
              type="checkbox"
              checked={project.settings.showClearanceZones}
              readOnly
              className="accent-purple-500 pointer-events-none"
            />
          </button>

          <button
            onClick={() =>
              updateSettings({
                lightingMode:
                  project.settings.lightingMode === 'arcade-night'
                    ? 'work-daylight'
                    : 'arcade-night',
              })
            }
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/70 text-xs transition"
          >
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>
                Lights ({project.settings.lightingMode === 'arcade-night' ? 'NEON ON' : 'DAYLIGHT'})
              </span>
            </span>
            <input
              type="checkbox"
              checked={project.settings.lightingMode === 'arcade-night'}
              readOnly
              className="accent-cyan-500 pointer-events-none"
            />
          </button>
        </div>
      </div>
    </aside>
  );
};


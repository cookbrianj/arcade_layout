import React from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { computeRoomMetrics } from '../utils/geometry';
import { formatArea, formatGridSize, formatLength } from '../utils/units';
import { Zap } from 'lucide-react';

export const BottomStatusBar: React.FC = () => {
  const {
    project,
    viewMode,
    cursorWorldMm,
    orbitStats,
    lastSavedTime,
    getCatalogMap,
  } = useArcadeStore();

  const catalogMap = getCatalogMap();
  const { unitSystem, unitDisplay, gridSizeMm } = project.settings;

  const roomMetrics = computeRoomMetrics(project.floorPlan.walls);
  const primaryAreaStr = formatArea(roomMetrics.areaMm2, unitSystem);
  const secondaryAreaStr = formatArea(
    roomMetrics.areaMm2,
    unitSystem === 'imperial' ? 'metric' : 'imperial'
  );

  // Inventory breakdown by category
  let arcadeCount = 0;
  let pinballCount = 0;
  let racerCount = 0;
  let danceOr4PCount = 0;
  let totalWatts = 0;

  for (const m of project.placedMachines) {
    const def = catalogMap.get(m.definitionId);
    const cat = def?.category ?? 'classic-upright';
    if (cat === 'pinball') pinballCount++;
    else if (cat === 'racing-cockpit') racerCount++;
    else if (cat === 'novelty-rhythm' || cat === 'four-player') danceOr4PCount++;
    else arcadeCount++;

    totalWatts += m.powerWatts ?? def?.powerWatts ?? 250;
  }

  const totalKw = (totalWatts / 1000).toFixed(1);

  return (
    <footer className="h-8 bg-[#090e1a] border-t border-slate-800 px-3.5 flex items-center justify-between text-[11px] text-slate-400 select-none z-30">
      {/* Left: Room Area, Placed Machine Breakdown & Power Load */}
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
        <div>
          <span className="text-slate-500">Total Room Area: </span>
          <span className="font-mono text-slate-200 font-semibold">{primaryAreaStr}</span>
          <span className="text-slate-500 ml-1">({secondaryAreaStr})</span>
        </div>

        <span className="text-slate-700">|</span>

        <div>
          <span className="text-slate-500">Placed Machines: </span>
          <span className="font-mono text-cyan-300 font-semibold">
            {project.placedMachines.length}
          </span>
          <span className="text-slate-500 ml-1 hidden sm:inline">
            (Arcade: {arcadeCount}, Pinball: {pinballCount}, Racer: {racerCount}, 4P/Dance:{' '}
            {danceOr4PCount})
          </span>
        </div>

        <span className="text-slate-700 hidden md:inline">|</span>

        <div className="hidden md:flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-slate-500">Venue Load:</span>
          <span className="font-mono text-amber-300 font-semibold">{totalKw} kW</span>
        </div>

        <span className="text-slate-700 hidden lg:inline">|</span>

        <div className="hidden lg:block">
          <span className="text-slate-500">Grid: </span>
          <span className="font-mono text-slate-300">
            {formatGridSize(gridSizeMm, unitSystem)} (
            {unitSystem === 'imperial' ? 'Imperial' : 'Metric'})
          </span>
        </div>
      </div>

      {/* Right: Cursor Coordinates, Auto-Saved Time, Zoom & View Mode */}
      <div className="flex items-center gap-3 whitespace-nowrap">
        {viewMode === '2d-cad' && (
          <div className="hidden sm:block font-mono text-slate-300">
            Cursor: X: {formatLength(cursorWorldMm.x, unitDisplay)}, Y:{' '}
            {formatLength(cursorWorldMm.z, unitDisplay)}
          </div>
        )}

        <span className="text-slate-700 hidden sm:inline">|</span>

        <div className="font-mono text-slate-400">Auto-Saved {lastSavedTime}</div>

        <span className="text-slate-700">|</span>

        <div className="font-mono text-slate-300">Zoom: {orbitStats.zoomPercent}%</div>

        <span className="text-slate-700 hidden xl:inline">|</span>

        <div className="hidden xl:flex items-center gap-1.5">
          <span className="text-slate-500">View Mode:</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-medium text-[10px]">
            {viewMode === '2d-cad'
              ? 'CAD Blueprint'
              : project.settings.lightingMode === 'arcade-night'
                ? 'High-Detail Lit'
                : 'Daylight Studio'}
          </span>
        </div>
      </div>
    </footer>
  );
};


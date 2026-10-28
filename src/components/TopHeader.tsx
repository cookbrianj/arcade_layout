import React, { useRef, useState } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { formatGridSize } from '../utils/units';
import {
  Box,
  Check,
  Download,
  Footprints,
  FolderOpen,
  Grid,
  History,
  LayoutGrid,
  Plane,
  Redo2,
  RotateCcw,
  Sliders,
  Undo2,
} from 'lucide-react';
import { UnitDisplay } from '../types/arcade';

interface TopHeaderProps {
  onOpenRoomModal: () => void;
  onOpenCustomMachineModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenRoomModal,
}) => {
  const {
    project,
    viewMode,
    setViewMode,
    toggleUnitSystem,
    setUnitSystemAndDisplay,
    updateSettings,
    undo,
    redo,
    past,
    future,
    autoSaveState,
    lastSavedTime,
    orbitStats,
    revisions,
    restoreRevision,
    resetToShowcaseProject,
    importProjectJson,
    setProjectName,
  } = useArcadeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const { settings } = project;

  const handleExportProject = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.href = url;
    a.download = `${safeName || 'arcade-layout'}.arcade.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowFileMenu(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content === 'string') {
        importProjectJson(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowFileMenu(false);
  };

  const handleUnitDisplayChange = (display: UnitDisplay) => {
    const sys = display === 'inches' || display === 'feet-inches' ? 'imperial' : 'metric';
    setUnitSystemAndDisplay(sys, display);
  };

  return (
    <header className="h-13 bg-[#0d1526] border-b border-slate-800 px-3 flex items-center justify-between gap-2 select-none z-30">
      {/* Left: Brand Logo, Project Menu & Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative">
          <button
            onClick={() => setShowFileMenu((v) => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-100 transition"
          >
            <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center font-black text-[11px] text-slate-950">
              A
            </div>
            <span className="font-bold tracking-wide text-xs sm:text-sm whitespace-nowrap">
              ARCADE LAYOUT STUDIO
            </span>
          </button>

          {showFileMenu && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-800">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Project Name
                </div>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={() => {
                  setShowFileMenu(false);
                  onOpenRoomModal();
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Room Dimensions & Presets...</span>
              </button>

              <button
                onClick={handleExportProject}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Project (.arcade.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Import Project File...</span>
              </button>

              {revisions.length > 0 && (
                <div className="border-t border-slate-800 mt-1 pt-1">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <History className="w-3 h-3" />
                    <span>Auto-Save Revisions (Last 3)</span>
                  </div>
                  {revisions.map((rev, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        restoreRevision(idx);
                        setShowFileMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-800 text-[11px] text-slate-300 flex items-center justify-between"
                    >
                      <span>Rev #{idx + 1}</span>
                      <span className="text-slate-400 font-mono">{rev.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    resetToShowcaseProject();
                    setShowFileMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default Showcase Venue</span>
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.arcade"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {/* Mode Switcher Tabs (2D FLOOR PLAN | 3D ORBIT | 3D WALKTHROUGH | 3D FLY) */}
        <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('2d-cad')}
            className={`flex items-center gap-1.5 px-2.5 py-1.2 rounded-md text-xs font-semibold transition ${
              viewMode === '2d-cad'
                ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>2D FLOOR PLAN</span>
          </button>

          <button
            onClick={() => setViewMode('3d-orbit')}
            className={`flex items-center gap-1.5 px-2.5 py-1.2 rounded-md text-xs font-semibold transition ${
              viewMode === '3d-orbit'
                ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D ORBIT</span>
          </button>

          <button
            onClick={() => setViewMode('3d-walk')}
            className={`flex items-center gap-1.5 px-2.5 py-1.2 rounded-md text-xs font-semibold transition ${
              viewMode === '3d-walk'
                ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>3D WALKTHROUGH</span>
          </button>

          <button
            onClick={() => setViewMode('3d-fly')}
            className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.2 rounded-md text-xs font-semibold transition ${
              viewMode === '3d-fly'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>3D FLY</span>
          </button>
        </div>
      </div>

      {/* Center: Unit Switcher + Snapping / Camera Readout */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Unit Selector & Quick Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
          <span className="text-slate-400 font-medium">UNITS:</span>
          <select
            value={settings.unitDisplay}
            onChange={(e) => handleUnitDisplayChange(e.target.value as UnitDisplay)}
            className="bg-slate-950 text-cyan-300 font-semibold px-1.5 py-0.5 rounded border border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="feet-inches">Feet / Inches (ft &apos; in &quot;)</option>
            <option value="inches">Inches Only (in)</option>
            <option value="meters">Meters (m)</option>
            <option value="cm">Centimeters (cm)</option>
          </select>
          <button
            onClick={toggleUnitSystem}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-600/70 transition"
          >
            Toggle to {settings.unitSystem === 'imperial' ? 'Metric' : 'Imperial'}
          </button>
        </div>

        {/* 2D Snap Controls OR 3D Orbit Camera Readout */}
        {viewMode === '2d-cad' ? (
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Snap:</span>
            <button
              onClick={() => updateSettings({ snapToGrid: !settings.snapToGrid })}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                settings.snapToGrid
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Grid ({formatGridSize(settings.gridSizeMm, settings.unitSystem)})
            </button>
            <button
              onClick={() => updateSettings({ snapToObjects: !settings.snapToObjects })}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                settings.snapToObjects
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Object
            </button>
            <button
              onClick={() => updateSettings({ snapToWalls: !settings.snapToWalls })}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                settings.snapToWalls
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Edge
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1 text-xs text-slate-300">
            <span className="text-slate-400">Camera:</span>
            <span className="font-mono text-cyan-300">
              Altitude ({orbitStats.altitudeM}m) - Angle ({orbitStats.angleDeg}°)
            </span>
          </div>
        )}
      </div>

      {/* Right: Undo/Redo & Live Auto-Save Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={undo}
            disabled={past.length === 0}
            title="Undo (Cmd/Ctrl+Z)"
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300 transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            title="Redo (Cmd/Ctrl+Shift+Z)"
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300 transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Auto-Saved Status Pill */}
        <div
          title={`Continuously saved to local storage • Last saved at ${lastSavedTime}`}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{autoSaveState === 'saving' ? 'Saving...' : 'Auto-Saved'}</span>
        </div>
      </div>
    </header>
  );
};


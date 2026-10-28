import React, { useState } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { CabinetThumb } from './CabinetThumb';
import { formatMachineDimValue, getMachineDimUnitLabel } from '../utils/units';
import {
  ChevronDown,
  ChevronRight,
  Columns2,
  Compass,
  DoorOpen,
  Lightbulb,
  MousePointer,
  PenTool,
  Plus,
  RotateCw,
  Ruler,
  Search,
  Settings,
  ShieldAlert,
  Square,
  Sparkles,
} from 'lucide-react';
import { FloorMaterial, MachineCategory } from '../types/arcade';

interface LeftSidebarProps {
  onOpenCustomMachineModal: () => void;
  onOpenRoomModal: () => void;
}

const CATEGORY_GROUPS: Array<{ key: MachineCategory | 'upright-group'; title: string }> = [
  { key: 'upright-group', title: 'CLASSIC UPRIGHT' },
  { key: 'pinball', title: 'PINBALL' },
  { key: 'racing-cockpit', title: 'RACING COCKPIT' },
  { key: 'four-player', title: '4-PLAYER' },
  { key: 'novelty-rhythm', title: 'NOVELTY / RHYTHM' },
  { key: 'custom', title: 'CUSTOM MACHINES' },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onOpenCustomMachineModal,
  onOpenRoomModal,
}) => {
  const {
    project,
    viewMode,
    activeTool,
    setActiveTool,
    addMachineFromCatalog,
    rotateSelectedMachines,
    updateSettings,
    setFloorMaterial,
    getAllCatalog,
  } = useArcadeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const allCatalog = getAllCatalog();
  const { unitSystem, unitDisplay, showClearanceZones, lightingMode } = project.settings;
  const unitLabel = getMachineDimUnitLabel(unitSystem, unitDisplay);

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, defId: string) => {
    e.dataTransfer.setData('text/arcade-definition-id', defId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const cycleFloorMaterial = () => {
    const order: FloorMaterial[] = ['neon-carpet', 'polished-concrete', 'wood', 'grid'];
    const next = order[(order.indexOf(project.floorPlan.material) + 1) % order.length];
    setFloorMaterial(next);
  };

  // In 3D Walkthrough / Flythrough, hide the left CAD sidebar so the 3D viewport is full-screen immersive (like mockup #2)
  if (viewMode === '3d-walk' || viewMode === '3d-fly') {
    return null;
  }

  return (
    <aside className="flex h-full bg-[#0d1526] border-r border-slate-800 select-none z-20">
      {/* Far-Left Vertical CAD Tool Rail (matching mockup #1) */}
      {viewMode === '2d-cad' && (
        <div className="w-11 bg-[#090f1d] border-r border-slate-800/90 flex flex-col items-center py-2.5 gap-2">
          <button
            onClick={() => setActiveTool('select')}
            title="Select & Move Tool (V)"
            className={`p-2 rounded-lg transition ${
              activeTool === 'select'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('draw-wall')}
            title="Draw Custom Wall Segment"
            className={`p-2 rounded-lg transition ${
              activeTool === 'draw-wall'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('draw-rect')}
            title="Draw Rectangular Room"
            className={`p-2 rounded-lg transition ${
              activeTool === 'draw-rect'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('add-door')}
            title="Add Door to Wall (Click any wall; Shift+Click for Double Door)"
            className={`p-2 rounded-lg transition ${
              activeTool === 'add-door'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('add-window')}
            title="Add Window to Wall (Click any wall)"
            className={`p-2 rounded-lg transition ${
              activeTool === 'add-window'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('measure')}
            title="Measure Distance Tape"
            className={`p-2 rounded-lg transition ${
              activeTool === 'measure'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-slate-800 my-1" />

          <button
            onClick={() => updateSettings({ showClearanceZones: !showClearanceZones })}
            title="Toggle Player Clearance Zones"
            className={`p-2 rounded-lg transition ${
              showClearanceZones
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          <button
            onClick={cycleFloorMaterial}
            title={`Floor Material: ${project.floorPlan.material} (Click to cycle)`}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-cyan-300 transition"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <div className="mt-auto flex flex-col items-center gap-2">
            <button
              onClick={onOpenRoomModal}
              title="Room Dimensions & Floor Settings"
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Left Panel: either 3D Orbit Quick Toolbar + Catalog OR 2D Arcade Machine Library */}
      <div className="w-60 flex flex-col h-full">
        {/* In 3D Orbit Mode, show quick-action buttons at top matching mockup #3 */}
        {viewMode === '3d-orbit' && (
          <div className="p-2.5 border-b border-slate-800 space-y-1.5 bg-[#0a101d]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              3D Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => rotateSelectedMachines(90)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rotate 90°</span>
              </button>
              <button
                onClick={() =>
                  updateSettings({
                    lightingMode:
                      lightingMode === 'arcade-night' ? 'work-daylight' : 'arcade-night',
                  })
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Lighting</span>
              </button>
              <button
                onClick={cycleFloorMaterial}
                className="col-span-2 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition"
              >
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  <span>Floor Surface</span>
                </span>
                <span className="text-[10px] font-mono uppercase text-cyan-300">
                  {project.floorPlan.material.replace('-', ' ')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Header & Search */}
        <div className="p-3 border-b border-slate-800">
          <div className="text-xs font-semibold text-slate-200 mb-2 flex items-center justify-between">
            <span>Arcade Machine Library</span>
            <span className="text-[10px] font-mono text-slate-400">
              {allCatalog.length} presets
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search machines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        </div>

        {/* Scrollable Categorized Machine Grid (2 columns matching mockup #1) */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
          {CATEGORY_GROUPS.map((group) => {
            const items = allCatalog.filter((def) => {
              const matchesSearch =
                !searchQuery.trim() ||
                def.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                def.shortTag.toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesSearch) return false;
              if (group.key === 'upright-group') {
                return (
                  def.category === 'classic-upright' ||
                  def.category === 'deluxe-widebody'
                );
              }
              return def.category === group.key;
            });

            if (items.length === 0) return null;
            const isCollapsed = !!collapsed[group.key];

            return (
              <div key={group.key} className="space-y-1.5">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-bold tracking-wider text-slate-300 hover:text-white transition"
                >
                  <span>{group.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((def) => {
                      const wVal = formatMachineDimValue(def.widthMm, unitSystem, unitDisplay);
                      const dVal = formatMachineDimValue(def.depthMm, unitSystem, unitDisplay);
                      return (
                        <div
                          key={def.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, def.id)}
                          onClick={() => addMachineFromCatalog(def.id)}
                          title={`Drag onto floor or click to place ${def.name} (${wVal}×${dVal} ${unitLabel})`}
                          className="group flex flex-col items-center p-2 rounded-xl bg-slate-900/90 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/60 cursor-grab active:cursor-grabbing transition shadow-sm"
                        >
                          <div className="h-14 flex items-center justify-center">
                            <CabinetThumb definition={def} size="md" />
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-slate-200 group-hover:text-cyan-200 text-center line-clamp-1 w-full">
                            {def.name.replace(/\s*\(.*?\)\s*/g, '')}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            {wVal}×{dVal} {unitLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Button: + New Custom Machine */}
        <div className="p-2.5 border-t border-slate-800 bg-[#0a101d]">
          <button
            onClick={onOpenCustomMachineModal}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 border border-cyan-500/50 text-xs font-semibold text-cyan-200 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom Machine</span>
          </button>
        </div>
      </div>
    </aside>
  );
};


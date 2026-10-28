import React, { useState } from 'react';
import { useArcadeStore } from '../store/useArcadeStore';
import { FloorMaterial, MachineCategory } from '../types/arcade';
import {
  feetToMm,
  getMachineDimUnitLabel,
  metersToMm,
  mmToFeet,
  mmToMeters,
  parseMachineDimInput,
} from '../utils/units';
import { computeRoomMetrics } from '../utils/geometry';
import { X, Plus, Sparkles, Trash2 } from 'lucide-react';

interface CustomMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomMachineModal: React.FC<CustomMachineModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { project, addCustomMachineDefinition, addMachineFromCatalog } =
    useArcadeStore();
  const { unitSystem, unitDisplay } = project.settings;
  const unitLabel = getMachineDimUnitLabel(unitSystem, unitDisplay);

  const [name, setName] = useState('Custom Arcade Cabinet');
  const [shortTag, setShortTag] = useState('CUSTOM');
  const [category, setCategory] = useState<MachineCategory>('custom');
  const [widthVal, setWidthVal] = useState(unitSystem === 'imperial' ? 28 : 71);
  const [depthVal, setDepthVal] = useState(unitSystem === 'imperial' ? 36 : 91);
  const [heightVal, setHeightVal] = useState(unitSystem === 'imperial' ? 70 : 178);
  const [clearanceVal, setClearanceVal] = useState(unitSystem === 'imperial' ? 32 : 81);
  const [powerWatts, setPowerWatts] = useState(300);
  const [cabinetColor, setCabinetColor] = useState('#06b6d4');
  const [accentColor, setAccentColor] = useState('#f43f5e');
  const [marqueeTitle, setMarqueeTitle] = useState('CUSTOM ARCADE');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const widthMm = parseMachineDimInput(widthVal, unitSystem, unitDisplay);
    const depthMm = parseMachineDimInput(depthVal, unitSystem, unitDisplay);
    const heightMm = parseMachineDimInput(heightVal, unitSystem, unitDisplay);
    const playerClearanceMm = parseMachineDimInput(clearanceVal, unitSystem, unitDisplay);

    const created = addCustomMachineDefinition({
      name: name.trim() || 'Custom Machine',
      shortTag: shortTag.trim() || 'CUST',
      category,
      widthMm,
      depthMm,
      heightMm,
      playerClearanceMm,
      serviceClearanceMm: 150,
      powerWatts,
      cabinetColor,
      accentColor,
      marqueeTitle: marqueeTitle.trim() || name.toUpperCase(),
      marqueeBgColor: '#fef08a',
      marqueeTextColor: '#0f172a',
      screenColor: '#1e3a8a',
    });

    addMachineFromCatalog(created.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0d1526] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Create Custom Arcade Machine</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-slate-400 block mb-1">Machine Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Short Label</label>
              <input
                type="text"
                maxLength={8}
                value={shortTag}
                onChange={(e) => setShortTag(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">3D Body Style</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MachineCategory)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
              >
                <option value="custom">Custom Upright Cabinet</option>
                <option value="deluxe-widebody">Deluxe / Widebody</option>
                <option value="pinball">Pinball Machine</option>
                <option value="racing-cockpit">Driving / Racing Cockpit</option>
                <option value="four-player">4-Player Pedestal</option>
                <option value="novelty-rhythm">Dance Stage / Rhythm</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">3D Marquee Text</label>
              <input
                type="text"
                value={marqueeTitle}
                onChange={(e) => setMarqueeTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="text-slate-400 block mb-1">Width ({unitLabel})</label>
              <input
                type="number"
                step="0.5"
                min="5"
                value={widthVal}
                onChange={(e) => setWidthVal(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Depth ({unitLabel})</label>
              <input
                type="number"
                step="0.5"
                min="5"
                value={depthVal}
                onChange={(e) => setDepthVal(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Height ({unitLabel})</label>
              <input
                type="number"
                step="0.5"
                min="10"
                value={heightVal}
                onChange={(e) => setHeightVal(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Clear ({unitLabel})</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={clearanceVal}
                onChange={(e) => setClearanceVal(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Power (Watts)</label>
              <input
                type="number"
                value={powerWatts}
                onChange={(e) => setPowerWatts(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Cabinet Color</label>
              <input
                type="color"
                value={cabinetColor}
                onChange={(e) => setCabinetColor(e.target.value)}
                className="w-full h-8 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Accent Trim</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full h-8 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg"
            >
              Add to Library & Place
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RoomBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoomBuilderModal: React.FC<RoomBuilderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    project,
    setRectangularRoom,
    setLShapedRoom,
    setFloorMaterial,
    updateSettings,
    clearAllMachines,
  } = useArcadeStore();

  const metrics = computeRoomMetrics(project.floorPlan.walls);
  const isImperial = project.settings.unitSystem === 'imperial';

  const [widthInput, setWidthInput] = useState(
    isImperial
      ? Math.round(mmToFeet(metrics.widthMm))
      : Math.round(mmToMeters(metrics.widthMm))
  );
  const [depthInput, setDepthInput] = useState(
    isImperial
      ? Math.round(mmToFeet(metrics.depthMm))
      : Math.round(mmToMeters(metrics.depthMm))
  );
  const [ceilingInput, setCeilingInput] = useState(
    isImperial
      ? Math.round(mmToFeet(project.settings.wallHeightMm))
      : Number(mmToMeters(project.settings.wallHeightMm).toFixed(1))
  );

  if (!isOpen) return null;

  const handleApplyRectRoom = () => {
    const wMm = isImperial ? feetToMm(widthInput) : metersToMm(widthInput);
    const dMm = isImperial ? feetToMm(depthInput) : metersToMm(depthInput);
    const cMm = isImperial ? feetToMm(ceilingInput) : metersToMm(ceilingInput);
    setRectangularRoom(wMm, dMm);
    updateSettings({ wallHeightMm: cMm });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0d1526] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Venue Floor Plan & Room Settings</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Exact Rectangular Room Dimensions */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-200">
              Rectangular Venue Dimensions ({isImperial ? 'Feet' : 'Meters'})
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">
                  Width ({isImperial ? 'ft' : 'm'})
                </label>
                <input
                  type="number"
                  min={8}
                  max={300}
                  value={widthInput}
                  onChange={(e) => setWidthInput(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Length ({isImperial ? 'ft' : 'm'})
                </label>
                <input
                  type="number"
                  min={8}
                  max={300}
                  value={depthInput}
                  onChange={(e) => setDepthInput(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Ceiling ({isImperial ? 'ft' : 'm'})
                </label>
                <input
                  type="number"
                  min={7}
                  max={40}
                  value={ceilingInput}
                  onChange={(e) => setCeilingInput(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono"
                />
              </div>
            </div>
            <button
              onClick={handleApplyRectRoom}
              className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition"
            >
              Apply Rectangular Room ({widthInput} × {depthInput} {isImperial ? 'ft' : 'm'})
            </button>
          </div>

          {/* Preset Venue Shapes */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="font-semibold text-slate-200">Preset Floor Shapes</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setRectangularRoom(feetToMm(60), feetToMm(45));
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition"
              >
                <div className="font-semibold text-cyan-300">Main Arcade Hall</div>
                <div className="text-[11px] text-slate-400">60&apos; × 45&apos; Rectangular</div>
              </button>
              <button
                onClick={() => {
                  setLShapedRoom();
                  onClose();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left transition"
              >
                <div className="font-semibold text-purple-300">L-Shaped Corner Venue</div>
                <div className="text-[11px] text-slate-400">Multi-Wing Floor Plan</div>
              </button>
            </div>
          </div>

          {/* 3D Floor Material */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="font-semibold text-slate-200">3D Floor Surface Material</div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'neon-carpet', label: '90s Neon Galaxy Carpet' },
                  { id: 'polished-concrete', label: 'Polished Industrial Concrete' },
                  { id: 'wood', label: 'Dark Hardwood Flooring' },
                  { id: 'grid', label: 'Architectural CAD Grid' },
                ] as Array<{ id: FloorMaterial; label: string }>
              ).map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => setFloorMaterial(mat.id)}
                  className={`px-3 py-2 rounded-lg border text-left transition ${
                    project.floorPlan.material === mat.id
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {mat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear All Machines */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
            <button
              onClick={() => {
                clearAllMachines();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Placed Machines</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


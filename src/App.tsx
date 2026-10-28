import React, { useEffect, useState } from 'react';
import { useArcadeStore } from './store/useArcadeStore';
import { TopHeader } from './components/TopHeader';
import { LeftSidebar } from './components/LeftSidebar';
import { RightInspector } from './components/RightInspector';
import { BottomStatusBar } from './components/BottomStatusBar';
import { Canvas2DCad } from './components/Canvas2DCad';
import { Canvas3DScene } from './components/Canvas3DScene';
import { CustomMachineModal, RoomBuilderModal } from './components/Modals';
import { cmToMm, inchesToMm } from './utils/units';

export const App: React.FC = () => {
  const {
    project,
    viewMode,
    selectedMachineIds,
    setViewMode,
    undo,
    redo,
    duplicateSelected,
    copySelected,
    pasteClipboard,
    rotateSelectedMachines,
    deleteSelected,
    moveMachines,
    setActiveTool,
  } = useArcadeStore();

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  // Global CAD Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate (Cmd/Ctrl + D)
      if (isMod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Copy / Paste (Cmd/Ctrl + C / V)
      if (isMod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }
      if (isMod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Rotate selected machines (R = 90°, Shift+R = 15°)
      if (!isMod && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        rotateSelectedMachines(e.shiftKey ? 15 : 90);
        return;
      }

      // Escape resets tool to Select
      if (e.key === 'Escape') {
        setActiveTool('select');
        return;
      }

      // Tab toggles between 2D CAD, 3D Orbit, and 3D Walkthrough
      if (e.key === 'Tab') {
        e.preventDefault();
        if (viewMode === '2d-cad') setViewMode('3d-orbit');
        else if (viewMode === '3d-orbit') setViewMode('3d-walk');
        else setViewMode('2d-cad');
        return;
      }

      // Arrow keys micro-nudge in 2D CAD mode
      if (
        viewMode === '2d-cad' &&
        selectedMachineIds.length > 0 &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const isImperial = project.settings.unitSystem === 'imperial';
        const stepMm = e.shiftKey
          ? isImperial
            ? inchesToMm(6)
            : cmToMm(10)
          : isImperial
            ? inchesToMm(1)
            : cmToMm(1);

        const dx =
          e.key === 'ArrowRight' ? stepMm : e.key === 'ArrowLeft' ? -stepMm : 0;
        const dz =
          e.key === 'ArrowDown' ? stepMm : e.key === 'ArrowUp' ? -stepMm : 0;

        const selectedSet = new Set(selectedMachineIds);
        const updates = project.placedMachines
          .filter((m) => selectedSet.has(m.instanceId))
          .map((m) => ({
            id: m.instanceId,
            x: m.position.x + dx,
            z: m.position.z + dz,
          }));
        moveMachines(updates, true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    selectedMachineIds,
    project.settings.unitSystem,
    project.placedMachines,
    undo,
    redo,
    duplicateSelected,
    copySelected,
    pasteClipboard,
    rotateSelectedMachines,
    deleteSelected,
    moveMachines,
    setActiveTool,
    setViewMode,
  ]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#090d16] text-slate-100">
      {/* Top Application Header */}
      <TopHeader
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
        onOpenCustomMachineModal={() => setIsCustomModalOpen(true)}
      />

      {/* Main Workspace Area: Left Catalog Sidebar + Center Viewport + Right Inspector */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <LeftSidebar
          onOpenCustomMachineModal={() => setIsCustomModalOpen(true)}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
        />

        {viewMode === '2d-cad' ? <Canvas2DCad /> : <Canvas3DScene />}

        <RightInspector />
      </div>

      {/* Bottom Status & Analytics Footer */}
      <BottomStatusBar />

      {/* Modals */}
      <CustomMachineModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />
      <RoomBuilderModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
      />
    </div>
  );
};

export default App;


# Arcade Layout Studio — UI Design & Feature Showcase

This document presents sample user interface screenshots and detailed functional breakdowns for the **Arcade Layout Studio** desktop application.
 
---

## 1. View Mode 1: 2D Top-Down CAD Layout Mode

The 2D Top-Down CAD mode is designed for precision room drafting, dimension verification, machine placement, and aisle clearance management.

![2D CAD Floor Plan Layout Mode](/Users/briancook/.gemini/antigravity-ide/brain/0598e8d6-7445-40fc-b6b2-ca33fb4b4860/arcade_ui_2d_mode_1793131408892.jpg)

### UI Components & Controls in 2D Mode:

1. **Top Application Header & Global Controls**:
   - **Mode Switcher**: One-click switching between `2D FLOOR PLAN`, `3D ORBIT`, and `3D WALKTHROUGH`.
   - **Unit Toggle**: Toggle between `Feet/Inches` (Imperial) and `Meters/Centimeters` (Metric). All wall dimensions, grid intervals, and machine specs update instantaneously.
   - **Snapping System**: Toggle snap constraints: `Grid Snap` (e.g., 1 ft / 25 cm), `Object-to-Object Edge Snap`, and `Wall Alignment`.
   - **Auto-Save Status**: Live indicator showing `Auto-Saved` with instant local disk persistence whenever changes occur.

2. **Left Sidebar — Arcade Machine Library**:
   - **Search & Categorized Catalog**: Quickly filter through `Classic Upright`, `Pinball`, `Racing Cockpit`, `4-Player`, and `Novelty / Rhythm (DDR/Skee-Ball)`.
   - **Drag-and-Drop Placement**: Drag any machine directly onto the blueprint canvas.
   - **Custom Machine Builder**: Create custom machines by specifying exact Width × Depth × Height dimensions and player clearance depths.

3. **Center Canvas — Interactive Architectural Floor Plan**:
   - **Scaled Drawing & Walls**: Dimension callouts automatically measure wall spans (e.g., `45' 0" × 60' 0"`).
   - **Directional Facing Indicators**: White arrows on machine footprints clearly display the screen/control orientation.
   - **Player Clearance Zones**: Dashed purple bounding boxes represent recommended standing and play clearance in front of controls (alerting if an aisle is too narrow).
   - **Machine Arrangement Rows**: Back-to-back island arrangements, perimeter wall lineups, and pinball banks.

4. **Right Sidebar — Machine Inspector & Quick Actions**:
   - **Selected Machine Metrics**: Readout and direct input fields for `Width`, `Depth`, and `Height` (e.g., 25.0" × 33.0" × 68.0").
   - **Angle & Rotation Wheel**: Visual 360° dial for precise orientation (with 15°, 45°, and 90° quick snap).
   - **Duplication & Cloning**:
     - `Duplicate`: Clones the machine with an automatic incremental offset.
     - `Clone`: Places repeated copies in a linear row (e.g., create a row of 6 pinball machines with 2-inch spacing).
     - Standard hotkeys: `Cmd/Ctrl+C`, `Cmd/Ctrl+V`, `Cmd/Ctrl+D`, `Backspace/Delete`.

---

## 2. View Mode 2: 3D First-Person Walkthrough Mode

The 3D Walkthrough mode immerses the user inside their venue at eye level (~5 ft 6 in / 1.7 m) to evaluate sightlines, aisle clearances, lighting ambiance, and guest perspective.

![3D First-Person Walkthrough Mode](/Users/briancook/.gemini/antigravity-ide/brain/0598e8d6-7445-40fc-b6b2-ca33fb4b4860/arcade_ui_3d_walk_1793131422206.jpg)

### UI Components & Controls in Walkthrough Mode:

1. **Navigation HUD & Controls**:
   - **First-Person Controls**: Standard FPS navigation:
     - `WASD`: Walk forward, strafe left, move backward, strafe right.
     - `Mouse`: Pointer-lock look around (free pitch and yaw).
     - `Shift`: Sprint / fast walk.
   - **Walk Speed Slider**: Adjust walking pace between 10% and 100% for fine observation or quick navigation.
   - **Quick Unit Switcher**: Floating switch to verify dimensions while touring in 3D.

2. **Mini-Map Radar (Top-Right)**:
   - Synchronized top-down architectural radar tracking the user’s exact coordinate position `(X, Y)` and viewing cone.
   - Click anywhere on the mini-map to instantly teleport the camera to that location.

3. **Lighting & Visual Atmosphere**:
   - **Authentic Arcade Ambiance**: Dark ceiling with industrial ductwork and directional track spotlights highlighting machine cabinets.
   - **Glowing Backlit Marquees**: Emissive marquees for Pac-Man, Galaga, and pinball backglasses casting realistic colored lighting onto the environment.
   - **Retro Arcade Carpet**: Signature 90s galaxy-pattern geometric carpet reflecting vibrant ambient game light.
   - **Collision Physics**: Prevents walking through cabinets and walls, ensuring authentic aisle feel.

---

## 3. View Mode 3: 3D Orbit / Flythrough Overview Mode

The 3D Orbit and Flythrough mode provides an isometric cutaway dollhouse view of the entire room, ideal for presentations, investor tours, and overall spatial composition.

![3D Isometric Orbit Overview Mode](/Users/briancook/.gemini/antigravity-ide/brain/0598e8d6-7445-40fc-b6b2-ca33fb4b4860/arcade_ui_3d_overview_1793131439429.jpg)

### UI Components & Controls in 3D Orbit Mode:

1. **Camera & Orbit Navigation**:
   - **Orbit Controls**: Left-click to pivot around room center; right-click to pan; scroll wheel to zoom.
   - **Camera Readout**: Displays altitude (e.g., `32m`) and tilt angle (e.g., `48°`).
   - **Flythrough Mode Toggle**: Unlocks free 6-DOF drone camera (`Q`/`E` for elevation, `WASD` for lateral flight).

2. **Metric Unit System Display (Active Demonstration)**:
   - Demonstrates the application running in **Metric Mode** (`Units: METRIC (m/cm)`).
   - Floor area measured in square meters (`Total Room Area: 250 m²`).
   - Cabinet row widths and clearances displayed in meters (e.g., `Row Width: 10.5m`).

3. **Venue Analytics & Summary Footer**:
   - **Inventory Breakdown**: `Placed Machines: 32 (Arcade: 18, Pinball: 6, Racer: 4, Dance: 4)`.
   - **Power Load Estimation**: Live power consumption forecast (e.g., `6.8 kW` for selected row, `18.5 kW` total venue load).
   - **Lighting Layer Toggle**: Enable/disable ambient lights to preview daytime vs. night-time arcade lighting conditions.

---

## 4. Summary of Capabilities Demonstrated

| Feature | 2D CAD View | 3D Walkthrough View | 3D Orbit Overview |
| :--- | :--- | :--- | :--- |
| **Primary Purpose** | Drafting, measuring, editing | Human-scale sightlines & aisle feel | Dollhouse layout presentation |
| **Camera Perspective** | Orthographic (Top-Down) | First-Person Perspective (Eye-level) | Angled Perspective (Orbit / Fly) |
| **Unit System Support** | Feet/Inches & Meters/cm | Live toggle HUD | Metric/Imperial HUD |
| **Cabinet Interaction** | Drag, drop, rotate, duplicate | Inspection info on click | Multi-cabinet row grouping |
| **Clearance Visualization** | Bounding boxes & player zones | Real walking collision checks | Overall walkway flow |
| **Auto-Save Status** | Real-time continuous save | Real-time continuous save | Real-time continuous save |

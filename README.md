# Arcade Layout Studio

A full-featured professional web desktop CAD and 3D visualization studio for arcade planning, design, and walkthroughs. Built with **React 18**, **TypeScript**, **Three.js**, **Zustand**, and **Tailwind CSS**.

![Arcade Layout Studio](https://img.shields.io/badge/Arcade%20Layout%20Studio-v1.0.0-cyan.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r167-purple.svg)
![Vite](https://img.shields.io/badge/Vite-6.0-orange.svg)

---

## Features

### 1. 2D CAD Blueprint Engine
- **Architectural Drafting**: Interactive walls, single doors, double doors, and windows with CAD architectural symbols and swing arcs.
- **Smart Precision Snapping**: 1-foot grid snap, wall snapping, and object edge/center alignment.
- **Player & Service Clearances**: Dynamic visual clearance zones with real-time overlap and collision detection warning badges.
- **Interactive In-Canvas Editing**: Select, drag, rotate (via 360° dial or 90° hotkeys), clone rows, and measure tape tool.

### 2. 3D Immersion & Walkthrough
- **3D Orbit CAD Mode**: Free camera orbit, pan, and zoom to inspect floor plans from any angle with wireframe and machine footprints.
- **First-Person Walkthrough**: Immersive retro arcade experience at 5' 6" player eye height. Navigate using `WASD` / Arrow keys + Mouse look locked to viewing direction.
- **Drone Flythrough**: Elevated cinematic drone camera floating over perimeter banks and center islands.
- **Authentic Retro Arcade Environment**:
  - Suspended 8ft commercial acoustic drop ceiling with recessed lighting troffers.
  - Glowing backlit marquees, CRT curved screens, bumper lights, and arcade reflections.
  - Multiple floor surfaces: 90s Neon Galaxy Carpet, Polished Concrete, Hardwood, and CAD Grid.
  - Dynamic lighting toggles between *Arcade Night Atmosphere* and *High-Visibility Work Light*.

### 3. Machine Catalog & Library
- **Classic Uprights & Deluxes**: Pac-Man, Galaga, Donkey Kong, Street Fighter II, Xybots (with split-screen 3D corridor CRT).
- **Pinball**: Medieval Madness, The Addams Family, Twilight Zone, Star Trek: The Next Generation (chrome legs, sloped playfields, glowing backglass).
- **Racing Cockpits**: Daytona USA, Mario Kart Arcade GP, Super Monaco GP (Deluxe sit-down cockpit with F1 track display & tachometer, plus upright variant).
- **4-Player Cabinets**: Teenage Mutant Ninja Turtles, NBA Jam.
- **Novelty / Rhythm**: Dance Dance Revolution (DDR stage with glowing arrow pads), Skee-Ball Alley, Ms. Pac-Man Cocktail Table.
- **Custom Machine Builder**: Create custom machines with specific width, depth, height, player clearance, power draw, and hex colors.

---

## Tech Stack

- **Framework**: React 18 + Vite + TypeScript
- **3D Graphics**: Three.js
- **State Management**: Zustand with undo/redo history, session persistence (`localStorage`), and revisions
- **Icons**: Lucide React
- **Styling**: Tailwind CSS

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/arcade_layout.git
cd arcade_layout

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) (or the port indicated in the terminal) in your browser.

### Building for Production

```bash
npm run build
```

---

## Controls

### 2D CAD Blueprint Mode
- `Left Click + Drag`: Pan blueprint canvas
- `Scroll Wheel`: Zoom in/out toward cursor
- `Left Click` on Machine/Wall: Select item
- `R`: Rotate selected machine(s) clockwise by 90°
- `Delete` / `Backspace`: Remove selected items
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y`: Redo

### 3D Walkthrough Mode
- `W / A / S / D` or Arrow Keys: Walk forward / backward / strafe left / strafe right
- `Click + Drag`: Look around / steer viewing direction
- `Space`: Ascend (in Flythrough mode)
- `Shift`: Descend / fast move

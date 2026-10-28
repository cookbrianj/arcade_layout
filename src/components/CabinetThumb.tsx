import React from 'react';
import { MachineDefinition } from '../types/arcade';

interface CabinetThumbProps {
  definition: MachineDefinition;
  size?: 'sm' | 'md' | 'lg';
}

export const CabinetThumb: React.FC<CabinetThumbProps> = ({ definition, size = 'md' }) => {
  const dim = size === 'sm' ? 40 : size === 'md' ? 56 : 86;
  const { category, cabinetColor, accentColor, marqueeBgColor, marqueeTextColor, shortTag } =
    definition;

  if (category === 'pinball') {
    return (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 80 80"
        className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] select-none"
      >
        {/* Legs */}
        <line x1="22" y1="48" x2="22" y2="74" stroke="#94a3b8" strokeWidth="3" />
        <line x1="44" y1="56" x2="44" y2="77" stroke="#cbd5e1" strokeWidth="3" />
        <line x1="62" y1="44" x2="62" y2="68" stroke="#64748b" strokeWidth="3" />
        {/* Backbox */}
        <polygon
          points="16,12 42,6 42,34 16,40"
          fill={cabinetColor}
          stroke={accentColor}
          strokeWidth="2"
        />
        {/* Glowing Backglass */}
        <polygon points="19,15 39,10 39,31 19,36" fill={marqueeBgColor} />
        <text
          x="29"
          y="25"
          fontSize="6"
          fontWeight="bold"
          fill={marqueeTextColor}
          textAnchor="middle"
          transform="skewY(-12)"
        >
          {shortTag.slice(0, 8)}
        </text>
        {/* Sloped Playfield Body */}
        <polygon
          points="18,38 42,32 66,44 42,56"
          fill={definition.screenColor}
          stroke={accentColor}
          strokeWidth="1.8"
        />
        {/* Side Cabinet Art */}
        <polygon
          points="18,38 42,56 42,64 18,48"
          fill={cabinetColor}
          stroke={accentColor}
          strokeWidth="1.5"
        />
        {/* Lockdown Bar & Coin Door */}
        <polygon points="42,56 66,44 66,54 42,64" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <circle cx="54" cy="54" r="2.2" fill="#f97316" />
      </svg>
    );
  }

  if (category === 'racing-cockpit') {
    return (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 80 80"
        className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] select-none"
      >
        {/* Base sled */}
        <polygon
          points="14,54 46,38 68,50 36,68"
          fill="#1e293b"
          stroke={accentColor}
          strokeWidth="1.8"
        />
        {/* Front Monitor & Marquee Tower */}
        <polygon
          points="16,16 38,10 42,46 18,54"
          fill={cabinetColor}
          stroke={accentColor}
          strokeWidth="2"
        />
        {/* Top Marquee */}
        <polygon points="17,16 37,11 38,20 18,25" fill={marqueeBgColor} />
        {/* Screen */}
        <polygon points="20,27 38,22 39,37 21,42" fill={definition.screenColor} />
        {/* Steering Dashboard */}
        <circle cx="34" cy="40" r="5" fill="#0f172a" stroke="#e2e8f0" strokeWidth="2" />
        {/* Bucket Seat */}
        <polygon
          points="46,36 58,32 62,54 48,60"
          fill={cabinetColor}
          stroke="#f8fafc"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (category === 'novelty-rhythm') {
    return (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 80 80"
        className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] select-none"
      >
        {/* Dance Stage Pad */}
        <polygon
          points="12,54 44,40 70,54 38,70"
          fill="#0f172a"
          stroke={accentColor}
          strokeWidth="2"
        />
        {/* Glowing Dance Arrows */}
        <polygon points="34,52 42,48 48,52 40,56" fill="#ec4899" />
        <polygon points="44,58 52,54 58,58 50,62" fill="#22d3ee" />
        {/* Upright Speaker & Screen Frame */}
        <polygon
          points="16,12 44,6 44,44 16,52"
          fill={cabinetColor}
          stroke={accentColor}
          strokeWidth="2"
        />
        <polygon points="18,14 42,9 42,18 18,23" fill={marqueeBgColor} />
        <polygon points="20,25 40,20 40,36 20,41" fill={definition.screenColor} />
      </svg>
    );
  }

  // Classic Upright / Deluxe / 4-Player Isometric Cabinet
  const isWide = category === 'four-player' || category === 'deluxe-widebody';
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 80 80"
      className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.65)] select-none"
    >
      {/* Left Side Panel (Main Color + Accent Stripe) */}
      <polygon
        points="18,14 34,20 34,72 18,64"
        fill={cabinetColor}
        stroke={accentColor}
        strokeWidth="2"
      />
      {/* Side Art Graphic */}
      <polygon points="21,28 31,33 31,56 21,50" fill={accentColor} opacity="0.85" />
      {/* Top Marquee Overhang */}
      <polygon
        points="34,20 58,12 54,22 34,29"
        fill={marqueeBgColor}
        stroke={accentColor}
        strokeWidth="1.5"
      />
      <text
        x="45"
        y="22"
        fontSize="5.5"
        fontWeight="bold"
        fill={marqueeTextColor}
        textAnchor="middle"
      >
        {shortTag.slice(0, 7)}
      </text>
      {/* Recessed Monitor Bezel */}
      <polygon points="34,29 54,22 52,40 34,47" fill="#090d16" />
      <polygon
        points="37,31 51,26 49,38 37,43"
        fill={definition.screenColor}
        stroke="#38bdf8"
        strokeWidth="1"
      />
      {/* Control Panel Deck */}
      <polygon
        points="34,47 52,40 62,45 42,53"
        fill={isWide ? accentColor : '#1e293b'}
        stroke={cabinetColor}
        strokeWidth="1.5"
      />
      {/* Joystick & Buttons */}
      <circle cx="44" cy="46" r="2.2" fill="#ef4444" />
      <circle cx="50" cy="44" r="1.6" fill="#facc15" />
      <circle cx="54" cy="43" r="1.6" fill="#38bdf8" />
      {/* Lower Front Cabinet & Coin Door */}
      <polygon
        points="34,51 56,43 56,65 34,72"
        fill="#0f172a"
        stroke={cabinetColor}
        strokeWidth="1.8"
      />
      <rect x="41" y="53" width="9" height="11" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <rect x="43" y="55" width="2" height="2.5" fill="#f97316" />
      <rect x="46" y="55" width="2" height="2.5" fill="#f97316" />
    </svg>
  );
};


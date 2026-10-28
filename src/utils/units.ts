import { UnitDisplay, UnitSystem } from '../types/arcade';

export const MM_PER_INCH = 25.4;
export const MM_PER_FOOT = 304.8;
export const MM_PER_CM = 10;
export const MM_PER_METER = 1000;

export function inchesToMm(inches: number): number {
  return Math.round(inches * MM_PER_INCH * 10) / 10;
}

export function feetToMm(feet: number): number {
  return Math.round(feet * MM_PER_FOOT * 10) / 10;
}

export function cmToMm(cm: number): number {
  return Math.round(cm * MM_PER_CM * 10) / 10;
}

export function metersToMm(m: number): number {
  return Math.round(m * MM_PER_METER * 10) / 10;
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function mmToFeet(mm: number): number {
  return mm / MM_PER_FOOT;
}

export function mmToCm(mm: number): number {
  return mm / MM_PER_CM;
}

export function mmToMeters(mm: number): number {
  return mm / MM_PER_METER;
}

/**
 * Formats a canonical mm measurement into human-readable string based on UnitDisplay.
 */
export function formatLength(mm: number, display: UnitDisplay, precision = 1): string {
  switch (display) {
    case 'inches': {
      const inches = mmToInches(mm);
      return `${inches.toFixed(precision)}"`;
    }
    case 'feet-inches': {
      const totalInches = Math.abs(mmToInches(mm));
      const sign = mm < 0 ? '-' : '';
      const feet = Math.floor(totalInches / 12);
      const remInches = totalInches - feet * 12;
      const roundedInches = Math.round(remInches * 2) / 2; // nearest 0.5"
      if (roundedInches >= 12) {
        return `${sign}${feet + 1}' 0"`;
      }
      const inchStr =
        roundedInches % 1 === 0 ? `${roundedInches.toFixed(0)}"` : `${roundedInches.toFixed(1)}"`;
      return `${sign}${feet}' ${inchStr}`;
    }
    case 'cm': {
      const cm = mmToCm(mm);
      return `${cm.toFixed(precision === 0 ? 0 : 0)} cm`;
    }
    case 'meters': {
      const m = mmToMeters(mm);
      return `${m.toFixed(2)} m`;
    }
  }
}

/**
 * Formats machine dimensions (Width, Depth, Height) consistently (inches for imperial, cm for metric, or exact unitDisplay).
 */
export function formatMachineDimValue(mm: number, unitSystem: UnitSystem, display: UnitDisplay): string {
  if (unitSystem === 'imperial') {
    if (display === 'feet-inches') {
      return mmToInches(mm).toFixed(1);
    }
    return mmToInches(mm).toFixed(1);
  } else {
    if (display === 'meters') {
      return mmToMeters(mm).toFixed(2);
    }
    return mmToCm(mm).toFixed(0);
  }
}

export function getMachineDimUnitLabel(unitSystem: UnitSystem, display: UnitDisplay): string {
  if (unitSystem === 'imperial') {
    return 'in';
  }
  return display === 'meters' ? 'm' : 'cm';
}

export function parseMachineDimInput(val: number, unitSystem: UnitSystem, display: UnitDisplay): number {
  if (unitSystem === 'imperial') {
    return inchesToMm(val);
  }
  return display === 'meters' ? metersToMm(val) : cmToMm(val);
}

/**
 * Formats floor area in sq ft or m²
 */
export function formatArea(areaMm2: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'imperial') {
    const sqFt = areaMm2 / (MM_PER_FOOT * MM_PER_FOOT);
    return `${Math.round(sqFt).toLocaleString()} sq ft`;
  } else {
    const sqM = areaMm2 / (MM_PER_METER * MM_PER_METER);
    return `${sqM.toFixed(1)} m²`;
  }
}

/**
 * Formats grid size label (e.g. "1 ft" or "0.5 m")
 */
export function formatGridSize(gridMm: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'imperial') {
    const inches = Math.round(mmToInches(gridMm));
    if (inches % 12 === 0) {
      return `${inches / 12} ft`;
    }
    return `${inches} in`;
  } else {
    const cm = Math.round(mmToCm(gridMm));
    if (cm >= 100 && cm % 50 === 0) {
      return `${cm / 100} m`;
    }
    return `${cm} cm`;
  }
}


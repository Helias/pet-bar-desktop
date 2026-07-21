import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface Settings {
  themeId: string;
  petPosition?: { x: number; y: number };
  petManuallyShown: boolean;
  /** Pet size multiplier, 0.5–2 (see clampPetScale in types.ts). */
  petScale: number;
  language: 'system' | 'it' | 'en';
  appearance: 'system' | 'light' | 'dark';
}

const DEFAULTS: Settings = {
  themeId: 'armadillo',
  petManuallyShown: false,
  petScale: 0.5,
  language: 'system',
  appearance: 'system',
};

let cache: Settings | null = null;

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function getSettings(): Settings {
  if (cache) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    cache = { ...DEFAULTS, ...raw };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache!;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  cache = next;
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
  } catch (e) {
    console.error('Failed to persist settings:', e);
  }
  return next;
}

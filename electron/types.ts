export interface ThemeClip {
  /** Menu label (Italian, verbatim from upstream). */
  label: string;
  /** Clip file basename without extension; resolved against the theme's clips/ dir. */
  file: string;
}

export interface ThemeAbout {
  title: string;
  text: string;
  githubUrl: string;
  licenseUrl: string;
}

export interface ThemePetAsk {
  /** Clip basename played on 2/3 of submits. */
  answerClip: string;
  /** Bubble text shown on the remaining 1/3 (only if the pet is visible). */
  fallbackBubbleText: string;
  title: string;
  promptLabel: string;
}

export interface ThemePet {
  closed: string;
  open?: string;
  bubbleDown?: string;
  bubbleUp?: string;
  fontFile?: string;
  phrases: string[];
  /** Character name interpolated into the localized Show/Hide menu label. */
  petName: string;
  ask?: ThemePetAsk;
}

export interface ThemeManifest {
  id: string;
  name: string;
  trayIcon: { default: string; macTemplate?: string };
  clips: ThemeClip[];
  about: ThemeAbout;
  pet?: ThemePet;
}

/** Pet-window geometry. The single transparent window is big enough to hold
 *  the pet plus a bubble above or below it, so bubble and pet never need
 *  cross-window synchronisation. All values in CSS px. */
export const PET_W = 240;
export const PET_H = 320;
export const BUBBLE_W = 270;
export const BUBBLE_H = 218; // round(270 / 1.241), the artwork aspect ratio
/** Tail occupies ~11% of the bubble artwork height. */
export const BUBBLE_TAIL_FRAC = 0.11;
/** Snout is at 65% of the pet width; the bubble tail tip at 14% of bubble width. */
export const SNOUT_FRAC = 0.65;
export const TAIL_TIP_FRAC = 0.14;
/** Bubble overlaps the pet edge by 30px (upstream's -30 offsets). */
export const BUBBLE_OVERLAP = 30;

export const WIN_MARGIN = 8;
/** Pet element offset inside the window. */
export const PET_X = 6;
export const PET_Y = WIN_MARGIN + BUBBLE_H - BUBBLE_OVERLAP; // 196
export const WIN_W = 404;
export const WIN_H = PET_Y + PET_H + BUBBLE_H - BUBBLE_OVERLAP + WIN_MARGIN; // 712

export const PET_SCALE_MIN = 0.5;
export const PET_SCALE_MAX = 2;

export function clampPetScale(scale: unknown): number {
  const n = typeof scale === 'number' && Number.isFinite(scale) ? scale : 1;
  return Math.min(PET_SCALE_MAX, Math.max(PET_SCALE_MIN, n));
}

export interface PetGeometry {
  petX: number;
  petY: number;
  petW: number;
  petH: number;
  bubbleW: number;
  bubbleH: number;
  bubbleOverlap: number;
  winW: number;
  winH: number;
}

/** All pet-window geometry scaled by the user's pet-size setting. Must stay
 *  in sync with the copy in ui/src/app/electron-api.ts: main and renderer
 *  compute it independently and the values must match exactly. */
export function petGeometry(scale: number): PetGeometry {
  const s = clampPetScale(scale);
  const petW = Math.round(PET_W * s);
  const petH = Math.round(PET_H * s);
  const bubbleW = Math.round(BUBBLE_W * s);
  const bubbleH = Math.round(BUBBLE_H * s);
  const bubbleOverlap = Math.round(BUBBLE_OVERLAP * s);
  const petX = Math.round(PET_X * s);
  const petY = WIN_MARGIN + bubbleH - bubbleOverlap;
  const winW = Math.round(WIN_W * s);
  const winH = petY + petH + bubbleH - bubbleOverlap + WIN_MARGIN;
  return { petX, petY, petW, petH, bubbleW, bubbleH, bubbleOverlap, winW, winH };
}

export const MAX_CLIP_SECONDS = 30;
export const TALK_INTERVAL_MS = 125; // ~8 Hz mouth toggle
export const BUBBLE_VISIBLE_SECONDS = 15;
export const PHRASE_MIN_SECONDS = 600;
export const PHRASE_MAX_SECONDS = 720;
export const PHRASE_ANTI_SPAM_SECONDS = 120;
export const ASK_MAX_CHARS = 200;
export const DRAG_THRESHOLD_PX = 5;

export interface PetMetrics {
  workArea: { x: number; y: number; width: number; height: number };
  winBounds: { x: number; y: number };
}

export interface PlayCommand {
  /** Unique per source file; re-playing the same token toggles stop. */
  token: string;
  url: string;
}

export interface RendererTheme {
  manifest: ThemeManifest;
  /** theme:// base URL for the theme's asset dir. */
  baseUrl: string;
}

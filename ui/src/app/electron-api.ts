// Typed mirror of the API exposed by electron/preload.ts via contextBridge.

export interface ThemeClip {
  label: string;
  file: string;
}

export interface ThemeAbout {
  title: string;
  text: string;
  githubUrl: string;
  licenseUrl: string;
}

export interface ThemePet {
  closed: string;
  open?: string;
  bubbleDown?: string;
  bubbleUp?: string;
  fontFile?: string;
  phrases: string[];
  petName: string;
  ask?: {
    answerClip: string;
    fallbackBubbleText: string;
    title: string;
    promptLabel: string;
  };
}

export interface ThemeManifest {
  id: string;
  name: string;
  trayIcon: { default: string; macTemplate?: string };
  clips: ThemeClip[];
  about: ThemeAbout;
  pet?: ThemePet;
}

export interface RendererTheme {
  manifest: ThemeManifest;
  baseUrl: string;
}

export interface PetInit {
  theme: RendererTheme;
  petVisible: boolean;
  petScale: number;
}

export interface AskInit {
  title: string;
  promptLabel: string;
  maxChars: number;
}

export type LangPref = 'system' | 'it' | 'en';
export type AppearancePref = 'system' | 'light' | 'dark';

export interface SettingsState {
  themes: { id: string; name: string }[];
  themeId: string;
  autostart: boolean;
  about: ThemeAbout;
  version: string;
  language: LangPref;
  effectiveLang: 'it' | 'en';
  appearance: AppearancePref;
  petScale: number;
}

export interface BubblePayload {
  text: string;
  style: 'down' | 'up';
}

export interface ArmadilloApi {
  getPetInit(): Promise<PetInit>;
  onPlay(cb: (p: { token: string; url: string }) => void): () => void;
  onStop(cb: () => void): () => void;
  onPetShow(cb: () => void): () => void;
  onPetHide(cb: () => void): () => void;
  onBubbleShow(cb: (p: BubblePayload) => void): () => void;
  onBubbleHide(cb: () => void): () => void;
  onThemeChanged(cb: (t: RendererTheme) => void): () => void;
  onPetScaleChanged(cb: (scale: number) => void): () => void;
  petHidden(): void;
  petClicked(): void;
  petDragBy(dx: number, dy: number): void;
  petDragEnd(): void;
  setIgnoreMouse(ignore: boolean): void;
  bubbleRegion(region: { x: number; y: number; width: number; height: number } | null): void;
  bubbleClicked(): void;

  getAskInit(): Promise<AskInit>;
  askSubmit(text: string): void;
  askCancel(): void;

  getUiLang(): Promise<'it' | 'en'>;
  onLangChanged(cb: (lang: 'it' | 'en') => void): () => void;

  getSettingsState(): Promise<SettingsState>;
  setTheme(id: string): Promise<{ themeId: string; about: ThemeAbout }>;
  setPetScale(scale: number): Promise<number>;
  setAutostart(enabled: boolean): Promise<boolean>;
  setLanguage(pref: LangPref): Promise<'it' | 'en'>;
  setAppearance(pref: AppearancePref): Promise<AppearancePref>;
  openExternal(url: string): void;
}

export function armadilloApi(): ArmadilloApi {
  return (window as unknown as { armadillo: ArmadilloApi }).armadillo;
}

/** Pet-window geometry — must match electron/types.ts. */
export const PET_W = 240;
export const PET_H = 320;
export const BUBBLE_W = 270;
export const BUBBLE_H = 218;
export const BUBBLE_TAIL_FRAC = 0.11;
export const SNOUT_FRAC = 0.65;
export const TAIL_TIP_FRAC = 0.14;
export const BUBBLE_OVERLAP = 30;
export const WIN_MARGIN = 8;
export const WIN_W = 404;
export const PET_X = 6;
export const PET_Y = 196;
export const MAX_CLIP_SECONDS = 30;
export const TALK_INTERVAL_MS = 125;
export const BUBBLE_VISIBLE_SECONDS = 15;
export const DRAG_THRESHOLD_PX = 5;
export const PET_SCALE_MIN = 0.5;
export const PET_SCALE_MAX = 2;

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

/** Scaled geometry — must match petGeometry in electron/types.ts exactly:
 *  the main process sizes the window and X11 input shape with its copy. */
export function petGeometry(scale: number): PetGeometry {
  const s = Math.min(PET_SCALE_MAX, Math.max(PET_SCALE_MIN, Number.isFinite(scale) ? scale : 1));
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

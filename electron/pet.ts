import { BrowserWindow, screen } from 'electron';
import {
  ThemeManifest,
  WIN_W,
  WIN_H,
  PET_X,
  PET_Y,
  PET_W,
  PET_H,
  BUBBLE_H,
  BUBBLE_VISIBLE_SECONDS,
  PHRASE_MIN_SECONDS,
  PHRASE_MAX_SECONDS,
  PHRASE_ANTI_SPAM_SECONDS,
} from './types';
import { getSettings, updateSettings } from './settings';

let win: BrowserWindow | null = null;
let currentTheme: ThemeManifest | null = null;
let petVisible = false;
let manuallyShown = false;
let phraseTimer: NodeJS.Timeout | null = null;
let autoHideTimer: NodeJS.Timeout | null = null;
let hideFallbackTimer: NodeJS.Timeout | null = null;
const lastShownPerPhrase = new Map<string, number>();

/** Called whenever visibility flips, so the tray label can be rebuilt. */
export let onVisibilityChanged: () => void = () => {};
export function setOnVisibilityChanged(cb: () => void): void {
  onVisibilityChanged = cb;
}

export function getPetWindow(): BrowserWindow | null {
  return win;
}

export function isPetVisible(): boolean {
  return petVisible;
}

export function isManuallyShown(): boolean {
  return manuallyShown;
}

function petScreenRect(pos: { x: number; y: number }) {
  return { x: pos.x + PET_X, y: pos.y + PET_Y, width: PET_W, height: PET_H };
}

/** Restore saved window position; fall back to "pet slightly above the centre
 *  of the primary display" (upstream default) when unsaved or off-screen. */
function initialPosition(): { x: number; y: number } {
  const saved = getSettings().petPosition;
  if (saved) {
    const rect = petScreenRect(saved);
    const onScreen = screen.getAllDisplays().some((d) => {
      const wa = d.workArea;
      return (
        rect.x < wa.x + wa.width &&
        rect.x + rect.width > wa.x &&
        rect.y < wa.y + wa.height &&
        rect.y + rect.height > wa.y
      );
    });
    if (onScreen) return saved;
  }
  const wa = screen.getPrimaryDisplay().workArea;
  const petTop = wa.y + Math.round((wa.height - PET_H) / 2) - 60;
  return {
    x: wa.x + Math.round(wa.width / 2) - Math.round(WIN_W / 2),
    y: petTop - PET_Y,
  };
}

export function createPetWindow(loadUrl: string, preloadPath: string): BrowserWindow {
  const pos = initialPosition();
  win = new BrowserWindow({
    x: pos.x,
    y: pos.y,
    width: WIN_W,
    height: WIN_H,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // The hidden window hosts audio + timers for the whole app.
      backgroundThrottling: false,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Empty transparent areas must never swallow clicks; the renderer flips
  // this off when the pointer enters the pet or bubble element.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadURL(loadUrl);
  return win;
}

export function applyPetTheme(theme: ThemeManifest): void {
  currentTheme = theme;
  stopTimers();
  lastShownPerPhrase.clear();
  if (!theme.pet) {
    // Petless theme: window stays hidden, it keeps hosting audio.
    if (petVisible) {
      petVisible = false;
      manuallyShown = false;
      win?.hide();
    }
    return;
  }
  startPhraseTimer();
  if (getSettings().petManuallyShown) showPet(true);
}

function stopTimers(): void {
  if (phraseTimer) clearTimeout(phraseTimer);
  if (autoHideTimer) clearTimeout(autoHideTimer);
  phraseTimer = null;
  autoHideTimer = null;
}

/** Phrase timer: fires every 10–12 min, always rescheduling. Visible pet →
 *  just a bubble; hidden pet → auto-appear for 15 s (unless manually shown). */
function startPhraseTimer(): void {
  if (phraseTimer) clearTimeout(phraseTimer);
  const secs =
    PHRASE_MIN_SECONDS + Math.random() * (PHRASE_MAX_SECONDS - PHRASE_MIN_SECONDS);
  const overrideMs = Number(process.env.ARMADILLO_PHRASE_INTERVAL_MS);
  const ms = Number.isFinite(overrideMs) && overrideMs > 0 ? overrideMs : secs * 1000;
  phraseTimer = setTimeout(() => {
    if (currentTheme?.pet) {
      if (petVisible) {
        showRandomBubble();
      } else {
        showPet(false);
        if (autoHideTimer) clearTimeout(autoHideTimer);
        autoHideTimer = setTimeout(() => {
          if (!manuallyShown) hidePet();
        }, BUBBLE_VISIBLE_SECONDS * 1000);
      }
    }
    startPhraseTimer();
  }, ms);
}

export function showPet(manual: boolean): void {
  if (!win || !currentTheme?.pet) return;
  if (manual) {
    manuallyShown = true;
    updateSettings({ petManuallyShown: true });
  }
  if (petVisible) return;
  petVisible = true;
  if (hideFallbackTimer) clearTimeout(hideFallbackTimer);
  win.showInactive();
  win.webContents.send('pet:show');
  // Bubble appears just after the fade-in lands (upstream: 0.35 s).
  setTimeout(() => {
    if (petVisible) showRandomBubble();
  }, 350);
  onVisibilityChanged();
}

export function hidePet(): void {
  if (!win) return;
  if (autoHideTimer) clearTimeout(autoHideTimer);
  autoHideTimer = null;
  if (!petVisible) return;
  petVisible = false;
  win.webContents.send('bubble:hide');
  win.webContents.send('pet:hide');
  // Renderer confirms after its 0.18 s fade-out; hide anyway if it never does.
  if (hideFallbackTimer) clearTimeout(hideFallbackTimer);
  hideFallbackTimer = setTimeout(() => win?.hide(), 500);
  onVisibilityChanged();
}

/** Renderer signals the fade-out finished. */
export function petHideAnimationDone(): void {
  if (hideFallbackTimer) clearTimeout(hideFallbackTimer);
  hideFallbackTimer = null;
  if (!petVisible) win?.hide();
}

export function togglePet(): void {
  if (!currentTheme?.pet) return;
  if (petVisible) {
    manuallyShown = false;
    updateSettings({ petManuallyShown: false });
    hidePet();
  } else {
    showPet(true);
  }
}

function pickPhrase(): string | null {
  const pool = currentTheme?.pet?.phrases ?? [];
  if (pool.length === 0) return null;
  const now = Date.now();
  const fresh = pool.filter((p) => {
    const last = lastShownPerPhrase.get(p);
    return last === undefined || now - last >= PHRASE_ANTI_SPAM_SECONDS * 1000;
  });
  const pickFrom = fresh.length > 0 ? fresh : pool;
  const pick = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  lastShownPerPhrase.set(pick, now);
  return pick;
}

export function showRandomBubble(): void {
  const phrase = pickPhrase();
  if (phrase) showBubble(phrase);
}

/** Bubble orientation mirrors upstream chooseStyle: bubble above the pet
 *  ('down' tail) whenever there is room above it in the work area. */
export function showBubble(text: string): void {
  if (!win || !petVisible) return;
  const [x, y] = win.getPosition();
  const display = screen.getDisplayMatching({ x, y, width: WIN_W, height: WIN_H });
  const petTopAbs = y + PET_Y;
  const style = petTopAbs - display.workArea.y >= BUBBLE_H + 4 ? 'down' : 'up';
  win.webContents.send('bubble:show', { text, style });
}

export function dragBy(dx: number, dy: number): void {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(x + dx, y + dy);
}

export function persistPosition(): void {
  if (!win) return;
  const [x, y] = win.getPosition();
  updateSettings({ petPosition: { x, y } });
}

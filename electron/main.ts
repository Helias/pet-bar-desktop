import { app, ipcMain, nativeTheme, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import { ASK_MAX_CHARS, RendererTheme, ThemeManifest } from './types';
import {
  activeTheme,
  listThemes,
  registerThemeProtocol,
  registerThemeSchemePrivileges,
  themeAssetUrl,
} from './themes';
import { getSettings, updateSettings } from './settings';
import { addCustomSound, customRoot, openCustomDir } from './custom-sounds';
import { isAutostartEnabled, setAutostart, toggleAutostart } from './autostart';
import { playBuiltinBase, playBuiltinIndex, playCustomFile, stopPlayback } from './playback-bridge';
import {
  applyPetTheme,
  createPetWindow,
  dragBy,
  getPetWindow,
  isPetVisible,
  persistPosition,
  petHideAnimationDone,
  rendererSetIgnoreMouse,
  setBubbleRegion,
  setOnVisibilityChanged,
  showBubble,
  togglePet,
} from './pet';
import { createTray, rebuildTrayMenu, TrayActions } from './tray';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { closeAskWindow, openAskWindow, openSettingsWindow, showAboutDialog } from './windows';
import { currentLang, loadLang, LangPref } from './i18n';

let theme: ThemeManifest;

// Chromium reorders argv before it reaches the second-instance event (switches
// move ahead of positionals), so the original argv travels via additionalData.
const gotLock = app.requestSingleInstanceLock({ argv: process.argv.slice(1) });
if (!gotLock) {
  app.quit();
} else {
  main();
}

function main(): void {
  registerThemeSchemePrivileges();

  if (process.platform === 'linux') {
    // Needed for transparent windows on some Linux compositors.
    app.commandLine.appendSwitch('enable-transparent-visuals');
  }

  app.on('second-instance', (_e, argv, _wd, additionalData) => {
    const original = (additionalData as { argv?: string[] } | undefined)?.argv;
    handleCliVerbs(original ?? argv);
  });

  // Tray app: stay alive with every window closed.
  app.on('window-all-closed', () => {});

  app.on('will-quit', () => unregisterShortcuts());

  app.whenReady().then(() => {
    if (process.platform === 'darwin') app.dock?.hide();
    registerThemeProtocol(customRoot());
    loadLang(getSettings().language);
    // Drives prefers-color-scheme in every renderer (Tailwind dark: variants).
    nativeTheme.themeSource = getSettings().appearance;
    theme = activeTheme();

    // Transparent windows on Linux need the compositor handshake to settle
    // before creation, otherwise the window gets an opaque backdrop.
    const delay = process.platform === 'linux' ? 300 : 0;
    setTimeout(() => {
      createPetWindow(routeUrl('pet'), preloadPath());
      setOnVisibilityChanged(() => rebuildTrayMenu(theme, trayActions));
      createTray(theme, trayActions);
      registerShortcuts(theme, shortcutActions());
      wireIpc();
      const petWin = getPetWindow();
      petWin?.webContents.once('did-finish-load', () => applyPetTheme(theme));
      // Test hook: open a secondary window straight away.
      if (process.env.ARMADILLO_DEBUG_OPEN === 'settings') {
        openSettingsWindow(routeUrl('settings'), preloadPath());
      } else if (process.env.ARMADILLO_DEBUG_OPEN === 'ask' && theme.pet?.ask) {
        openAskWindow(routeUrl('ask'), preloadPath(), theme.pet.ask.title);
      }
    }, delay);
  });
}

function preloadPath(): string {
  return path.join(__dirname, 'preload.js');
}

function routeUrl(route: string): string {
  const dev = process.env.ELECTRON_START_URL;
  if (dev) return `${dev}/#/${route}`;
  const index = path.join(app.getAppPath(), 'ui/dist/ui/browser/index.html');
  return `file://${index}#/${route}`;
}

function rendererTheme(): RendererTheme {
  return { manifest: theme, baseUrl: 'theme://themes/' + theme.id + '/' };
}

const trayActions: TrayActions = {
  onPlayBuiltin: (i) => playBuiltinIndex(theme, i),
  onPlayCustom: (file) => playCustomFile(theme, file),
  onAddCustom: async () => {
    const added = await addCustomSound(theme.id);
    if (added) rebuildTrayMenu(theme, trayActions);
  },
  onOpenCustomDir: () => openCustomDir(theme.id),
  onTogglePet: () => togglePet(),
  onToggleAutostart: () => {
    toggleAutostart();
    rebuildTrayMenu(theme, trayActions);
  },
  onShowSettings: () => openSettingsWindow(routeUrl('settings'), preloadPath()),
  onShowAbout: () => showAboutDialog(theme),
};

function shortcutActions() {
  return {
    onClip: (i: number) => playBuiltinIndex(theme, i),
    onTogglePet: () => togglePet(),
  };
}

function handleCliVerbs(argv: string[]): void {
  // Accept both `--play N` and `--play=N`.
  const playIdx = argv.indexOf('--play');
  const eq = argv.find((a) => a.startsWith('--play='));
  const raw = eq ? eq.slice('--play='.length) : playIdx !== -1 ? argv[playIdx + 1] : undefined;
  if (raw !== undefined) {
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= theme.clips.length) playBuiltinIndex(theme, n - 1);
  }
  if (argv.includes('--toggle-pet')) togglePet();
}

function switchTheme(id: string): boolean {
  const next = listThemes().find((t) => t.id === id);
  if (!next || next.id === theme.id) return false;
  stopPlayback();
  theme = next;
  updateSettings({ themeId: id });
  applyPetTheme(theme);
  createTray(theme, trayActions); // updates icon + menu
  registerShortcuts(theme, shortcutActions());
  getPetWindow()?.webContents.send('theme:changed', rendererTheme());
  return true;
}

function wireIpc(): void {
  ipcMain.handle('pet:init', () => ({
    theme: rendererTheme(),
    petVisible: isPetVisible(),
  }));

  ipcMain.on('pet:hidden', () => petHideAnimationDone());
  ipcMain.on('pet:clicked', () => {
    const ask = theme.pet?.ask;
    if (ask) openAskWindow(routeUrl('ask'), preloadPath(), ask.title);
  });
  ipcMain.on('pet:drag', (_e, dx: number, dy: number) => dragBy(dx, dy));
  ipcMain.on('pet:drag-end', () => persistPosition());
  ipcMain.on('pet:set-ignore-mouse', (_e, ignore: boolean) => rendererSetIgnoreMouse(ignore));
  ipcMain.on(
    'bubble:region',
    (_e, region: { x: number; y: number; width: number; height: number } | null) =>
      setBubbleRegion(region),
  );
  ipcMain.on('bubble:clicked', () => {
    getPetWindow()?.webContents.send('bubble:hide');
  });

  ipcMain.handle('ask:init', () => ({
    title: theme.pet?.ask?.title ?? '',
    promptLabel: theme.pet?.ask?.promptLabel ?? '',
    maxChars: ASK_MAX_CHARS,
  }));
  ipcMain.on('ask:submit', (_e, text: string) => {
    closeAskWindow();
    const ask = theme.pet?.ask;
    if (!ask || !text || !text.trim()) return;
    // 2/3 → canned audio answer, 1/3 → bubble (only if the pet is visible).
    if (Math.floor(Math.random() * 3) < 2) {
      playBuiltinBase(theme, ask.answerClip);
    } else if (isPetVisible()) {
      showBubble(ask.fallbackBubbleText);
    }
  });
  ipcMain.on('ask:cancel', () => closeAskWindow());

  ipcMain.handle('app:lang', () => currentLang());

  ipcMain.handle('settings:state', () => ({
    themes: listThemes().map((t) => ({ id: t.id, name: t.name })),
    themeId: theme.id,
    autostart: isAutostartEnabled(),
    about: theme.about,
    version: app.getVersion(),
    language: getSettings().language,
    effectiveLang: currentLang(),
    appearance: getSettings().appearance,
  }));
  ipcMain.handle('settings:set-theme', (_e, id: string) => {
    switchTheme(id);
    return { themeId: theme.id, about: theme.about };
  });
  ipcMain.handle('settings:set-language', (_e, pref: LangPref) => {
    updateSettings({ language: pref });
    loadLang(pref);
    rebuildTrayMenu(theme, trayActions);
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('lang:changed', currentLang());
    }
    return currentLang();
  });

  ipcMain.handle('settings:set-appearance', (_e, pref: 'system' | 'light' | 'dark') => {
    updateSettings({ appearance: pref });
    nativeTheme.themeSource = pref;
    return pref;
  });

  ipcMain.handle('settings:set-autostart', (_e, enabled: boolean) => {
    setAutostart(enabled);
    rebuildTrayMenu(theme, trayActions);
    return isAutostartEnabled();
  });
  ipcMain.on('open-external', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });
}

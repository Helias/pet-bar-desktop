import { BrowserWindow, dialog, shell } from 'electron';
import { ThemeManifest } from './types';
import { t } from './i18n';

let askWin: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;

export function openAskWindow(routeUrl: string, preloadPath: string, title: string): void {
  if (askWin && !askWin.isDestroyed()) {
    askWin.focus();
    return;
  }
  askWin = new BrowserWindow({
    width: 440,
    height: 230,
    title,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });
  askWin.setMenuBarVisibility(false);
  askWin.loadURL(routeUrl);
  askWin.on('closed', () => (askWin = null));
}

export function closeAskWindow(): void {
  askWin?.close();
}

export function openSettingsWindow(routeUrl: string, preloadPath: string): void {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 520,
    height: 620,
    title: t('settings.title'),
    autoHideMenuBar: true,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadURL(routeUrl);
  settingsWin.on('closed', () => (settingsWin = null));
}

/** Native about box matching upstream's NSAlert (OK / Apri GitHub / Apri licenza). */
export async function showAboutDialog(theme: ThemeManifest): Promise<void> {
  const res = await dialog.showMessageBox({
    type: 'info',
    title: theme.about.title,
    message: theme.about.title,
    detail: theme.about.text,
    buttons: [t('dialogs.ok'), t('dialogs.openGithub'), t('dialogs.openLicense')],
    defaultId: 0,
    cancelId: 0,
  });
  if (res.response === 1) shell.openExternal(theme.about.githubUrl);
  else if (res.response === 2) shell.openExternal(theme.about.licenseUrl);
}

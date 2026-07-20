import { app, Menu, MenuItemConstructorOptions, Tray, NativeImage, nativeImage } from 'electron';
import * as path from 'path';
import { ThemeManifest } from './types';
import { themeDir } from './themes';
import { listCustomClips } from './custom-sounds';
import { isAutostartEnabled } from './autostart';
import { isPetVisible } from './pet';
import { t } from './i18n';

let tray: Tray | null = null;

export interface TrayActions {
  onPlayBuiltin(index: number): void;
  onPlayCustom(file: string): void;
  onAddCustom(): void;
  onOpenCustomDir(): void;
  onTogglePet(): void;
  onToggleAutostart(): void;
  onShowSettings(): void;
  onShowAbout(): void;
}

/** ⌥⌘N on macOS, Ctrl+Alt+N elsewhere — matches globalShortcut registration. */
function accel(n: number): string {
  return `Alt+CommandOrControl+${n}`;
}

function hint(n: number): string {
  return process.platform === 'darwin' ? `⌥⌘${n}` : `Ctrl+Alt+${n}`;
}

/** Linux appindicator menus don't render accelerator hints — put them in the
 *  label there; elsewhere use the accelerator field (display only, the real
 *  registration is a globalShortcut). */
function clipItem(label: string, n: number, click: () => void): MenuItemConstructorOptions {
  if (process.platform === 'linux') {
    return { label: `${label}\t${hint(n)}`, click };
  }
  return { label, accelerator: accel(n), registerAccelerator: false, click };
}

function trayIcon(theme: ThemeManifest): NativeImage {
  const dir = themeDir(theme.id);
  if (process.platform === 'darwin' && theme.trayIcon.macTemplate) {
    const img = nativeImage
      .createFromPath(path.join(dir, theme.trayIcon.macTemplate))
      .resize({ width: 18, height: 18 });
    img.setTemplateImage(true);
    return img;
  }
  const img = nativeImage.createFromPath(path.join(dir, theme.trayIcon.default));
  return process.platform === 'linux' ? img.resize({ width: 24, height: 24 }) : img.resize({ width: 18, height: 18 });
}

export function createTray(theme: ThemeManifest, actions: TrayActions): void {
  if (!tray) {
    tray = new Tray(trayIcon(theme));
  } else {
    tray.setImage(trayIcon(theme));
  }
  tray.setToolTip(theme.name);
  rebuildTrayMenu(theme, actions);
}

export function rebuildTrayMenu(theme: ThemeManifest, actions: TrayActions): void {
  if (!tray) return;

  const items: MenuItemConstructorOptions[] = [];

  theme.clips.forEach((clip, i) => {
    items.push(clipItem(clip.label, i + 1, () => actions.onPlayBuiltin(i)));
  });

  const customs = listCustomClips(theme.id);
  if (customs.length > 0) {
    items.push({ type: 'separator' });
    items.push({ label: t('tray.customSection'), enabled: false });
    for (const c of customs) {
      items.push({ label: c.label, click: () => actions.onPlayCustom(c.file) });
    }
  }

  items.push({ type: 'separator' });
  items.push({ label: t('tray.addCustom'), click: actions.onAddCustom });
  items.push({ label: t('tray.openFolder'), click: actions.onOpenCustomDir });

  if (theme.pet) {
    items.push({ type: 'separator' });
    const key = isPetVisible() ? 'tray.hidePet' : 'tray.showPet';
    items.push(clipItem(t(key, { name: theme.pet.petName }), 0, actions.onTogglePet));
  }

  items.push({ type: 'separator' });
  items.push({
    label: t('tray.autostart'),
    type: 'checkbox',
    checked: isAutostartEnabled(),
    click: actions.onToggleAutostart,
  });
  items.push({ label: t('tray.settings'), click: actions.onShowSettings });
  items.push({ label: t('tray.about'), click: actions.onShowAbout });
  items.push({ label: t('tray.quit'), click: () => app.quit() });

  tray.setContextMenu(Menu.buildFromTemplate(items));
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}

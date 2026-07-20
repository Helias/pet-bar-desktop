import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const DESKTOP_FILE = 'pet-bar.desktop';

function autostartDir(): string {
  const config = process.env.XDG_CONFIG_HOME || path.join(app.getPath('home'), '.config');
  return path.join(config, 'autostart');
}

function desktopFilePath(): string {
  return path.join(autostartDir(), DESKTOP_FILE);
}

/** Command that relaunches this app: the packaged binary, or electron + app dir in dev. */
function execLine(): string {
  const quote = (s: string) => `"${s.replace(/"/g, '\\"')}"`;
  if (app.isPackaged) return quote(process.execPath);
  return `${quote(process.execPath)} ${quote(app.getAppPath())}`;
}

export function isAutostartEnabled(): boolean {
  if (process.platform === 'linux') return fs.existsSync(desktopFilePath());
  return app.getLoginItemSettings().openAtLogin;
}

export function setAutostart(enabled: boolean): void {
  if (process.platform === 'linux') {
    if (enabled) {
      fs.mkdirSync(autostartDir(), { recursive: true });
      fs.writeFileSync(
        desktopFilePath(),
        [
          '[Desktop Entry]',
          'Type=Application',
          'Name=Pet Bar',
          `Exec=${execLine()}`,
          'X-GNOME-Autostart-enabled=true',
          'Comment=Soundboard + desktop pet (fan project)',
          '',
        ].join('\n'),
      );
    } else {
      try {
        fs.unlinkSync(desktopFilePath());
      } catch {
        /* already absent */
      }
    }
  } else {
    app.setLoginItemSettings({ openAtLogin: enabled });
  }
}

export function toggleAutostart(): boolean {
  const next = !isAutostartEnabled();
  setAutostart(next);
  return next;
}

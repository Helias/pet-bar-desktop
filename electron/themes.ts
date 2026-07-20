import { app, protocol, net } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { ThemeManifest } from './types';
import { getSettings, updateSettings } from './settings';

/** Extensions probed when resolving a built-in clip basename (upstream order).
 *  aiff/aif/caf stay listed so files show up in menus even though Chromium
 *  cannot decode them (fetch-clips.sh transcodes those to m4a). */
export const AUDIO_EXTS = ['mp3', 'mp4', 'm4a', 'wav', 'aiff', 'aif', 'caf'];

export function themesRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'themes')
    : path.join(app.getAppPath(), 'themes');
}

export function themeDir(id: string): string {
  return path.join(themesRoot(), id);
}

export function listThemes(): ThemeManifest[] {
  const out: ThemeManifest[] = [];
  for (const entry of fs.readdirSync(themesRoot(), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(themesRoot(), entry.name, 'theme.json');
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ThemeManifest;
      if (m.id && m.name && Array.isArray(m.clips)) out.push(m);
    } catch {
      /* dir without a valid manifest — ignore */
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function activeTheme(): ThemeManifest {
  const themes = listThemes();
  const wanted = getSettings().themeId;
  const found = themes.find((t) => t.id === wanted) ?? themes[0];
  if (!found) throw new Error('No valid theme found in ' + themesRoot());
  if (found.id !== wanted) updateSettings({ themeId: found.id });
  return found;
}

/** Resolve a built-in clip basename to an absolute path, probing extensions
 *  like upstream. Returns null when the clip is absent (menu item stays, play
 *  is a no-op — mirrors upstream's silent lookup failure). */
export function resolveClip(themeId: string, base: string): string | null {
  const dir = path.join(themeDir(themeId), 'clips');
  for (const ext of AUDIO_EXTS) {
    const p = path.join(dir, `${base}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** theme:// serves theme assets and custom sounds to the renderer regardless
 *  of whether the page came from http (dev) or file (prod).
 *    theme://themes/<id>/<relpath>   → <themesRoot>/<id>/<relpath>
 *    theme://custom/<id>/<file>      → <userData>/custom/<id>/<file>
 */
export function registerThemeSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'theme', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

export function registerThemeProtocol(customRoot: string): void {
  protocol.handle('theme', (request) => {
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const kind = url.host; // 'themes' | 'custom'
    const root = kind === 'custom' ? customRoot : themesRoot();
    const target = path.join(root, ...segments);
    // Prevent escaping the served roots via ".." segments.
    if (!target.startsWith(root + path.sep)) {
      return new Response('forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(target).toString());
  });
}

export function themeAssetUrl(themeId: string, relPath: string): string {
  return 'theme://themes/' + encodeURIComponent(themeId) + '/' + encodeURI(relPath);
}

export function customAssetUrl(themeId: string, file: string): string {
  return 'theme://custom/' + encodeURIComponent(themeId) + '/' + encodeURIComponent(file);
}

export function clipUrl(themeId: string, base: string): string | null {
  const abs = resolveClip(themeId, base);
  if (!abs) return null;
  return themeAssetUrl(themeId, 'clips/' + path.basename(abs));
}

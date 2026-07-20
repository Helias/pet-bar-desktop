import { ThemeManifest, PlayCommand } from './types';
import { clipUrl, customAssetUrl } from './themes';
import { listCustomClips } from './custom-sounds';
import { getPetWindow } from './pet';

/** Playback lives in the pet window's renderer (an always-existing, possibly
 *  hidden BrowserWindow keeps playing audio). Main only forwards commands;
 *  toggle/switch/30s-cap semantics sit next to the <audio> element. */

function send(cmd: 'playback:play' | 'playback:stop', payload?: PlayCommand): void {
  const win = getPetWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send(cmd, payload);
}

export function playBuiltinBase(theme: ThemeManifest, base: string): void {
  const url = clipUrl(theme.id, base);
  if (!url) return; // clip files absent — silent no-op like upstream
  send('playback:play', { token: 'builtin:' + base, url });
}

export function playBuiltinIndex(theme: ThemeManifest, index: number): void {
  const clip = theme.clips[index];
  if (clip) playBuiltinBase(theme, clip.file);
}

export function playCustomFile(theme: ThemeManifest, file: string): void {
  const exists = listCustomClips(theme.id).some((c) => c.file === file);
  if (!exists) return;
  send('playback:play', { token: 'custom:' + file, url: customAssetUrl(theme.id, file) });
}

export function stopPlayback(): void {
  send('playback:stop');
}

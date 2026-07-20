import { app, dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AUDIO_EXTS } from './themes';
import { t } from './i18n';

export function customRoot(): string {
  return path.join(app.getPath('userData'), 'custom');
}

export function customDir(themeId: string): string {
  const dir = path.join(customRoot(), themeId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface CustomClip {
  /** Menu label: filename without extension. */
  label: string;
  file: string;
  absPath: string;
}

export function listCustomClips(themeId: string): CustomClip[] {
  const dir = customDir(themeId);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => AUDIO_EXTS.includes(path.extname(f).slice(1).toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((f) => ({
      label: f.replace(/\.[^.]+$/, ''),
      file: f,
      absPath: path.join(dir, f),
    }));
}

/** File picker → copy into the theme's custom dir (overwriting same basename). */
export async function addCustomSound(themeId: string): Promise<boolean> {
  const res = await dialog.showOpenDialog({
    title: t('dialogs.chooseAudio'),
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: AUDIO_EXTS }],
  });
  if (res.canceled || res.filePaths.length === 0) return false;
  const src = res.filePaths[0];
  const dst = path.join(customDir(themeId), path.basename(src));
  try {
    fs.copyFileSync(src, dst);
    return true;
  } catch (e) {
    console.error('Copy failed:', e);
    return false;
  }
}

export function openCustomDir(themeId: string): void {
  shell.openPath(customDir(themeId));
}

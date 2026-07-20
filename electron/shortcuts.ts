import { globalShortcut } from 'electron';
import { ThemeManifest } from './types';

export interface ShortcutActions {
  onClip(index: number): void;
  onTogglePet(): void;
}

/** Ctrl+Alt+1..9 play clips, Ctrl+Alt+0 toggles the pet (⌥⌘N on macOS).
 *  Note: on Linux this uses X11 grabs — no-op under Wayland (see README). */
export function registerShortcuts(theme: ThemeManifest, actions: ShortcutActions): void {
  globalShortcut.unregisterAll();
  theme.clips.forEach((_clip, i) => {
    globalShortcut.register(`Alt+CommandOrControl+${i + 1}`, () => actions.onClip(i));
  });
  if (theme.pet) {
    globalShortcut.register('Alt+CommandOrControl+0', () => actions.onTogglePet());
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}

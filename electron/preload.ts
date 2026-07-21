import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type Listener<T> = (payload: T) => void;

function on<T>(channel: string, cb: Listener<T>): () => void {
  const wrapped = (_e: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api = {
  // --- pet window (audio host + pet + bubble) ---
  getPetInit: () => ipcRenderer.invoke('pet:init'),
  onPlay: (cb: Listener<{ token: string; url: string }>) => on('playback:play', cb),
  onStop: (cb: Listener<void>) => on('playback:stop', cb),
  onPetShow: (cb: Listener<void>) => on('pet:show', cb),
  onPetHide: (cb: Listener<void>) => on('pet:hide', cb),
  onBubbleShow: (cb: Listener<{ text: string; style: 'down' | 'up' }>) => on('bubble:show', cb),
  onBubbleHide: (cb: Listener<void>) => on('bubble:hide', cb),
  onThemeChanged: (cb: Listener<unknown>) => on('theme:changed', cb),
  onPetScaleChanged: (cb: Listener<number>) => on('pet:scale-changed', cb),
  petHidden: () => ipcRenderer.send('pet:hidden'),
  petClicked: () => ipcRenderer.send('pet:clicked'),
  petDragBy: (dx: number, dy: number) => ipcRenderer.send('pet:drag', dx, dy),
  petDragEnd: () => ipcRenderer.send('pet:drag-end'),
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('pet:set-ignore-mouse', ignore),
  bubbleRegion: (region: { x: number; y: number; width: number; height: number } | null) =>
    ipcRenderer.send('bubble:region', region),
  bubbleClicked: () => ipcRenderer.send('bubble:clicked'),

  // --- ask dialog ---
  getAskInit: () => ipcRenderer.invoke('ask:init'),
  askSubmit: (text: string) => ipcRenderer.send('ask:submit', text),
  askCancel: () => ipcRenderer.send('ask:cancel'),

  // --- i18n (all windows) ---
  getUiLang: () => ipcRenderer.invoke('app:lang'),
  onLangChanged: (cb: Listener<string>) => on('lang:changed', cb),

  // --- settings window ---
  getSettingsState: () => ipcRenderer.invoke('settings:state'),
  setLanguage: (pref: string) => ipcRenderer.invoke('settings:set-language', pref),
  setAppearance: (pref: string) => ipcRenderer.invoke('settings:set-appearance', pref),
  setTheme: (id: string) => ipcRenderer.invoke('settings:set-theme', id),
  setPetScale: (scale: number) => ipcRenderer.invoke('settings:set-pet-scale', scale),
  setAutostart: (enabled: boolean) => ipcRenderer.invoke('settings:set-autostart', enabled),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
};

export type ArmadilloApi = typeof api;

contextBridge.exposeInMainWorld('armadillo', api);

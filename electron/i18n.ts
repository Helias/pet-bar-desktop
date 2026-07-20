import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/** Locale files are shared with the renderer (Transloco): single source of
 *  truth in ui/public/i18n/, shipped inside the built UI as i18n/. */

export type Lang = 'it' | 'en';
export type LangPref = 'system' | Lang;

let dict: Record<string, unknown> = {};
let lang: Lang = 'it';

function localesDir(): string {
  return process.env.ELECTRON_START_URL
    ? path.join(app.getAppPath(), 'ui/public/i18n')
    : path.join(app.getAppPath(), 'ui/dist/ui/browser/i18n');
}

export function effectiveLang(pref: LangPref | undefined): Lang {
  if (pref === 'it' || pref === 'en') return pref;
  return app.getLocale().toLowerCase().startsWith('it') ? 'it' : 'en';
}

export function loadLang(pref: LangPref | undefined): void {
  lang = effectiveLang(pref);
  try {
    dict = JSON.parse(fs.readFileSync(path.join(localesDir(), `${lang}.json`), 'utf8'));
  } catch (e) {
    console.error(`Failed to load locale ${lang}:`, e);
    dict = {};
  }
}

export function currentLang(): Lang {
  return lang;
}

export function t(key: string, params?: Record<string, string>): string {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  let out = typeof node === 'string' ? node : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v);
    }
  }
  return out;
}

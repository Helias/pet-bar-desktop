import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import en from '../../public/i18n/en.json';
import it from '../../public/i18n/it.json';

/** Locale files are bundled statically: the app runs from file:// where an
 *  HTTP loader could not fetch them. The same JSONs ship as i18n/ for the
 *  Electron main process (tray menus, native dialogs). */
@Injectable({ providedIn: 'root' })
export class StaticTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of((lang === 'en' ? en : it) as Translation);
  }
}

import { Component, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { armadilloApi } from './electron-api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  constructor(transloco: TranslocoService, zone: NgZone) {
    const api = armadilloApi();
    if (!api) return; // plain-browser dev, no preload
    api.getUiLang().then((lang) => zone.run(() => transloco.setActiveLang(lang)));
    api.onLangChanged((lang) => zone.run(() => transloco.setActiveLang(lang)));
  }
}

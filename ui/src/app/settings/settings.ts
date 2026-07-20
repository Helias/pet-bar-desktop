import { Component, OnInit, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppearancePref, armadilloApi, ArmadilloApi, LangPref, SettingsState } from '../electron-api';

@Component({
  selector: 'app-settings',
  imports: [TranslocoPipe],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private api: ArmadilloApi = armadilloApi();

  state = signal<SettingsState | null>(null);

  readonly langOptions: { value: LangPref; labelKey?: string; label?: string }[] = [
    { value: 'system', labelKey: 'settings.langSystem' },
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'English' },
  ];

  /** Picker-button styling for the selected / unselected states. */
  readonly selectedCls = 'border-amber-600 bg-amber-50 dark:bg-amber-950';
  readonly unselectedCls = 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800';

  readonly appearanceOptions: { value: AppearancePref; labelKey: string }[] = [
    { value: 'system', labelKey: 'settings.appearanceSystem' },
    { value: 'light', labelKey: 'settings.appearanceLight' },
    { value: 'dark', labelKey: 'settings.appearanceDark' },
  ];

  constructor(private transloco: TranslocoService) {}

  async ngOnInit(): Promise<void> {
    document.title = this.transloco.translate('settings.title');
    this.state.set(await this.api.getSettingsState());
  }

  async selectLanguage(pref: LangPref): Promise<void> {
    const s = this.state();
    if (!s || s.language === pref) return;
    const effective = await this.api.setLanguage(pref);
    this.state.set({ ...s, language: pref, effectiveLang: effective });
  }

  async selectTheme(id: string): Promise<void> {
    const s = this.state();
    if (!s || s.themeId === id) return;
    const res = await this.api.setTheme(id);
    this.state.set({ ...s, themeId: res.themeId, about: res.about });
  }

  async selectAppearance(pref: AppearancePref): Promise<void> {
    const s = this.state();
    if (!s || s.appearance === pref) return;
    await this.api.setAppearance(pref);
    this.state.set({ ...s, appearance: pref });
  }

  async toggleAutostart(): Promise<void> {
    const s = this.state();
    if (!s) return;
    const enabled = await this.api.setAutostart(!s.autostart);
    this.state.set({ ...s, autostart: enabled });
  }

  open(url: string): void {
    this.api.openExternal(url);
  }
}

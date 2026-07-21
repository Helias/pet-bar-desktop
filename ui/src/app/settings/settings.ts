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
  /** Slider position in percent; tracks the drag before the value is committed. */
  petScalePct = signal(100);

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
    const s = await this.api.getSettingsState();
    this.state.set(s);
    this.petScalePct.set(Math.round(s.petScale * 100));
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

  onPetScaleInput(value: string): void {
    const pct = parseInt(value, 10);
    if (Number.isFinite(pct)) this.petScalePct.set(pct);
  }

  async commitPetScale(value: string): Promise<void> {
    const s = this.state();
    const pct = parseInt(value, 10);
    if (!s || !Number.isFinite(pct)) return;
    const applied = await this.api.setPetScale(pct / 100);
    this.petScalePct.set(Math.round(applied * 100));
    this.state.set({ ...s, petScale: applied });
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

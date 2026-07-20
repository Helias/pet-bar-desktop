import { Component, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import {
  armadilloApi,
  ArmadilloApi,
  BubblePayload,
  RendererTheme,
  BUBBLE_H,
  BUBBLE_OVERLAP,
  BUBBLE_TAIL_FRAC,
  BUBBLE_VISIBLE_SECONDS,
  BUBBLE_W,
  DRAG_THRESHOLD_PX,
  MAX_CLIP_SECONDS,
  PET_H,
  PET_W,
  PET_X,
  PET_Y,
  SNOUT_FRAC,
  TAIL_TIP_FRAC,
  TALK_INTERVAL_MS,
  WIN_W,
} from '../electron-api';

/** Pet + speech bubble + the app's audio host, all in one transparent window.
 *  The window always exists (audio keeps playing while it is hidden); the pet
 *  being "hidden" means the whole window is hidden by the main process. */
@Component({
  selector: 'app-pet',
  templateUrl: './pet.html',
  styleUrl: './pet.css',
})
export class Pet implements OnInit, OnDestroy {
  private api: ArmadilloApi = armadilloApi();
  private unsubs: (() => void)[] = [];

  theme = signal<RendererTheme | null>(null);
  petShown = signal(false);
  mouthOpen = signal(false);
  bubble = signal<(BubblePayload & { left: number; top: number }) | null>(null);

  readonly PET_W = PET_W;
  readonly PET_H = PET_H;
  readonly PET_X = PET_X;
  readonly PET_Y = PET_Y;
  readonly BUBBLE_W = BUBBLE_W;
  readonly BUBBLE_H = BUBBLE_H;
  readonly tailH = Math.round(BUBBLE_H * BUBBLE_TAIL_FRAC);

  private audio = new Audio();
  private currentToken: string | null = null;
  private capTimer: ReturnType<typeof setTimeout> | null = null;
  private talkTimer: ReturnType<typeof setInterval> | null = null;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;

  // drag state
  private dragging = false;
  private downX = 0;
  private downY = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(private zone: NgZone) {}

  async ngOnInit(): Promise<void> {
    const init = await this.api.getPetInit();
    this.zone.run(() => {
      this.applyTheme(init.theme);
      this.petShown.set(init.petVisible);
    });

    const z =
      <A extends unknown[]>(cb: (...a: A) => void) =>
      (...a: A) =>
        this.zone.run(() => cb(...a));
    this.unsubs.push(
      this.api.onPlay(z((p) => this.play(p.token, p.url))),
      this.api.onStop(z(() => this.stop())),
      this.api.onPetShow(z(() => this.petShown.set(true))),
      this.api.onPetHide(z(() => this.hidePet())),
      this.api.onBubbleShow(z((p) => this.showBubble(p))),
      this.api.onBubbleHide(z(() => this.dismissBubble())),
      this.api.onThemeChanged(z((t) => this.applyTheme(t))),
    );

    this.audio.addEventListener('ended', () => this.zone.run(() => this.onPlaybackEnded()));
  }

  ngOnDestroy(): void {
    this.unsubs.forEach((u) => u());
    this.stop();
  }

  // --- theme ---

  private applyTheme(t: RendererTheme): void {
    this.stop();
    this.dismissBubble();
    this.petShown.set(false);
    this.theme.set(t);
    const font = t.manifest.pet?.fontFile;
    if (font) {
      const face = new FontFace('Bangers', `url("${t.baseUrl}${encodeURI(font)}")`);
      face
        .load()
        .then((f) => (document.fonts as unknown as { add(f: FontFace): void }).add(f))
        .catch(() => {});
    }
  }

  assetUrl(rel: string | undefined): string {
    const t = this.theme();
    return t && rel ? t.baseUrl + encodeURI(rel) : '';
  }

  // --- audio host (toggle / switch / 30 s cap, like upstream) ---

  private play(token: string, url: string): void {
    if (this.currentToken === token && !this.audio.paused) {
      this.stop();
      return;
    }
    this.stop();
    this.currentToken = token;
    this.audio.src = url;
    this.audio
      .play()
      .then(() => {
        this.startTalking();
        this.capTimer = setTimeout(
          () => this.zone.run(() => this.stop()),
          MAX_CLIP_SECONDS * 1000,
        );
      })
      .catch(() => {
        // Undecodable/missing file — degrade to a silent no-op.
        this.currentToken = null;
      });
  }

  private stop(): void {
    if (this.capTimer) clearTimeout(this.capTimer);
    this.capTimer = null;
    this.audio.pause();
    this.currentToken = null;
    this.stopTalking();
  }

  private onPlaybackEnded(): void {
    this.stop();
  }

  // --- talking animation (~8 Hz mouth toggle while audio plays) ---

  private startTalking(): void {
    if (!this.theme()?.manifest.pet?.open) return; // no open-mouth art → skip
    if (this.talkTimer) return;
    this.talkTimer = setInterval(
      () => this.zone.run(() => this.mouthOpen.update((v) => !v)),
      TALK_INTERVAL_MS,
    );
  }

  private stopTalking(): void {
    if (this.talkTimer) clearInterval(this.talkTimer);
    this.talkTimer = null;
    this.mouthOpen.set(false);
  }

  // --- pet show / hide ---

  private hidePet(): void {
    this.petShown.set(false);
    this.dismissBubble();
    // Match the 0.18 s fade-out before main hides the window.
    setTimeout(() => this.api.petHidden(), 200);
  }

  // --- bubble ---

  private showBubble(p: BubblePayload): void {
    const snoutX = PET_X + PET_W * SNOUT_FRAC;
    let left = snoutX - BUBBLE_W * TAIL_TIP_FRAC;
    left = Math.min(Math.max(left, 4), WIN_W - BUBBLE_W - 4);
    const top =
      p.style === 'down' ? PET_Y - BUBBLE_H + BUBBLE_OVERLAP : PET_Y + PET_H - BUBBLE_OVERLAP;
    this.bubble.set({ ...p, left, top });
    this.api.bubbleRegion({ x: left, y: top, width: BUBBLE_W, height: BUBBLE_H });
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(
      () => this.zone.run(() => this.dismissBubble()),
      BUBBLE_VISIBLE_SECONDS * 1000,
    );
  }

  dismissBubble(): void {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = null;
    if (this.bubble()) this.api.bubbleRegion(null);
    this.bubble.set(null);
  }

  bubbleImage(): string {
    const pet = this.theme()?.manifest.pet;
    const b = this.bubble();
    if (!pet || !b) return '';
    return this.assetUrl(b.style === 'down' ? pet.bubbleDown : pet.bubbleUp);
  }

  // --- pointer handling: click-through toggling + drag-vs-click ---

  onEnterInteractive(): void {
    this.api.setIgnoreMouse(false);
  }

  onLeaveInteractive(): void {
    if (!this.dragging) this.api.setIgnoreMouse(true);
  }

  onPetPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.dragging = false;
    this.downX = e.screenX;
    this.downY = e.screenY;
    this.lastX = e.screenX;
    this.lastY = e.screenY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  onPetPointerMove(e: PointerEvent): void {
    if (!(e.buttons & 1)) return;
    if (!this.dragging) {
      const dist = Math.hypot(e.screenX - this.downX, e.screenY - this.downY);
      if (dist <= DRAG_THRESHOLD_PX) return;
      this.dragging = true;
    }
    const dx = e.screenX - this.lastX;
    const dy = e.screenY - this.lastY;
    if (dx !== 0 || dy !== 0) {
      this.lastX = e.screenX;
      this.lastY = e.screenY;
      this.api.petDragBy(dx, dy);
    }
  }

  onPetPointerUp(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (this.dragging) {
      this.dragging = false;
      this.api.petDragEnd();
    } else {
      this.api.petClicked();
    }
  }

  onBubbleClick(): void {
    this.dismissBubble();
    this.api.setIgnoreMouse(true);
  }
}

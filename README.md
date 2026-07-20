# 🦔 Pet Bar

> ⚠️ **FAN PROJECT NON COMMERCIALE — NON-COMMERCIAL FAN PROJECT**  
> Questo è un progetto amatoriale gratuito, open source, senza scopo di lucro né valore commerciale, creato da un fan delle opere di **Zerocalcare** (Michele Rech) per uso personale e di altri fan. Non è affiliato, sponsorizzato, approvato o in alcun modo connesso con Zerocalcare, Bao Publishing, Netflix, Movimenti Production, Dogville o con i collaboratori, doppiatori e detentori dei diritti delle sue opere. Tutti i marchi, titoli, personaggi, dialoghi e opere derivate sono proprietà dei rispettivi titolari.  
> Le immagini dell'armadillo usate nell'app sono **generate da modelli di intelligenza artificiale** (Higgsfield / Nano Banana) come reinterpretazione di fan, NON sono disegni originali di Zerocalcare.  
> I clip audio usati a scopo dimostrativo sono stati scaricati da YouTube (contenuti pubblicamente accessibili caricati da terzi) e usati qui esclusivamente per scopo illustrativo, satirico e di omaggio alle opere. **Nessun ricavo, donazione, pubblicità o monetizzazione è associato a questo progetto.**  
> Se sei il titolare dei diritti e desideri la rimozione dei contenuti, scrivi a **andrearicciotti1@gmail.com** o apri una [issue](../../issues): i file verranno rimossi tempestivamente, entro 24 ore, senza discussione.

Cross-platform (Linux / macOS / Windows) port of two macOS menu-bar apps by
[andrearicciotti1](https://github.com/andrearicciotti1), rebuilt with
**Electron + TypeScript + Angular + TailwindCSS**:

- [armadillo-bar](https://github.com/andrearicciotti1/armadillo-bar) — soundboard +
  floating "Clippy" armadillo desktop pet (Zerocalcare fan project)
- [boris-bar](https://github.com/andrearicciotti1/boris-bar) — soundboard for the Italian
  TV series *Boris*

Each upstream app is a selectable **theme** (Settings → Tema). The original Swift sources
live in [`macos-upstream/`](macos-upstream/) as a behavior reference; the upstream git
history is preserved in this repository.

## ✨ Features

- 🎛 Tray icon with the full soundboard menu (labels in Italian, as upstream)
- 🎧 9 built-in clips per theme with global shortcuts (`Ctrl+Alt+1…9`, on macOS `⌥⌘1…9`)
- ➕ Custom sounds via file picker, per theme ("Aggiungi suono personalizzato…")
- ⏱ 30 s max per clip; re-triggering a playing clip stops it
- 🦔 **Armadillo Clippy** (armadillo theme) — transparent, draggable, always-on-top desktop
  pet; appears every ~10–12 minutes with an iconic phrase in a hand-drawn speech bubble;
  toggle manually with `Ctrl+Alt+0` (`⌥⌘0`); its mouth animates while audio plays
- 💬 **"Chiedi all'armadillo"** — click the pet, ask a question, get an audio clip or a
  bubble reply
- 🎨 Theme picker (Armadillo / Boris), 🌍 UI language (system / Italiano / English, via
  [Transloco](https://jsverse.github.io/transloco/)), 🌗 appearance (system / light / dark)
- 🚀 Start at login; single instance; CLI verbs against the running app:
  `pet-bar --play N`, `pet-bar --toggle-pet`

## 📦 Install

Prebuilt artifacts (AppImage, deb, dmg, NSIS) are produced by `npm run build` /
`electron-builder` — see Releases when available. The audio clips are **not** in this git
repository (same distribution policy as upstream, which ships them only inside its release
DMGs); release artifacts include them, source builds fetch them:

```bash
# one-time: download the clips from the upstream release DMGs
# requires: curl, 7z (p7zip-full), ffmpeg
./scripts/fetch-clips.sh
```

### Build from source

```bash
npm install
npm --prefix ui install
./scripts/fetch-clips.sh   # audio clips (optional — app runs silent without them)
npm run start              # build UI + main process and run the app
npm run dev                # dev loop: ng serve + electron against localhost:4200
npm run build              # Linux AppImage + deb into release/
npm run build:mac          # dmg   (run on macOS)
npm run build:win          # NSIS  (run on Windows / wine)
```

## 🐧 Linux notes

- **Wayland**: global shortcuts use X11 grabs and do **not** work under GNOME Wayland.
  Workarounds: use an X11 session, or bind GNOME custom shortcuts to the CLI verbs, e.g.
  `pet-bar --play 1` … `--play 9` and `pet-bar --toggle-pet` (they reach the
  running instance through the single-instance lock).
- **Transparency**: the pet window needs a compositor. If you see a black rectangle behind
  the armadillo, try launching with `--enable-transparent-visuals --disable-gpu`.
- Autostart uses `~/.config/autostart/pet-bar.desktop`.

## 🎨 Themes

A theme is a folder under `themes/<id>/` with a `theme.json` manifest (clips, tray icon,
about/disclaimer, optional pet with artwork + phrases). Drop a new folder with a valid
manifest and it appears in Settings — no code changes needed.

---

## Disclaimer — tema Armadillo (verbatim, dall'app upstream)

> Armadillo Bar è un progetto amatoriale, gratuito, open source, senza scopo di lucro,
> creato da un fan di Zerocalcare.
>
> NON AFFILIAZIONE. Non è un prodotto ufficiale. Non è affiliato, sponsorizzato o
> approvato da Zerocalcare (Michele Rech), Bao Publishing, Netflix, Movimenti Production o
> altri editori/produttori.
>
> ORIGINE AUDIO. I clip sono brevi estratti (pochi secondi) scaricati da YouTube, da video
> pubblicamente accessibili caricati da terzi. Usati esclusivamente a scopo di omaggio,
> critica, commento, satira, parodia e pastiche (art. 70 L. 633/1941, dir. UE 2019/790
> art. 17(7)).
>
> NESSUN LUCRO. Nessuna vendita, donazione, pubblicità, tracking o monetizzazione di alcun
> tipo.
>
> PROPRIETÀ. Tutti i marchi, personaggi, dialoghi, nomi e loghi sono proprietà dei
> rispettivi titolari.
>
> GRAFICA AI. Le illustrazioni dell'armadillo sono generate da modelli di AI (Higgsfield /
> Nano Banana) come reinterpretazione di fan; non sono disegni originali di Zerocalcare.
>
> TAKEDOWN / DMCA. I detentori di diritti possono richiedere la rimozione scrivendo a
> andrearicciotti1@gmail.com o aprendo una issue su GitHub. Richieste legittime onorate
> entro 24h.

## Disclaimer — tema Boris (verbatim, dall'app upstream)

> Boris Bar è un progetto amatoriale, gratuito, open source, senza scopo di lucro, creato
> da un fan della serie TV italiana Boris.
>
> NON AFFILIAZIONE. Non è un prodotto ufficiale. Non è affiliato, sponsorizzato o
> approvato da RAI, Wildside, Sky, Mediaset, Disney+ né dagli autori della serie
> (Ciarrapico, Vendruscolo, Torre) o dagli interpreti.
>
> ORIGINE AUDIO. I clip sono brevi estratti (pochi secondi) scaricati da YouTube, da video
> pubblicamente accessibili caricati da terzi. Usati esclusivamente a scopo di omaggio,
> critica, commento, satira, parodia e pastiche (art. 70 L. 633/1941, dir. UE 2019/790
> art. 17(7)).
>
> NESSUN LUCRO. Nessuna vendita, donazione, pubblicità, tracking o monetizzazione di alcun
> tipo.
>
> PROPRIETÀ. Tutti i marchi, personaggi, dialoghi, nomi e loghi sono proprietà dei
> rispettivi titolari.
>
> TAKEDOWN / DMCA. I detentori di diritti possono richiedere la rimozione scrivendo a
> andrearicciotti1@gmail.com o aprendo una issue su GitHub. Richieste legittime onorate
> entro 24h.

Vedi anche [`DISCLAIMER.txt`](DISCLAIMER.txt) (armadillo) e
[`themes/boris/DISCLAIMER.txt`](themes/boris/DISCLAIMER.txt) (boris).

## License

Code: [MIT](LICENSE) — © upstream Andrea Ricciotti / PunxCode, port © contributors of this
repository. Artwork and audio: see the disclaimers above; all rights belong to their
respective owners.

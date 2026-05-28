# 🦔 Armadillo Bar

> ⚠️ **FAN PROJECT NON COMMERCIALE — NON-COMMERCIAL FAN PROJECT**  
> Questo è un progetto amatoriale gratuito, open source, senza scopo di lucro né valore commerciale, creato da un fan delle opere di **Zerocalcare** (Michele Rech) per uso personale e di altri fan. Non è affiliato, sponsorizzato, approvato o in alcun modo connesso con Zerocalcare, Bao Publishing, Netflix, Movimenti Production, Dogville o con i collaboratori, doppiatori e detentori dei diritti delle sue opere. Tutti i marchi, titoli, personaggi, dialoghi e opere derivate sono proprietà dei rispettivi titolari.  
> Le immagini dell'armadillo usate nell'app sono **generate da modelli di intelligenza artificiale** (Higgsfield / Nano Banana) come reinterpretazione di fan, NON sono disegni originali di Zerocalcare.  
> I clip audio usati a scopo dimostrativo sono stati scaricati da YouTube (contenuti pubblicamente accessibili caricati da terzi) e usati qui esclusivamente per scopo illustrativo, satirico e di omaggio alle opere. **Nessun ricavo, donazione, pubblicità o monetizzazione è associato a questo progetto.**  
> Se sei il titolare dei diritti e desideri la rimozione dei contenuti, scrivi a **andrearicciotti1@gmail.com** o apri una [issue](../../issues): i file verranno rimossi tempestivamente, entro 24 ore, senza discussione.

## ⬇️ [Download ArmadilloBar-1.0.dmg](https://github.com/andrearicciotti1/armadillo-bar/releases/latest/download/ArmadilloBar-1.0.dmg)

---

Menu bar app macOS ispirata alle opere di **Zerocalcare** (*Strappare lungo i bordi*, *Questo mondo non mi renderà cattivo* e dintorni). Frasi iconiche romane a portata di shortcut globale, dalla menu bar del Mac.

Ultra-leggera (~4 MB RAM idle), zero dipendenze, Swift nativo + Cocoa + AVFoundation.

---

## ✨ Features

- 🦔 Icona armadillo nella menu bar (invisibile nel Dock)
- 🎧 9 clip audio con shortcut globali `⌥⌘1` … `⌥⌘9`
- ➕ Carica i tuoi suoni personalizzati via file picker
- ⏱ Durata max 30s per clip, toggle start/stop premendo di nuovo lo shortcut
- 🦔 **Armadillo Clippy** — compare automaticamente ogni ~10-12 minuti con una frase iconica in un balloon fumetto disegnato a mano; si può evocare/nascondere manualmente con `⌥⌘0`
- 💬 **Dialog "Chiedi all'Armadillo"** — clicca sull'armadillo, fai una domanda; risponde con un clip audio o un balloon
- 🚀 Avvia al login (opzionale, togglable dal menu)
- 🪶 Binario universal arm64+x86_64, ~100 KB, nessun Electron, nessun Python

---

## 📦 Installazione

### Opzione A — DMG (consigliata)

1. Scarica `ArmadilloBar-1.0.dmg` dall'ultima [Release](../../releases/latest)
2. Aprilo e trascina `ArmadilloBar.app` nella cartella `Applications`
3. **Primo avvio — rimuovere la quarantena:** l'app non è firmata Apple Developer ID, quindi macOS la marca come "danneggiata". Apri Terminale e lancia una volta:
   ```bash
   xattr -cr /Applications/ArmadilloBar.app
   ```
   Poi apri l'app normalmente col doppio click.
4. Clicca l'armadillo nella menu bar → scegli una frase.

### Opzione B — Build dai sorgenti

```bash
git clone https://github.com/andrearicciotti1/armadillo-bar.git
cd armadillo-bar
# Metti i tuoi file audio (mp3/wav/m4a) in assets/clips/
./build.sh
open ArmadilloBar.app
```

Richiede macOS 13 (Ventura) o superiore e Command Line Tools (`xcode-select --install`).  
Compatibile con Ventura, Sonoma, Sequoia e Tahoe. Universal binary (Apple Silicon + Intel).

---

## 🎵 Aggiungere suoni personalizzati

Dal menu dell'app:

- **"Aggiungi suono personalizzato…"** → file picker → il suono viene copiato in  
  `~/Library/Application Support/ArmadilloBar/custom/` e compare nel menu
- **"Apri cartella suoni"** → per rinominare/cancellare manualmente

Formati supportati: `mp3`, `mp4`, `m4a`, `wav`, `aiff`, `caf`.  
Nome file = label nel menu.

---

## ⌨️ Shortcut globali predefiniti

| Shortcut | Clip |
|----------|------|
| `⌥⌘1`    | Cintura nera |
| `⌥⌘2`    | Dietro le quinte |
| `⌥⌘3`    | Il silenzio prima… |
| `⌥⌘4`    | Le cose succedono |
| `⌥⌘5`    | Soggetto consapevole |
| `⌥⌘6`    | Vola basso |
| `⌥⌘7`    | Ti raggiungo col coso |
| `⌥⌘8`    | Annamo a pija er gelato |
| `⌥⌘9`    | Zona d'ombra |

Funzionano ovunque, anche senza aprire il menu. Ripremere lo stesso shortcut ferma la riproduzione.

---

## 🛠 Stack tecnico

- **Swift** (multi-file: `armadillo_bar.swift`, `ArmadilloClippyWindow.swift`, `ClippyBubblePanel.swift`, `ArmadilloAskWindow.swift`)
- **Cocoa** — NSStatusItem, NSMenu
- **AVFoundation** — AVAudioPlayer
- **ServiceManagement** — SMAppService per login item (macOS 13+)
- **Carbon.HIToolbox** — RegisterEventHotKey per shortcut globali (zero permessi accessibility)
- Binario universal arm64 + x86_64 pinned `minos=13.0` (Ventura → Tahoe + futuro, Apple Silicon + Intel)

---

## 📜 Licenza e disclaimer

### Codice sorgente
Licenza [MIT](LICENSE) — libero uso, modifica, redistribuzione per il **codice**.

### Contenuti audio (estratti dalle opere di Zerocalcare)
- **Non sono mia proprietà.** Tutti i diritti su dialoghi, personaggi (incluso l'Armadillo, alter ego della coscienza di Zero), opere originali appartengono a **Michele Rech (Zerocalcare)**, **Bao Publishing**, **Netflix**, **Movimenti Production**, **Dogville** e ai relativi collaboratori.
- **Provenienza:** i clip audio di default sono stati **scaricati da YouTube**, estratti da video di terzi pubblicamente accessibili.
- **Uso:** esclusivamente illustrativo, satirico, di omaggio (*tribute*), educativo e di commento critico.
- **Fair use / eccezioni copyright:** il progetto si appoggia ai principi di *fair use* (USA) / *fair dealing* e alle eccezioni per critica, recensione, caricatura, parodia e pastiche previste dalla direttiva UE 2019/790 art. 17(7) e dall'art. 70 L. 633/1941 (legge italiana sul diritto d'autore).

### Nessuno scopo di lucro
- ❌ Nessuna vendita, nessuna donazione, nessun annuncio pubblicitario, nessuna promozione a pagamento
- ❌ Nessun paywall, nessun abbonamento, nessuna in-app purchase
- ❌ Nessuna telemetria, nessuna analitica, nessun tracciamento utenti
- ✅ Gratis, open source, auto-contenuto, offline

### Grafica generata con AI
Le illustrazioni dell'armadillo usate da questa app (icona menu bar, icona Dock, finestra Clippy) **non sono opera originale dell'autore Zerocalcare**. Sono immagini generate tramite modelli di intelligenza artificiale (Higgsfield / Nano Banana) come libera reinterpretazione/omaggio del personaggio dell'Armadillo. Non riproducono direttamente disegni dell'autore. Anche le immagini AI rimangono comunque ispirate a un personaggio coperto da diritto d'autore: valgono le stesse condizioni di fair use / non-commerciale / takedown descritte sopra.

### Nessuna affiliazione
Armadillo Bar **non è** un prodotto ufficiale. **Non è** affiliato, sponsorizzato, approvato o in alcun modo connesso con Zerocalcare, Bao Publishing, Netflix, Movimenti Production, Dogville, doppiatori, collaboratori o detentori dei diritti delle sue opere. Ogni riferimento è puramente di omaggio tra fan.

### Takedown policy / contatto DMCA
Se sei un detentore di diritti e vuoi la rimozione dei contenuti:

📧 **Email diretta (preferita): [andrearicciotti1@gmail.com](mailto:andrearicciotti1@gmail.com)**  
🐛 Oppure apri una [issue](../../issues) su GitHub  
🌐 Oppure contatta via [punxcode.com](https://punxcode.com)

Per richieste DMCA / takedown valide (detentore dei diritti verificabile + identificazione del contenuto da rimuovere) i file saranno rimossi **entro 24 ore dalla ricezione**, in buona fede, senza contestazione legale.

L'autore si impegna a rispettare ogni richiesta legittima di takedown.

### Uso da parte dei fan
Scaricando e usando Armadillo Bar riconosci che:
- Lo fai per uso strettamente personale e domestico
- Non redistribuirai i clip audio a fini commerciali
- Non userai l'app in contesti pubblici monetizzati
- L'autore non fornisce garanzie legali sul contenuto audio

---

## 🤘 Autore

[PunxCode](https://punxcode.com) — Andrea Ricciotti

App gemella per fan di Boris: 🐟 [Boris Bar](https://github.com/andrearicciotti1/boris-bar)

Versione Windows: 🪟 [armadillo-bar-windows](https://github.com/andrearicciotti1/armadillo-bar-windows)

---

> *"La domanda mi devasta."*

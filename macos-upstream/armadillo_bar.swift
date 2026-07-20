//
//  Armadillo Bar — macOS menu bar app
//  © 2026 Andrea Ricciotti / PunxCode
//  Source code licensed under MIT (see LICENSE file).
//
//  ──────────────────────────────────────────────────────────────────────
//  DISCLAIMER (leggi anche LICENSE e DISCLAIMER.txt)
//
//  Questo è un FAN PROJECT amatoriale, GRATUITO, OPEN SOURCE e SENZA
//  SCOPO DI LUCRO. Non è un prodotto ufficiale. Non è affiliato,
//  sponsorizzato, approvato o in alcun modo connesso con Zerocalcare
//  (Michele Rech), Bao Publishing, Netflix, Movimenti Production né con
//  alcun produttore, editore o distributore delle sue opere.
//
//  I clip audio di default sono brevi estratti (pochi secondi) scaricati
//  da YouTube, da video pubblicamente accessibili caricati da terzi, e
//  utilizzati esclusivamente a scopo di omaggio, critica, commento,
//  satira, parodia e pastiche (art. 70 L. 633/1941 e dir. UE 2019/790
//  art. 17(7)). Tutti i diritti su marchi, personaggi, dialoghi, nomi e
//  loghi appartengono ai rispettivi titolari.
//
//  Le illustrazioni dell'armadillo (icona menu bar, icona Dock, finestra
//  Clippy) sono generate da modelli di AI (Higgsfield / Nano Banana)
//  come reinterpretazione di fan, NON sono disegni originali di
//  Zerocalcare.
//
//  Nessuna vendita, donazione, pubblicità, tracking o monetizzazione di
//  alcun tipo. Uso strettamente personale, domestico, non-commerciale.
//
//  DMCA / takedown: andrearicciotti1@gmail.com (preferito) oppure una
//  issue su https://github.com/andrearicciotti1/armadillo-bar/issues —
//  richieste legittime onorate entro 24 ore, in buona fede, senza
//  contestazione.
//  ──────────────────────────────────────────────────────────────────────
//

import Cocoa
import AVFoundation
import ServiceManagement
import Carbon.HIToolbox
import CoreText

struct BuiltInClip {
    let label: String
    let base: String
    let key: UInt32
    let mods: UInt32
    let display: String
}

class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate, AVAudioPlayerDelegate {
    var statusItem: NSStatusItem!
    var player: AVAudioPlayer?
    var currentURL: URL?
    var stopWork: DispatchWorkItem?
    var loginItem: NSMenuItem!
    var hotKeyRefs: [EventHotKeyRef?] = []
    let maxDuration: TimeInterval = 30

    // MARK: - Clippy state
    var clippyWindow: ArmadilloClippyWindow?
    var clippyBubble: ClippyBubblePanel?
    var clippyPhraseTimer: Timer?    // 10–12 min phrase cycle (always running)
    var clippyHideTimer: Timer?      // 15 s auto-hide for non-manual appearances
    var clippyToggleItem: NSMenuItem?
    var askWindow: ArmadilloAskWindow?
    var isManuallyShown = false
    var lastShownPerPhrase: [String: Date] = [:]
    let clippyVisibleDuration: TimeInterval = 15   // auto-hide duration
    let clippyAntiSpamWindow: TimeInterval = 120   // 2 min same-phrase cooldown

    /// Random phrases the armadillo says when it appears / on the periodic
    /// bubble timer. Distinct from `builtIn` (which drives the audio menu).
    let clippyPhrases: [String] = [
        "E chiudi la bocca, che te entrano le mosche.",
        "Concentrati su oggi.",
        "Se su 8000 film non te ne va bene manco uno, forse sei te che non vai bene.",
        "Vola basso. Se poi esce una merda, so cazzi per tutti, pure per me.",
        "La monnezza che fai te è meglio?",
        "Vedi solo un coglione che da 20 anni sguscia come un'anguilla senza mai pijasse due spicci di responsabilità.",
        "È una guerra di posizione, Calcare. Devi reggere botta.",
        "Perché sei lo scemo del villaggio, fratellì.",
        "Tiè, magnate pure due quintali de merda.",
        "C'è sempre una cosa peggio.",
        "Metti cose finte che te fanno sembrà un grafico vero. Magari qualcuno ce casca.",
        "Non te fanno più lavorà.",
        "Me sa che è peggio annà a lavorà in cantiere. Così, a occhio.",
        "Il punto debole del capitalismo è che è boccalone.",
        "Sta bono!",
    ]

    /// Hotkey id for the Clippy toggle (distinct from per-clip ids 0..8).
    let clippyToggleHotKeyID: UInt32 = 100

    let builtIn: [BuiltInClip] = [
        BuiltInClip(label: "Cintura nera",
                    base: "cintura nera",
                    key: UInt32(kVK_ANSI_1), mods: UInt32(cmdKey | optionKey), display: "⌥⌘1"),
        BuiltInClip(label: "Dietro le quinte",
                    base: "dietro le quinte",
                    key: UInt32(kVK_ANSI_2), mods: UInt32(cmdKey | optionKey), display: "⌥⌘2"),
        BuiltInClip(label: "Il silenzio prima…",
                    base: "il silenzio prima",
                    key: UInt32(kVK_ANSI_3), mods: UInt32(cmdKey | optionKey), display: "⌥⌘3"),
        BuiltInClip(label: "Le cose succedono",
                    base: "le cose succedono",
                    key: UInt32(kVK_ANSI_4), mods: UInt32(cmdKey | optionKey), display: "⌥⌘4"),
        BuiltInClip(label: "Soggetto consapevole",
                    base: "soggetto consapevole",
                    key: UInt32(kVK_ANSI_5), mods: UInt32(cmdKey | optionKey), display: "⌥⌘5"),
        BuiltInClip(label: "Vola basso",
                    base: "vola basso",
                    key: UInt32(kVK_ANSI_6), mods: UInt32(cmdKey | optionKey), display: "⌥⌘6"),
        BuiltInClip(label: "Ti raggiungo col coso",
                    base: "Ti raggiungo col coso",
                    key: UInt32(kVK_ANSI_7), mods: UInt32(cmdKey | optionKey), display: "⌥⌘7"),
        BuiltInClip(label: "Annamo a pija er gelato",
                    base: "Ndamose a pija ngelato",
                    key: UInt32(kVK_ANSI_8), mods: UInt32(cmdKey | optionKey), display: "⌥⌘8"),
        BuiltInClip(label: "Zona d'ombra",
                    base: "zona d'ombra",
                    key: UInt32(kVK_ANSI_9), mods: UInt32(cmdKey | optionKey), display: "⌥⌘9"),
    ]

    let audioExts = ["mp3", "mp4", "m4a", "wav", "aiff", "aif", "caf"]

    // MARK: - Custom sounds dir

    var customDir: URL {
        let app = FileManager.default.urls(for: .applicationSupportDirectory,
                                           in: .userDomainMask)[0]
        let dir = app.appendingPathComponent("ArmadilloBar/custom", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir,
                                                  withIntermediateDirectories: true)
        return dir
    }

    func loadCustomClips() -> [URL] {
        let files = (try? FileManager.default.contentsOfDirectory(
            at: customDir, includingPropertiesForKeys: nil)) ?? []
        return files
            .filter { audioExts.contains($0.pathExtension.lowercased()) }
            .sorted { $0.lastPathComponent.lowercased() < $1.lastPathComponent.lowercased() }
    }

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ n: Notification) {
        NSApp.setActivationPolicy(.accessory)
        registerBundledFonts()
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        // Menu bar icon: dedicated monochrome silhouette (armadillo-menubar).
        // Template = auto-tint white in dark mode / black in light mode.
        if let btn = statusItem.button,
           let img = NSImage(named: "armadillo-menubar") ?? NSImage(named: "armadillo") {
            img.isTemplate = true
            img.size = NSSize(width: 18, height: 18)
            btn.image = img
        }
        rebuildMenu()
        registerHotKeys()
        startPhraseTimer()   // start the 10–12 min phrase cycle
    }

    // MARK: - Font registration

    private func registerBundledFonts() {
        // Register Bangers-Regular.ttf from the app bundle so NSFont can find it.
        guard let url = Bundle.main.url(forResource: "Bangers-Regular", withExtension: "ttf") else {
            NSLog("Bangers-Regular.ttf not found in bundle")
            return
        }
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }

    func rebuildMenu() {
        let menu = NSMenu()
        menu.delegate = self

        for c in builtIn {
            let item = NSMenuItem(title: c.label,
                                  action: #selector(playBuiltIn(_:)),
                                  keyEquivalent: "")
            item.representedObject = c.base
            item.target = self
            let attr = NSMutableAttributedString(string: c.label)
            attr.append(NSAttributedString(string: "\t\(c.display)",
                attributes: [.foregroundColor: NSColor.secondaryLabelColor]))
            item.attributedTitle = attr
            menu.addItem(item)
        }

        let customs = loadCustomClips()
        if !customs.isEmpty {
            menu.addItem(.separator())
            let header = NSMenuItem(title: "Suoni personalizzati",
                                    action: nil, keyEquivalent: "")
            header.isEnabled = false
            menu.addItem(header)
            for url in customs {
                let label = url.deletingPathExtension().lastPathComponent
                let item = NSMenuItem(title: label,
                                      action: #selector(playCustom(_:)),
                                      keyEquivalent: "")
                item.representedObject = url
                item.target = self
                menu.addItem(item)
            }
        }

        menu.addItem(.separator())
        let add = NSMenuItem(title: "Aggiungi suono personalizzato…",
                             action: #selector(addCustomSound),
                             keyEquivalent: "")
        add.target = self
        menu.addItem(add)
        let open = NSMenuItem(title: "Apri cartella suoni",
                              action: #selector(openCustomDir),
                              keyEquivalent: "")
        open.target = self
        menu.addItem(open)

        menu.addItem(.separator())
        let clippy = NSMenuItem(title: clippyMenuTitle(),
                                action: #selector(toggleClippy),
                                keyEquivalent: "")
        clippy.target = self
        let cattr = NSMutableAttributedString(string: clippyMenuTitle())
        cattr.append(NSAttributedString(
            string: "\t⌥⌘0",
            attributes: [.foregroundColor: NSColor.secondaryLabelColor]))
        clippy.attributedTitle = cattr
        clippyToggleItem = clippy
        menu.addItem(clippy)

        menu.addItem(.separator())
        loginItem = NSMenuItem(title: "Avvia al login",
                               action: #selector(toggleLogin),
                               keyEquivalent: "")
        loginItem.target = self
        menu.addItem(loginItem)

        let about = NSMenuItem(title: "Informazioni e disclaimer…",
                               action: #selector(showAbout),
                               keyEquivalent: "")
        about.target = self
        menu.addItem(about)

        menu.addItem(withTitle: "Esci",
                     action: #selector(NSApp.terminate),
                     keyEquivalent: "q")

        statusItem.menu = menu
    }

    func menuWillOpen(_ menu: NSMenu) {
        loginItem.state = (SMAppService.mainApp.status == .enabled) ? .on : .off
        refreshClippyToggleLabel()
    }

    private func refreshClippyToggleLabel() {
        guard let item = clippyToggleItem else { return }
        let title = clippyMenuTitle()
        let attr = NSMutableAttributedString(string: title)
        attr.append(NSAttributedString(
            string: "\t⌥⌘0",
            attributes: [.foregroundColor: NSColor.secondaryLabelColor]))
        item.attributedTitle = attr
        item.title = title
    }

    // MARK: - Clippy (floating armadillo + speech bubbles)

    private func clippyMenuTitle() -> String {
        clippyWindow == nil ? "Mostra Armadillo" : "Nascondi Armadillo"
    }

    @objc func toggleClippy() {
        if clippyWindow != nil {
            // Manual hide — clears manual flag too.
            isManuallyShown = false
            hideClippy()
        } else {
            // Manual show — stays until user hides it.
            isManuallyShown = true
            showClippy()
        }
        refreshClippyToggleLabel()
    }

    /// Phrase timer: fires every 10–12 min, always running.
    /// If armadillo visible → show bubble. Else → auto-appear for 15 s.
    private func startPhraseTimer() {
        clippyPhraseTimer?.invalidate()
        let interval = TimeInterval.random(in: 600...720)
        let t = Timer(timeInterval: interval, repeats: false) { [weak self] _ in
            guard let self else { return }
            if self.clippyWindow != nil {
                // Already visible (manually or auto) — just show bubble.
                self.showClippyBubble()
            } else {
                // Not visible — auto-appear for 15 s then hide.
                self.showClippy()
                self.clippyHideTimer?.invalidate()
                self.clippyHideTimer = Timer.scheduledTimer(
                    withTimeInterval: self.clippyVisibleDuration, repeats: false
                ) { [weak self] _ in
                    guard let self, !self.isManuallyShown else { return }
                    self.hideClippy()
                }
            }
            self.startPhraseTimer()  // reschedule
        }
        t.tolerance = 30
        RunLoop.main.add(t, forMode: .common)
        clippyPhraseTimer = t
    }

    func showClippy() {
        guard clippyWindow == nil else { return }
        let win = ArmadilloClippyWindow()
        win.onClick = { [weak self] in self?.presentAskDialog() }
        clippyWindow = win
        win.animateIn()

        // Bubble appears just after the fade-in lands.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
            self?.showClippyBubble()
        }
    }

    func hideClippy() {
        clippyHideTimer?.invalidate()
        clippyHideTimer = nil
        clippyBubble?.close()
        clippyBubble = nil
        guard let win = clippyWindow else { return }
        clippyWindow = nil
        win.animateOut { win.close() }
    }

    func showClippyBubble() {
        guard let armadillo = clippyWindow else { return }
        let pool = clippyPhrases
        guard !pool.isEmpty else { return }

        // Anti-spam: prefer phrases not shown recently.
        let now = Date()
        let fresh = pool.filter { p in
            if let last = lastShownPerPhrase[p] {
                return now.timeIntervalSince(last) >= clippyAntiSpamWindow
            }
            return true
        }
        let final = fresh.isEmpty ? pool : fresh
        guard let pick = final.randomElement() else { return }
        lastShownPerPhrase[pick] = now

        presentBubble(text: pick, above: armadillo)
    }

    private func presentBubble(text: String, above armadillo: NSWindow) {
        clippyBubble?.close()
        let bubble = ClippyBubblePanel(text: text, anchor: armadillo)
        bubble.show(autoDismissAfter: clippyVisibleDuration)
        clippyBubble = bubble
    }

    // MARK: - Ask dialog (click on armadillo)

    func presentAskDialog() {
        if let existing = askWindow {
            existing.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }
        let w = ArmadilloAskWindow()
        w.onSubmit = { [weak self] text in self?.handleAskAnswer(text) }
        askWindow = w
        NotificationCenter.default.addObserver(
            forName: NSWindow.willCloseNotification,
            object: w, queue: .main
        ) { [weak self] _ in
            self?.askWindow = nil
        }
        NSApp.activate(ignoringOtherApps: true)
        w.makeKeyAndOrderFront(nil)
    }

    private func handleAskAnswer(_ question: String) {
        // 2/3 → audio "bello spunto", 1/3 → bubble.
        if Int.random(in: 0..<3) < 2 {
            playBuiltIn(base: "bello spunto")
        } else if let win = clippyWindow {
            presentBubble(text: "Ma se non lo sai te io che cazzo ne posso sapé?", above: win)
        }
        _ = question
    }

    // MARK: - Playback

    @objc func playBuiltIn(_ sender: NSMenuItem) {
        guard let base = sender.representedObject as? String else { return }
        playBuiltIn(base: base)
    }

    func playBuiltIn(base: String) {
        for ext in audioExts {
            if let url = Bundle.main.url(forResource: base,
                                         withExtension: ext,
                                         subdirectory: "clips") {
                play(url: url); return
            }
        }
    }

    @objc func playCustom(_ sender: NSMenuItem) {
        guard let url = sender.representedObject as? URL else { return }
        play(url: url)
    }

    func play(url: URL) {
        if let p = player, p.isPlaying, currentURL == url {
            stopPlayback()
            return
        }
        stopPlayback()
        guard let p = try? AVAudioPlayer(contentsOf: url) else { return }
        player = p
        currentURL = url
        p.delegate = self
        p.play()
        clippyWindow?.startTalking()
        let work = DispatchWorkItem { [weak self] in self?.stopPlayback() }
        stopWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + maxDuration, execute: work)
    }

    func stopPlayback() {
        stopWork?.cancel()
        stopWork = nil
        player?.stop()
        player = nil
        currentURL = nil
        clippyWindow?.stopTalking()
    }

    // Called by AVAudioPlayer when audio finishes naturally.
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        stopPlayback()
    }

    // MARK: - Custom sound management

    @objc func addCustomSound() {
        NSApp.activate(ignoringOtherApps: true)
        let panel = NSOpenPanel()
        panel.title = "Scegli un file audio"
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [.audio, .mp3, .mpeg4Audio, .wav, .aiff]
        guard panel.runModal() == .OK, let src = panel.url else { return }
        let dst = customDir.appendingPathComponent(src.lastPathComponent)
        do {
            if FileManager.default.fileExists(atPath: dst.path) {
                try FileManager.default.removeItem(at: dst)
            }
            try FileManager.default.copyItem(at: src, to: dst)
        } catch {
            NSLog("Copy failed: \(error)")
        }
        rebuildMenu()
    }

    @objc func openCustomDir() {
        NSWorkspace.shared.open(customDir)
    }

    // MARK: - Login item

    @objc func toggleLogin() {
        do {
            if SMAppService.mainApp.status == .enabled {
                try SMAppService.mainApp.unregister()
            } else {
                try SMAppService.mainApp.register()
            }
        } catch {
            NSLog("Login toggle failed: \(error)")
        }
    }

    // MARK: - About / Disclaimer

    @objc func showAbout() {
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "Armadillo Bar — Fan project non commerciale"
        alert.informativeText = """
        Versione 1.0 · © 2026 Andrea Ricciotti / PunxCode

        Armadillo Bar è un progetto amatoriale, gratuito, open source, \
        senza scopo di lucro, creato da un fan di Zerocalcare.

        NON AFFILIAZIONE. Non è un prodotto ufficiale. Non è affiliato, \
        sponsorizzato o approvato da Zerocalcare (Michele Rech), Bao \
        Publishing, Netflix, Movimenti Production o altri editori/produttori.

        ORIGINE AUDIO. I clip sono brevi estratti (pochi secondi) scaricati \
        da YouTube, da video pubblicamente accessibili caricati da terzi. \
        Usati esclusivamente a scopo di omaggio, critica, commento, satira, \
        parodia e pastiche (art. 70 L. 633/1941, dir. UE 2019/790 art. 17(7)).

        NESSUN LUCRO. Nessuna vendita, donazione, pubblicità, tracking o \
        monetizzazione di alcun tipo.

        PROPRIETÀ. Tutti i marchi, personaggi, dialoghi, nomi e loghi sono \
        proprietà dei rispettivi titolari.

        GRAFICA AI. Le illustrazioni dell'armadillo sono generate da \
        modelli di AI (Higgsfield / Nano Banana) come reinterpretazione \
        di fan; non sono disegni originali di Zerocalcare.

        TAKEDOWN / DMCA. I detentori di diritti possono richiedere la \
        rimozione scrivendo a andrearicciotti1@gmail.com o aprendo una \
        issue su GitHub. Richieste legittime onorate entro 24h.

        Codice: licenza MIT.
        """
        alert.alertStyle = .informational
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Apri GitHub")
        alert.addButton(withTitle: "Apri licenza")
        let resp = alert.runModal()
        if resp == .alertSecondButtonReturn {
            NSWorkspace.shared.open(URL(string: "https://github.com/andrearicciotti1/armadillo-bar")!)
        } else if resp == .alertThirdButtonReturn {
            NSWorkspace.shared.open(URL(string: "https://github.com/andrearicciotti1/armadillo-bar/blob/main/LICENSE")!)
        }
    }

    // MARK: - Global hotkeys (Carbon)

    func registerHotKeys() {
        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                      eventKind: UInt32(kEventHotKeyPressed))
        let selfPtr = UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
        InstallEventHandler(GetApplicationEventTarget(), { (_, event, userData) -> OSStatus in
            var hkID = EventHotKeyID()
            GetEventParameter(event, EventParamName(kEventParamDirectObject),
                              EventParamType(typeEventHotKeyID),
                              nil, MemoryLayout<EventHotKeyID>.size, nil, &hkID)
            if let userData = userData {
                let d = Unmanaged<AppDelegate>.fromOpaque(userData).takeUnretainedValue()
                let id = hkID.id
                if id == d.clippyToggleHotKeyID {
                    d.toggleClippy()
                } else if Int(id) >= 0 && Int(id) < d.builtIn.count {
                    d.playBuiltIn(base: d.builtIn[Int(id)].base)
                }
            }
            return noErr
        }, 1, &eventType, selfPtr, nil)

        let signature: OSType = 0x41524D44 // 'ARMD'
        for (i, c) in builtIn.enumerated() {
            var ref: EventHotKeyRef?
            let hkID = EventHotKeyID(signature: signature, id: UInt32(i))
            RegisterEventHotKey(c.key, c.mods, hkID, GetApplicationEventTarget(), 0, &ref)
            hotKeyRefs.append(ref)
        }

        // Clippy toggle hotkey: ⌥⌘0
        var clippyRef: EventHotKeyRef?
        let clippyHK = EventHotKeyID(signature: signature, id: clippyToggleHotKeyID)
        RegisterEventHotKey(UInt32(kVK_ANSI_0),
                            UInt32(cmdKey | optionKey),
                            clippyHK,
                            GetApplicationEventTarget(), 0, &clippyRef)
        hotKeyRefs.append(clippyRef)
    }
}

@main
struct ArmadilloBarApp {
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.run()
    }
}

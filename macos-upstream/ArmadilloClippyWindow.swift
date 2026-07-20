//
//  ArmadilloClippyWindow.swift
//  Floating, borderless, transparent window hosting the armadillo image.
//  Draggable by mouse (explicit performDrag override so the image view
//  doesn't swallow clicks). Position persisted in UserDefaults.
//  Animated entry / exit (fade + slight scale).
//

import Cocoa
import QuartzCore

final class ArmadilloClippyWindow: NSWindow {

    static let frameDefaultsKey = "ClippyArmadilloFrame"
    /// Portrait window matching the full-body armadillo aspect (~0.75).
    static let defaultSize = NSSize(width: 240, height: 320)

    let armadilloView: DraggableArmadilloView

    /// Fired when the user clicks (not drags) on the armadillo.
    var onClick: (() -> Void)? {
        get { armadilloView.onClick }
        set { armadilloView.onClick = newValue }
    }

    /// Start mouth open/close animation (call when audio begins playing).
    func startTalking() { armadilloView.startTalking() }
    /// Stop mouth animation and reset to closed frame.
    func stopTalking()  { armadilloView.stopTalking() }

    init() {
        let size = ArmadilloClippyWindow.defaultSize
        let origin = ArmadilloClippyWindow.loadOrigin()
            ?? ArmadilloClippyWindow.defaultStartOrigin(size: size)
        var initial = NSRect(origin: origin, size: size)

        // If saved origin is off every screen (monitor unplugged etc.), reset.
        let onScreen = NSScreen.screens.contains { $0.visibleFrame.intersects(initial) }
        if !onScreen {
            initial = NSRect(
                origin: ArmadilloClippyWindow.defaultStartOrigin(size: size),
                size: size
            )
        }

        let view = DraggableArmadilloView(frame: NSRect(origin: .zero, size: initial.size))
        self.armadilloView = view

        super.init(contentRect: initial,
                   styleMask: [.borderless],
                   backing: .buffered,
                   defer: false)

        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        isOpaque = false
        backgroundColor = .clear
        hasShadow = false
        hidesOnDeactivate = false
        isMovableByWindowBackground = true   // belt + suspenders
        ignoresMouseEvents = false

        view.autoresizingMask = [.width, .height]
        contentView = view

        NotificationCenter.default.addObserver(
            self, selector: #selector(handleMoved),
            name: NSWindow.didMoveNotification, object: self
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(handleResized),
            name: NSWindow.didResizeNotification, object: self
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Animated show / hide

    func animateIn() {
        let target = frame
        let small = ArmadilloClippyWindow.scaledRect(target, by: 0.85)
        alphaValue = 0
        setFrame(small, display: false)
        orderFront(nil)
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.25
            ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
            ctx.allowsImplicitAnimation = true
            animator().alphaValue = 1
            animator().setFrame(target, display: true)
        }
    }

    func animateOut(completion: @escaping () -> Void) {
        let target = frame
        let small = ArmadilloClippyWindow.scaledRect(target, by: 0.85)
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.18
            ctx.timingFunction = CAMediaTimingFunction(name: .easeIn)
            ctx.allowsImplicitAnimation = true
            animator().alphaValue = 0
            animator().setFrame(small, display: true)
        }, completionHandler: completion)
    }

    private static func scaledRect(_ r: NSRect, by k: CGFloat) -> NSRect {
        let w = r.width * k
        let h = r.height * k
        return NSRect(x: r.midX - w / 2, y: r.midY - h / 2, width: w, height: h)
    }

    // MARK: - Persistence

    @objc private func handleMoved() { saveFrame() }
    @objc private func handleResized() { saveFrame() }

    private func saveFrame() {
        let f = frame
        let dict: [String: Double] = [
            "x": Double(f.minX), "y": Double(f.minY),
            "w": Double(f.width), "h": Double(f.height)
        ]
        UserDefaults.standard.set(dict, forKey: Self.frameDefaultsKey)
    }

    private static func loadOrigin() -> NSPoint? {
        guard let d = UserDefaults.standard.dictionary(forKey: frameDefaultsKey) as? [String: Double],
              let x = d["x"], let y = d["y"] else { return nil }
        return NSPoint(x: x, y: y)
    }

    private static func defaultStartOrigin(size: NSSize) -> NSPoint {
        let vf = NSScreen.main?.visibleFrame
            ?? NSRect(x: 0, y: 0, width: 1280, height: 800)
        // Slightly above geometric center (visually centered with menu bar).
        return NSPoint(
            x: vf.midX - size.width / 2,
            y: vf.midY - size.height / 2 + 60
        )
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

// MARK: - View that draws the armadillo and forwards drags to the window

final class DraggableArmadilloView: NSView {

    /// Mouse-up without significant movement = click (drag is started after
    /// `dragThreshold` points of movement, in which case onClick is NOT fired).
    var onClick: (() -> Void)?

    private let dragThreshold: CGFloat = 5

    // MARK: - Talking animation state
    private var closedImage: CGImage?
    private var openImage: CGImage?
    private var talkingTimer: Timer?
    private var mouthIsOpen = false

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        wantsLayer = true
        layer?.contentsGravity = .resizeAspect
        loadImages()
        showFrame(open: false)
    }

    required init?(coder: NSCoder) { nil }

    private func loadImages() {
        if let img = NSImage(named: "armadillo"),
           let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) {
            closedImage = cg
        }
        // armadillo-open.png is optional; if absent, animation simply won't run.
        if let img = NSImage(named: "armadillo-open"),
           let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) {
            openImage = cg
        }
    }

    private func showFrame(open: Bool) {
        if let target = (open ? openImage : closedImage) ?? closedImage {
            layer?.contents = target
            layer?.backgroundColor = NSColor.clear.cgColor
        } else {
            layer?.contents = nil
            layer?.backgroundColor = NSColor.systemOrange.cgColor
            layer?.cornerRadius = 24
        }
    }

    // MARK: - Public talking API

    func startTalking() {
        guard openImage != nil else { return }   // no open-mouth image → skip
        guard talkingTimer == nil else { return } // already running
        // Toggle at ~8 Hz (125 ms each half-cycle).
        let t = Timer(timeInterval: 0.125, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.mouthIsOpen.toggle()
            self.showFrame(open: self.mouthIsOpen)
        }
        t.tolerance = 0.02
        RunLoop.main.add(t, forMode: .common)
        talkingTimer = t
    }

    func stopTalking() {
        talkingTimer?.invalidate()
        talkingTimer = nil
        mouthIsOpen = false
        showFrame(open: false)
    }

    /// Distinguishes click from drag: only initiates a window drag once the
    /// pointer has moved beyond `dragThreshold`. Mouse-up without crossing
    /// the threshold fires `onClick`.
    override func mouseDown(with event: NSEvent) {
        let startWindowPoint = event.locationInWindow
        let mask: NSEvent.EventTypeMask = [.leftMouseUp, .leftMouseDragged]

        while let next = window?.nextEvent(matching: mask) {
            switch next.type {
            case .leftMouseUp:
                onClick?()
                return
            case .leftMouseDragged:
                let p = next.locationInWindow
                let dx = p.x - startWindowPoint.x
                let dy = p.y - startWindowPoint.y
                if hypot(dx, dy) > dragThreshold {
                    window?.performDrag(with: event)
                    return
                }
            default:
                continue
            }
        }
    }

    // Make sure clicks hit this view (and only this view).
    override func hitTest(_ point: NSPoint) -> NSView? {
        return bounds.contains(convert(point, from: superview)) ? self : nil
    }
}

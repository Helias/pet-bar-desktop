//
//  ClippyBubblePanel.swift
//  Speech-bubble that follows the Armadillo Clippy window.
//  Chooses tail-down (bubble above mouth) or tail-up (bubble below mouth)
//  depending on available screen space. Uses hand-drawn artwork by the user.
//

import Cocoa

// MARK: - Bubble orientation

enum BubbleStyle {
    case down   // tail points down  → bubble above mouth  → use bubble.png
    case up     // tail points up    → bubble below mouth  → use bubble-up.png

    var imageName: String { self == .down ? "bubble" : "bubble-up" }

    /// centerYAnchor offset to center text in the body (non-tail) region.
    /// Non-flipped NSView: positive = up, negative = down.
    /// `nudge` is an extra pixel push to compensate for artwork asymmetry —
    /// positive = up, negative = down. Tweak this if text looks off.
    func centerYOffset(tailH: CGFloat, nudge: CGFloat) -> CGFloat {
        let base = self == .down ? tailH / 2 : -(tailH / 2)
        return self == .down ? base + nudge : base - nudge
    }
}

// MARK: - Panel

final class ClippyBubblePanel: NSPanel {

    private weak var anchorWindow: NSWindow?
    private var bubbleStyle: BubbleStyle = .down
    private var bubbleSize: NSSize = .zero
    private var dismissTimer: Timer?

    // Fixed dimensions matching both bubble PNGs (1741 × 1403 → ratio 1.241)
    static let bubbleW: CGFloat = 270
    static let bubbleH: CGFloat = round(270 / 1.241)   // ≈ 218

    // Tail occupies ~11 % of height in both artwork files (measured).
    static let tailFraction: CGFloat = 0.11
    // Extra nudge to compensate for artwork visual asymmetry.
    // Positive = push text up, negative = push down. Tweak if text looks off.
    static let textNudge: CGFloat = -10

    init(text: String, anchor: NSWindow) {
        let size    = NSSize(width: Self.bubbleW, height: Self.bubbleH)
        let tailH   = round(Self.bubbleH * Self.tailFraction)   // ≈ 24 px

        let font = NSFont(name: "Bangers", size: 15)
            ?? NSFont(name: "MarkerFelt-Wide", size: 13)
            ?? NSFont.boldSystemFont(ofSize: 13)

        // Decide orientation before super.init so we can pass it to the view.
        let style  = ClippyBubblePanel.chooseStyle(anchor: anchor, bubbleH: size.height)
        let frame  = ClippyBubblePanel.panelFrame(size: size, anchor: anchor, style: style)

        let view = ClippyBubbleView(
            frame:      NSRect(origin: .zero, size: size),
            text:       text,
            font:       font,
            leftInset:  30,
            rightInset: 24,
            tailH:      tailH,
            nudge:      Self.textNudge,
            style:      style
        )

        super.init(contentRect: frame,
                   styleMask:   [.borderless, .nonactivatingPanel],
                   backing:     .buffered,
                   defer:       false)

        self.anchorWindow = anchor
        self.bubbleStyle  = style
        self.bubbleSize   = size

        isFloatingPanel    = true
        level              = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        isOpaque           = false
        backgroundColor    = .clear
        hasShadow          = false
        hidesOnDeactivate  = false
        ignoresMouseEvents = false

        contentView  = view
        view.onClick = { [weak self] in self?.close() }

        NotificationCenter.default.addObserver(
            self, selector: #selector(anchorMoved),
            name: NSWindow.didMoveNotification, object: anchor)
        NotificationCenter.default.addObserver(
            self, selector: #selector(anchorMoved),
            name: NSWindow.didResizeNotification, object: anchor)
        NotificationCenter.default.addObserver(
            self, selector: #selector(anchorClosed),
            name: NSWindow.willCloseNotification, object: anchor)
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    func show(autoDismissAfter t: TimeInterval) {
        orderFront(nil)
        dismissTimer?.invalidate()
        dismissTimer = Timer.scheduledTimer(withTimeInterval: t, repeats: false) { [weak self] _ in
            self?.close()
        }
    }

    override func close() {
        dismissTimer?.invalidate()
        dismissTimer = nil
        NotificationCenter.default.removeObserver(self)
        super.close()
    }

    override var canBecomeKey:  Bool { false }
    override var canBecomeMain: Bool { false }

    // MARK: - Follow anchor

    @objc private func anchorMoved() {
        guard let a = anchorWindow else { return }
        // Re-use the same style chosen at creation (avoids flip while dragging).
        let f = ClippyBubblePanel.panelFrame(size: bubbleSize, anchor: a, style: bubbleStyle)
        setFrameOrigin(f.origin)
    }

    @objc private func anchorClosed() { close() }

    // MARK: - Geometry helpers

    /// Pick orientation based on space above vs below the armadillo window.
    private static func chooseStyle(anchor: NSWindow, bubbleH: CGFloat) -> BubbleStyle {
        let screen = NSScreen.screens.first(where: { $0.frame.contains(anchor.frame.origin) }) ?? NSScreen.main
        let maxY   = screen?.visibleFrame.maxY ?? CGFloat.greatestFiniteMagnitude
        return (anchor.frame.maxY + bubbleH + 4 <= maxY) ? .down : .up
    }

    /// Compute panel frame: snout-aligned X, armadillo-top-relative Y.
    /// Snout ≈ 65 % from left of armadillo window; tail tip ≈ 14 % from left of panel.
    private static func panelFrame(size: NSSize,
                                   anchor: NSWindow,
                                   style: BubbleStyle) -> NSRect {
        let screen = NSScreen.screens.first(where: { $0.frame.contains(anchor.frame.origin) }) ?? NSScreen.main
        let vf     = screen?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1280, height: 800)

        let snoutX = anchor.frame.minX + anchor.frame.width * 0.65
        var origin = NSPoint(x: snoutX - size.width * 0.14, y: 0)

        switch style {
        case .down:
            // Bubble floats above armadillo; slight overlap at top of window.
            origin.y = anchor.frame.maxY - 30
        case .up:
            // Bubble hangs below armadillo.
            origin.y = anchor.frame.minY - size.height + 30
        }

        origin.x = min(max(origin.x, vf.minX + 4), vf.maxX - size.width - 4)
        origin.y = min(max(origin.y, vf.minY + 4), vf.maxY - size.height - 4)
        return NSRect(origin: origin, size: size)
    }
}

// MARK: - View

final class ClippyBubbleView: NSView {

    var onClick: (() -> Void)?
    private let style: BubbleStyle

    init(frame: NSRect, text: String, font: NSFont,
         leftInset: CGFloat, rightInset: CGFloat,
         tailH: CGFloat, nudge: CGFloat, style: BubbleStyle) {
        self.style = style
        super.init(frame: frame)

        let tf = NSTextField(wrappingLabelWithString: text.uppercased())
        tf.font            = font
        tf.alignment       = .center
        tf.textColor       = .black
        tf.drawsBackground = false
        tf.isBordered      = false
        tf.isEditable      = false
        tf.isSelectable    = false
        tf.translatesAutoresizingMaskIntoConstraints = false
        addSubview(tf)

        // Pin text strictly inside the bubble body (non-tail) area.
        // isFlipped=false: topAnchor = high-Y side, bottomAnchor = low-Y side.
        // Body for .down → above tail:  y ∈ [tailH, height]
        // Body for .up  → below tail:  y ∈ [0, height - tailH]
        let bodyPad: CGFloat = 10   // breathing room inside body edges
        let bodyTopConstraint: NSLayoutConstraint
        let bodyBottomConstraint: NSLayoutConstraint

        switch style {
        case .down:
            // body bottom = tailH above the view's bottom anchor
            bodyTopConstraint    = tf.topAnchor.constraint(
                greaterThanOrEqualTo: topAnchor, constant: -bodyPad)
            bodyBottomConstraint = tf.bottomAnchor.constraint(
                lessThanOrEqualTo: bottomAnchor, constant: tailH + bodyPad)
        case .up:
            // body top = tailH below the view's top anchor
            bodyTopConstraint    = tf.topAnchor.constraint(
                greaterThanOrEqualTo: topAnchor, constant: -(tailH + bodyPad))
            bodyBottomConstraint = tf.bottomAnchor.constraint(
                lessThanOrEqualTo: bottomAnchor, constant: bodyPad)
        }

        // Soft center-in-body as preferred position (lower priority than the bounds above).
        let softCenter = tf.centerYAnchor.constraint(
            equalTo: centerYAnchor,
            constant: style.centerYOffset(tailH: tailH, nudge: nudge))
        softCenter.priority = .defaultHigh

        NSLayoutConstraint.activate([
            tf.centerXAnchor.constraint(equalTo: centerXAnchor),
            tf.widthAnchor.constraint(equalTo: widthAnchor,
                                      constant: -(leftInset + rightInset)),
            bodyTopConstraint,
            bodyBottomConstraint,
            softCenter,
        ])
    }

    required init?(coder: NSCoder) { nil }

    override var isFlipped: Bool { false }

    override func draw(_ dirtyRect: NSRect) {
        guard let img = NSImage(named: style.imageName) else { return }
        img.draw(in: bounds,
                 from: .zero,
                 operation: .sourceOver,
                 fraction: 1.0,
                 respectFlipped: false,
                 hints: [.interpolation: NSImageInterpolation.high.rawValue])
    }

    override func mouseDown(with event: NSEvent) { onClick?() }
}

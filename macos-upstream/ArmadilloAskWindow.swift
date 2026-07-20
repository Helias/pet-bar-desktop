//
//  ArmadilloAskWindow.swift
//  Modal-ish window: text question (max 200 chars) → completion callback.
//  Future hookable to a real backend (Google search etc.); for now the
//  caller plays the canned "ma che cazzo ne so io" answer.
//

import Cocoa

final class ArmadilloAskWindow: NSWindow, NSTextViewDelegate {

    static let maxChars = 200

    var onSubmit: ((String) -> Void)?

    private let textView = NSTextView()
    private let counter = NSTextField(labelWithString: "0 / 200")
    private let sendButton = NSButton(title: "Chiedi", target: nil, action: nil)
    private let cancelButton = NSButton(title: "Annulla", target: nil, action: nil)

    init() {
        let size = NSSize(width: 440, height: 200)
        let initial = NSRect(origin: .zero, size: size)
        super.init(contentRect: initial,
                   styleMask: [.titled, .closable],
                   backing: .buffered,
                   defer: false)
        title = "Chiedi all'armadillo"
        level = .floating
        isReleasedWhenClosed = false
        center()

        buildLayout()
    }

    private func buildLayout() {
        guard let root = contentView else { return }

        let prompt = NSTextField(labelWithString: "Cosa vuoi chiedere all'armadillo?")
        prompt.font = .systemFont(ofSize: 13, weight: .medium)
        prompt.translatesAutoresizingMaskIntoConstraints = false

        // Scrollable multiline text view, max 200 chars enforced via delegate.
        let scroll = NSScrollView()
        scroll.hasVerticalScroller = true
        scroll.borderType = .bezelBorder
        scroll.translatesAutoresizingMaskIntoConstraints = false

        textView.isRichText = false
        textView.font = .systemFont(ofSize: 13)
        textView.allowsUndo = true
        textView.isEditable = true
        textView.isSelectable = true
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainer?.widthTracksTextView = true
        textView.delegate = self
        scroll.documentView = textView

        counter.font = .systemFont(ofSize: 11)
        counter.textColor = .secondaryLabelColor
        counter.translatesAutoresizingMaskIntoConstraints = false

        sendButton.target = self
        sendButton.action = #selector(submit)
        sendButton.keyEquivalent = "\r"          // Enter
        sendButton.bezelStyle = .rounded
        sendButton.translatesAutoresizingMaskIntoConstraints = false

        cancelButton.target = self
        cancelButton.action = #selector(cancel)
        cancelButton.keyEquivalent = "\u{1b}"    // Escape
        cancelButton.bezelStyle = .rounded
        cancelButton.translatesAutoresizingMaskIntoConstraints = false

        root.addSubview(prompt)
        root.addSubview(scroll)
        root.addSubview(counter)
        root.addSubview(sendButton)
        root.addSubview(cancelButton)

        NSLayoutConstraint.activate([
            prompt.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 18),
            prompt.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -18),
            prompt.topAnchor.constraint(equalTo: root.topAnchor, constant: 14),

            scroll.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 18),
            scroll.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -18),
            scroll.topAnchor.constraint(equalTo: prompt.bottomAnchor, constant: 8),
            scroll.heightAnchor.constraint(equalToConstant: 80),

            counter.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 18),
            counter.topAnchor.constraint(equalTo: scroll.bottomAnchor, constant: 6),

            sendButton.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -18),
            sendButton.bottomAnchor.constraint(equalTo: root.bottomAnchor, constant: -14),

            cancelButton.trailingAnchor.constraint(equalTo: sendButton.leadingAnchor, constant: -8),
            cancelButton.bottomAnchor.constraint(equalTo: root.bottomAnchor, constant: -14),
        ])
    }

    // MARK: - NSTextViewDelegate (200-char cap)

    func textDidChange(_ notification: Notification) {
        let s = textView.string
        if s.count > Self.maxChars {
            textView.string = String(s.prefix(Self.maxChars))
        }
        counter.stringValue = "\(textView.string.count) / \(Self.maxChars)"
    }

    // MARK: - Actions

    @objc private func submit() {
        let text = textView.string.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        onSubmit?(text)
        close()
    }

    @objc private func cancel() {
        close()
    }

    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

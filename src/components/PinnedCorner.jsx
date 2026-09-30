import { createPortal } from "react-dom";

// A button pinned to a top corner of the screen (the settings gear, sign-out).
// Rendered straight into <body>, so no ancestor — a transformed or filtered
// container — can turn `position: fixed` into "fixed to that ancestor" and let it
// scroll with the page; its own compositing layer keeps it from lagging behind
// while a phone scrolls. `side` is physical on purpose ("left" / "right"): these
// stay in the same corner in Hebrew too. Clear of the status bar / notch.
export default function PinnedCorner({ side, offset = "0.75rem", children }) {
  return createPortal(
    <div
      dir="ltr"
      style={{
        position: "fixed",
        top: "max(0.75rem, env(safe-area-inset-top))",
        [side]: offset,
        zIndex: 40,
        transform: "translateZ(0)",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

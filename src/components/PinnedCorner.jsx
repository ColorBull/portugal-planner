// A button at the top-left or top-right of the page (the settings gear, sign-out).
// It is part of the page, not fixed to the screen: it sits at the very top and
// scrolls away with the content, so it never floats over the trips when you scroll
// down. The parent must be `position: relative` and span the page.
// `side` is physical on purpose ("left" / "right"): the gear stays in the left
// corner in Hebrew too. Clear of the status bar / notch.
export default function PinnedCorner({ side, offset = "0.75rem", children }) {
  return (
    <div
      dir="ltr"
      style={{
        position: "absolute",
        top: "max(0.75rem, env(safe-area-inset-top))",
        [side]: offset,
        zIndex: 20,
      }}
    >
      {children}
    </div>
  );
}

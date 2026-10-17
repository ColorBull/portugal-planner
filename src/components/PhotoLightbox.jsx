import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

// `previewSrc` is the grid thumbnail, already loaded (and cached offline), so
// something shows the instant the viewer opens; the sharp `src` replaces it
// once it has downloaded — or never, offline, and the preview stays.
export default function PhotoLightbox({ src, previewSrc, onClose }) {
  const [shown, setShown] = useState(previewSrc || src);
  useEffect(() => {
    setShown(previewSrc || src);
    if (!previewSrc || previewSrc === src) return;
    let alive = true;
    const img = new window.Image();
    img.onload = () => alive && setShown(src);
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src, previewSrc]);

  const [scale, setScaleState] = useState(1);
  const [pos, setPosState] = useState({ x: 0, y: 0 });
  // Mirrors of the state, so pointer handlers never read a stale render.
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const setScale = (s) => setScaleState((scaleRef.current = s));
  const setPos = (p) => setPosState((posRef.current = p));

  const box = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef({ dist: 0, scale: 1, mid: { x: 0, y: 0 }, pos: { x: 0, y: 0 } });
  const pan = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  // Re-anchor the gesture to the fingers now on screen, so adding or lifting
  // a finger never makes the photo jump.
  const anchor = () => {
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      pinch.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        scale: scaleRef.current,
        mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        pos: posRef.current
      };
    } else if (pts.length === 1) {
      pan.current = { x: pts[0].x - posRef.current.x, y: pts[0].y - posRef.current.y };
    }
  };

  const onPointerDown = (e) => {
    if (e.target.closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 0) moved.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    anchor();
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const p = pinch.current;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const newScale = Math.min(
        Math.max(p.scale * (dist / (p.dist || 1)), MIN_SCALE),
        MAX_SCALE
      );
      // Zoom around the point between the fingers: the spot of the photo that
      // was under them stays under them (the photo is scaled about its centre).
      const r = box.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const k = newScale / p.scale;
      setScale(newScale);
      setPos({
        x: mid.x - cx - k * (p.mid.x - cx - p.pos.x),
        y: mid.y - cy - k * (p.mid.y - cy - p.pos.y)
      });
      moved.current = true;
    } else if (scaleRef.current > 1) {
      setPos({ x: e.clientX - pan.current.x, y: e.clientY - pan.current.y });
      moved.current = true;
    }
  };

  const onPointerUp = (e) => {
    if (!pointers.current.delete(e.pointerId)) return;
    anchor();
    // A tap on a zoomed photo zooms back out; nothing here closes the viewer —
    // only the × does.
    if (pointers.current.size === 0) {
      if (!moved.current ? scaleRef.current > 1 : scaleRef.current <= MIN_SCALE) reset();
    }
  };

  return (
    <div
      ref={box}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/90 overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 end-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
        aria-label={t("Закрыть")}
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={shown}
        alt={t("Просмотр фото")}
        draggable={false}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transformOrigin: "center center",
          maxWidth: "92vw",
          maxHeight: "90vh",
          objectFit: "contain",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          willChange: "transform"
        }}
        className="rounded-lg shadow-2xl pointer-events-none"
      />
    </div>
  );
}
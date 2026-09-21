import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

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

  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const pointers = useRef(new Map());
  const pinch = useRef({ dist: 0, scale: 1, mid: { x: 0, y: 0 }, pos: { x: 0, y: 0 } });
  const pan = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      pinch.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        scale,
        mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        pos
      };
    } else if (pts.length === 1) {
      pan.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const newScale = Math.min(
        Math.max(pinch.current.scale * (dist / (pinch.current.dist || 1)), MIN_SCALE),
        MAX_SCALE
      );
      setScale(newScale);
      setPos({
        x: pinch.current.pos.x + (mid.x - pinch.current.mid.x),
        y: pinch.current.pos.y + (mid.y - pinch.current.mid.y)
      });
      moved.current = true;
    } else if (pts.length === 1) {
      if (scale > 1) {
        setPos({ x: e.clientX - pan.current.x, y: e.clientY - pan.current.y });
        moved.current = true;
      } else if (
        Math.abs(e.clientX - pts[0].x) > 8 ||
        Math.abs(e.clientY - pts[0].y) > 8
      ) {
        moved.current = true;
      }
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current.dist = 0;
    if (pointers.current.size === 0) {
      if (!moved.current) {
        if (scale > 1) reset();
        else onClose();
      } else if (scale <= MIN_SCALE) {
        reset();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/90 overflow-hidden"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
        aria-label="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={shown}
        alt="Просмотр фото"
        draggable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          transformOrigin: "center center",
          touchAction: "none",
          maxWidth: "92vw",
          maxHeight: "90vh",
          objectFit: "contain",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          willChange: "transform"
        }}
        className="rounded-lg shadow-2xl pointer-events-auto"
      />
    </div>
  );
}
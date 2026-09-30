import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Press-and-hold (or right-click) on something in the day view opens a small
// menu next to the finger: "Изменить" / "Удалить …". The same gesture the photos
// and documents already use (PlanPhotoGrid).
//
//   const { bind, menu } = useHoldMenu([{ key, label, icon, danger, run }]);
//   <div {...bind}>…</div>{menu}
//
// A tap still does whatever the element normally does: a hold that opened the
// menu swallows the click that follows it, so a link does not open as well.

const HOLD_MS = 450;
const MOVE_PX = 10;
const MENU_W = 196;

export function useHoldMenu(items) {
  const [pos, setPos] = useState(null);
  const timer = useRef(null);
  const origin = useRef({ x: 0, y: 0 });
  const fired = useRef(false);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // Chrome on Android starts selecting text about half a second into a press;
  // switched off document-wide for the press and the menu (see CLAUDE.md).
  const lock = () => document.body.classList.add("no-long-press");
  const unlock = () => document.body.classList.remove("no-long-press");

  useEffect(() => {
    if (!pos) unlock();
  }, [pos]);
  useEffect(() => () => {
    clear();
    unlock();
  }, []);

  const show = (x, y) => {
    const h = items.length * 48 + 8;
    setPos({
      x: Math.min(Math.max(x - MENU_W / 2, 8), window.innerWidth - MENU_W - 8),
      y: Math.min(Math.max(y - h / 2, 8), window.innerHeight - h - 8),
    });
  };

  const bind = {
    onTouchStart: (e) => {
      const t = e.touches[0];
      origin.current = { x: t.clientX, y: t.clientY };
      fired.current = false;
      lock();
      clear();
      timer.current = setTimeout(() => {
        fired.current = true;
        window.getSelection()?.removeAllRanges();
        show(origin.current.x, origin.current.y);
        if (navigator.vibrate) navigator.vibrate(15);
      }, HOLD_MS);
    },
    onTouchMove: (e) => {
      const t = e.touches[0];
      if (
        Math.abs(t.clientX - origin.current.x) > MOVE_PX ||
        Math.abs(t.clientY - origin.current.y) > MOVE_PX
      ) {
        clear();
        unlock();
      }
    },
    onTouchEnd: () => {
      clear();
      if (!fired.current) unlock();
    },
    onTouchCancel: () => {
      clear();
      if (!fired.current) unlock();
    },
    // Right-click on a computer, and the long-press event some phones send.
    onContextMenu: (e) => {
      e.preventDefault();
      show(e.clientX, e.clientY);
    },
    onClickCapture: (e) => {
      if (fired.current) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
  };

  const choose = (item) => {
    setPos(null);
    item.run();
  };

  // No fade in or out: see CLAUDE.md (a fading layer paints a black frame).
  const menu =
    pos &&
    createPortal(
      <div
        data-no-swipe
        className="fixed inset-0 z-[70]"
        onClick={() => setPos(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setPos(null);
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ left: pos.x, top: pos.y, width: MENU_W }}
          className="no-long-press absolute overflow-hidden rounded-xl bg-white py-1 shadow-2xl ring-1 ring-stone-200"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => choose(item)}
              className={`no-long-press flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm transition hover:bg-stone-100 active:bg-stone-100 ${
                item.danger ? "text-red-600 hover:bg-red-50 active:bg-red-50" : "text-stone-700"
              }`}
            >
              {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
              {item.label}
            </button>
          ))}
        </div>
      </div>,
      document.body
    );

  return { bind, menu };
}

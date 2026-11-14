import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, X } from "lucide-react";
import { useIsPhone } from "@/lib/useIsPhone";
import { t } from "@/lib/i18n";

// The "⋯" button and its menu: `actions` = [{ key, icon, label, run, danger? }].
// On a phone an iOS action sheet (plain actions, then the `danger` ones as their
// own group; closes with an ✕ where the page's own ✕ sits, or a tap on the dim
// strip), from `sm` up a popover. Used for plan items and for trip cards.
function MenuRow({ action: a, onClick, divided = false, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 text-start transition hover:bg-stone-100 active:bg-stone-100 ${
        compact ? "rounded-xl px-3 py-2.5 text-sm" : "px-4 py-3.5 text-[16px]"
      } ${divided ? "border-t border-stone-200" : ""} ${a.danger ? "text-red-600" : "text-stone-800"}`}
    >
      <a.icon className={`h-5 w-5 shrink-0 ${compact ? "sm:h-4 sm:w-4" : ""} ${a.danger ? "text-red-500" : "text-stone-400"}`} />
      {a.label}
    </button>
  );
}

// `corner`: where the sheet's ✕ goes — "header" (default) on the day view's own
// ✕; "page" on a page's top-right corner button (the trip list's sign-out),
// which it covers exactly, in the same white circle.
export default function ActionMenu({ actions, label, corner = "header" }) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const w = 248;
      const h = Math.min(actions.length * 40 + 24, window.innerHeight - 16);
      setPos({
        left: Math.min(Math.max(r.right - w, 8), window.innerWidth - w - 8),
        top: r.bottom + h + 8 > window.innerHeight ? Math.max(r.top - h - 4, 8) : r.bottom + 4,
      });
    }
    setOpen((o) => !o);
  };

  const plain = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);

  // Run inside the tap itself: a file picker only opens from a user gesture.
  const choose = (action) => {
    setOpen(false);
    action.run();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-stone-200/60 hover:text-stone-700 active:bg-stone-200/60"
        aria-label={t("Действия")}
        title={label || t("Действия")}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open &&
        createPortal(
          <div
            data-no-swipe
            className={`fixed inset-0 z-[70] ${phone ? "bg-stone-950/40" : ""}`}
            onClick={() => setOpen(false)}
          >
            {phone ? (
              // iOS action sheet: the actions, then the removals in their own group.
              // It closes with the ✕ (the very spot of the day's own ✕) or a tap
              // on the dimmed strip, which the height cap always leaves free.
              <>
              {corner === "page" ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white text-stone-600 shadow-sm ring-1 ring-stone-200"
                  aria-label={t("Закрыть")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <div className="pointer-events-none absolute inset-x-0 top-0 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
                  <div className="mx-auto flex w-full max-w-3xl justify-end">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-stone-200 text-stone-600"
                      aria-label={t("Закрыть")}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-6rem)] flex-col gap-2 overflow-y-auto px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              >
                {[plain, danger].map(
                  (group, gi) =>
                    group.length > 0 && (
                      <div key={gi} className="shrink-0 overflow-hidden rounded-2xl bg-white">
                        {group.map((a, i) => (
                          <MenuRow key={a.key} action={a} onClick={() => choose(a)} divided={i > 0} />
                        ))}
                      </div>
                    )
                )}
              </div>
              </>
            ) : (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute w-[248px] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-stone-200"
                style={{ left: pos.left, top: pos.top, maxHeight: "calc(100dvh - 16px)" }}
              >
                {plain.map((a) => (
                  <MenuRow key={a.key} action={a} onClick={() => choose(a)} compact />
                ))}
                {danger.length > 0 && <div className="my-1 border-t border-stone-200" />}
                {danger.map((a) => (
                  <MenuRow key={a.key} action={a} onClick={() => choose(a)} compact />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

import { motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { t } from "@/lib/i18n";

// Every dialog of the app as an iOS sheet: on the beige page colour, a bold
// title with a grey ✕, grouped white cards of rows (as in Settings), and one
// prominent button at the foot. A bottom sheet on a phone, a centred card from
// `sm` up. No opening animation — an opacity / scale animation on a modal as it
// opens makes Chrome paint a black frame (CLAUDE.md); closing still animates.
//
// `as="form"` + `onSubmit` makes the sheet a form (Enter submits). `busy` keeps
// it open (the scrim and ✕ do nothing) while something is saving.
export default function Sheet({ title, subtitle, onClose, busy = false, as = "div", onSubmit, footer, wide = false, children }) {
  const Panel = as === "form" ? motion.form : motion.div;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-stone-950/45" onClick={busy ? undefined : onClose} />
      <Panel
        onSubmit={onSubmit}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] shadow-2xl sm:rounded-[28px] ${
          wide ? "sm:max-w-lg" : "sm:max-w-md"
        }`}
        style={{ backgroundColor: "#fbf7f0" }}
        initial={false}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-stone-300 sm:hidden" aria-hidden="true" />
        <div className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-[22px] font-bold leading-tight tracking-tight text-stone-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[15px] leading-snug text-stone-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={busy ? undefined : onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-200 text-stone-600 transition hover:bg-stone-300"
            aria-label={t("Закрыть")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">{footer}</div>
        )}
      </Panel>
    </motion.div>
  );
}

// A caption over a white card of rows; `note` under it (grey, small).
export function SheetGroup({ label, note, children, className = "" }) {
  return (
    <section className={`mb-5 ${className}`}>
      {label && <h3 className="mb-1.5 px-4 text-[13px] uppercase tracking-wide text-stone-500">{label}</h3>}
      <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl bg-white">{children}</div>
      {note && <p className="mt-1.5 px-4 text-[13px] leading-snug text-stone-500">{note}</p>}
    </section>
  );
}

// One row: its name, then the control. `stack` puts the name above (wide controls).
export function SheetRow({ label, htmlFor, stack = false, children }) {
  if (stack) {
    return (
      <div className="px-4 py-2.5">
        {label && (
          <label htmlFor={htmlFor} className="mb-1 block text-[13px] text-stone-500">
            {label}
          </label>
        )}
        {children}
      </div>
    );
  }
  return (
    <div className="flex min-h-[48px] items-center gap-3 px-4">
      <label htmlFor={htmlFor} className="w-28 shrink-0 text-[15px] text-stone-500">
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// A borderless field for a row.
export const sheetInput =
  "w-full bg-transparent py-3 text-[17px] text-stone-900 outline-none placeholder:text-stone-400";

// The prominent button at a sheet's foot (`danger` = red), and the plain one.
export function SheetButton({ children, busy = false, danger = false, plain = false, className = "", ...rest }) {
  const look = plain
    ? "text-[#2c5f8a] hover:bg-black/5"
    : danger
      ? "text-white"
      : "text-white";
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={`inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-semibold transition disabled:opacity-60 ${look} ${className}`}
      style={plain ? undefined : { backgroundColor: danger ? "#d6453d" : "#1d3b5c" }}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// An iOS switch in a row: the label, then the toggle at the end.
export function SheetSwitch({ label, checked, onChange }) {
  return (
    <label className="flex min-h-[48px] cursor-pointer select-none items-center gap-3 px-4">
      <span className="min-w-0 flex-1 text-[17px] text-stone-900">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#3a7ca5]"
        style={{ backgroundColor: checked ? "#34c759" : "#d6d3d1" }}
      >
        <span
          className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all"
          style={{ insetInlineStart: checked ? 22 : 2 }}
        />
      </span>
    </label>
  );
}

// The big digits field of a PIN / passcode, on its own white card.
export const pinInput =
  "w-full rounded-2xl bg-white px-4 py-4 text-center text-3xl tabular-nums tracking-[0.6em] text-stone-900 outline-none placeholder:text-stone-300 focus:ring-2 focus:ring-[#3a7ca5]";

import { X } from "lucide-react";
import { t } from "@/lib/i18n";

// "HH:MM" as two plain <select>s (hours, minutes in 5-minute steps) instead of
// <input type="time">: Chrome's own Android clock dialog clips its "Set" button
// with a large system font, and we cannot style it. A select opens a plain list.
// "" = no time. A minute off the 5-minute grid (an older value) is kept as an option.
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, m) => String(m * 5).padStart(2, "0"));

export default function TimeSelect({ value, onChange, className = "" }) {
  const [h, m] = /^\d{2}:\d{2}$/.test(value || "") ? value.split(":") : ["", ""];
  const minutes = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;

  const set = (hour, minute) => onChange(hour ? `${hour}:${minute || "00"}` : "");

  const select =
    "min-w-0 flex-1 appearance-none bg-transparent px-1 py-0 text-center text-base tabular-nums text-stone-800 outline-none sm:text-sm";

  return (
    <div
      dir="ltr"
      className={`flex items-center rounded-xl border border-stone-200 bg-white px-2 py-2.5 transition focus-within:border-[#3a7ca5] focus-within:ring-2 focus-within:ring-[#3a7ca5]/20 sm:py-2 ${className}`}
    >
      <select aria-label={t("Часы")} value={h} onChange={(e) => set(e.target.value, m)} className={select}>
        <option value="">--</option>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="text-stone-400">:</span>
      <select
        aria-label={t("Минуты")}
        value={m}
        disabled={!h}
        onChange={(e) => set(h, e.target.value)}
        className={`${select} disabled:text-stone-300`}
      >
        {!h && <option value="">--</option>}
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      {h && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("Очистить")}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

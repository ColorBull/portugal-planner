import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { findCountry, searchCountries } from "@/lib/countries";
import CountryFlag from "@/components/CountryFlag";

/**
 * Type-to-search country picker: typing "п" narrows the list to Польша,
 * Португалия, Парагвай… each row with its flag.
 *
 * `value` is an alpha-2 code; `fallbackName` keeps the free text of trips saved
 * before this picker existed.
 */
export default function CountrySelect({ id, value, fallbackName, onChange }) {
  const selected = useMemo(
    () => findCountry(value) || findCountry(fallbackName),
    [value, fallbackName]
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const boxRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const results = useMemo(() => (open ? searchCountries(query) : []), [open, query]);

  useEffect(() => setCursor(0), [query]);

  // Close when the click lands anywhere else.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const pick = (country) => {
    onChange({ code: country.code, name: country.name });
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length)
        setCursor((c) => (c + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[cursor]) pick(results[cursor]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const label = selected?.name || fallbackName || "";

  return (
    <div ref={boxRef} className="relative">
      {open ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            id={id}
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Начните вводить страну…"
            autoComplete="off"
            autoFocus
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3.5 text-stone-800 outline-none transition focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20"
          />
        </div>
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => {
            setQuery("");
            setOpen(true);
          }}
          className="flex w-full items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-left text-stone-800 outline-none transition hover:border-stone-300 focus:border-[#3a7ca5] focus:ring-2 focus:ring-[#3a7ca5]/20"
        >
          {selected ? (
            <CountryFlag code={selected.code} width={22} />
          ) : (
            <span className="h-4 w-[22px] rounded-[3px] bg-stone-100 ring-1 ring-stone-200" />
          )}
          <span className={label ? "" : "text-stone-400"}>{label || "Выберите страну"}</span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-stone-400" />
        </button>
      )}

      {open && (
        <div
          ref={listRef}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-white py-1 shadow-xl"
        >
          {results.length === 0 ? (
            <p className="px-3.5 py-3 text-sm text-stone-400">Ничего не найдено</p>
          ) : (
            results.map((country, i) => (
              <button
                key={country.code}
                type="button"
                data-active={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(country)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition ${
                  i === cursor ? "bg-[#f1e7d8] text-stone-900" : "text-stone-700"
                }`}
              >
                <CountryFlag code={country.code} width={22} />
                <span className="truncate">{country.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

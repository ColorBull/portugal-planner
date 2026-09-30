import { useEffect, useRef, useState } from "react";
import { Check, Globe2 } from "lucide-react";
import { LANGUAGES, useLang, t } from "@/lib/i18n";

// Top-left of the trip list and the sign-in screen. `left-3` is physical on
// purpose: it stays in the left corner in Hebrew too.
export default function LanguageSwitch({ className = "" }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} dir="ltr" className={`fixed left-3 top-3 z-40 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/70 px-3 text-sm font-medium text-stone-600 shadow-sm ring-1 ring-stone-200 backdrop-blur transition hover:text-stone-900"
        aria-label={t("Язык")}
        title={t("Язык")}
      >
        <Globe2 className="h-4 w-4" />
        {current.short}
      </button>

      {open && (
        <div className="absolute left-0 top-12 w-40 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-stone-200">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setOpen(false);
                setLang(l.code);
              }}
              className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-sm transition hover:bg-stone-100 ${
                l.code === lang ? "font-semibold text-[#1d3b5c]" : "text-stone-700"
              }`}
              dir={l.dir}
            >
              {l.name}
              {l.code === lang && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

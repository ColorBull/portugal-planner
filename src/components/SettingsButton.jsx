import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronRight, Monitor, Moon, Settings, Sun } from "lucide-react";
import Sheet, { SheetGroup } from "@/components/Sheet";
import { LANGUAGES, useLang, t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import CalendarSettings from "@/components/CalendarSettings";
import PinnedCorner from "@/components/PinnedCorner";

// Gear button, top-left of the trip list and the sign-in screen, and its dialog:
// language, colour theme and — once signed in (`calendar`) — Google Calendar sync.
// `left-3` is physical on purpose: it stays in the left corner in Hebrew too.
// No open animation: see CLAUDE.md (a fading layer paints a black frame).

// One choice of a list, as in iOS Settings: the name, a ✓ on the current one.
function Choice({ active, onClick, icon: Icon, dir, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center gap-3 px-4 text-start transition hover:bg-stone-100"
    >
      {Icon && <Icon className="h-5 w-5 shrink-0 text-stone-500" />}
      {/* <bdi>: the name keeps its own direction, the row its alignment. */}
      <span className="min-w-0 flex-1 text-[17px] text-stone-900">
        <bdi dir={dir}>{children}</bdi>
      </span>
      {active && <Check className="h-5 w-5 shrink-0 text-[#2c5f8a]" strokeWidth={2.5} />}
    </button>
  );
}

const THEME_OPTIONS = [
  { value: "system", label: "Системная", icon: Monitor },
  { value: "dark", label: "Тёмная", icon: Moon },
  { value: "light", label: "Светлая", icon: Sun },
];

export default function SettingsButton({ calendar = false }) {
  const { lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("main"); // "main" | "calendar"

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setView("main");
  };

  return (
    <>
      <PinnedCorner side="left">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-black/5 transition hover:bg-white"
          aria-label={t("Настройки")}
          title={t("Настройки")}
        >
          <Settings className="h-4 w-4" />
        </button>
      </PinnedCorner>

      {open && (
        <Sheet onClose={close} title={t("Настройки")}>
          {view === "calendar" ? (
            <CalendarSettings onBack={() => setView("main")} />
          ) : (
            <>
              <SheetGroup label={t("Язык")}>
                {LANGUAGES.map((l) => (
                  <Choice key={l.code} active={l.code === lang} dir={l.dir} onClick={() => setLang(l.code)}>
                    {l.name}
                  </Choice>
                ))}
              </SheetGroup>

              <SheetGroup label={t("Тема")}>
                {THEME_OPTIONS.map(({ value, label: name, icon }) => (
                  <Choice key={value} active={theme === value} icon={icon} onClick={() => setTheme(value)}>
                    {t(name)}
                  </Choice>
                ))}
              </SheetGroup>

              {calendar && (
                <SheetGroup label={t("Синхронизация")}>
                  <button
                    type="button"
                    onClick={() => setView("calendar")}
                    className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-start transition hover:bg-stone-100"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: "#2c5f8a" }}>
                      <CalendarDays className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] text-stone-900">Google Calendar</span>
                      <span className="block text-[13px] leading-snug text-stone-500">
                        {t("Расписание поездки — в календарь, изменения — обратно")}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-stone-400 rtl:rotate-180" />
                  </button>
                </SheetGroup>
              )}
            </>
          )}

          {/* Which build this is (vite.config.js) — to see whether it is the latest. */}
          <p dir="ltr" className="mt-2 text-center text-[11px] text-stone-400">
            {typeof __BUILD_TIME__ === "undefined" ? "dev" : __BUILD_TIME__}
          </p>
        </Sheet>
      )}
    </>
  );
}

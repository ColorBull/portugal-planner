import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronRight, Monitor, Moon, Settings, Sun, X } from "lucide-react";
import { LANGUAGES, useLang, t } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import CalendarSettings from "@/components/CalendarSettings";
import PinnedCorner from "@/components/PinnedCorner";

// Gear button, top-left of the trip list and the sign-in screen, and its dialog:
// language, colour theme and — once signed in (`calendar`) — Google Calendar sync.
// `left-3` is physical on purpose: it stays in the left corner in Hebrew too.
// No open animation: see CLAUDE.md (a fading layer paints a black frame).

const label = "mb-2 block text-[11px] font-semibold uppercase tracking-wider text-stone-500";

function Segment({ active, onClick, children, dir }) {
  return (
    <button
      type="button"
      onClick={onClick}
      dir={dir}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-medium transition ${
        active
          ? "bg-[#1d3b5c] text-white"
          : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
      }`}
    >
      {children}
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
          className="grid h-10 w-10 place-items-center rounded-full bg-white/85 text-stone-600 shadow-sm ring-1 ring-stone-200 transition hover:text-stone-900"
          aria-label={t("Настройки")}
          title={t("Настройки")}
        >
          <Settings className="h-4 w-4" />
        </button>
      </PinnedCorner>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-stone-950/60" onClick={close} />
          <div
            className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl"
            style={{ backgroundColor: "#fbf7f0" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-[#1d3b5c]">
                <Settings className="h-5 w-5" />
                {t("Настройки")}
              </h2>
              <button
                type="button"
                onClick={close}
                className="grid h-9 w-9 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                aria-label={t("Закрыть")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {view === "calendar" ? (
              <CalendarSettings onBack={() => setView("main")} />
            ) : (
              <div className="space-y-5">
                <section>
                  <span className={label}>{t("Язык")}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {LANGUAGES.map((l) => (
                      <Segment key={l.code} active={l.code === lang} dir={l.dir} onClick={() => setLang(l.code)}>
                        {l.name}
                      </Segment>
                    ))}
                  </div>
                </section>

                <section>
                  <span className={label}>{t("Тема")}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map(({ value, label: name, icon: Icon }) => (
                      <Segment key={value} active={theme === value} onClick={() => setTheme(value)}>
                        <Icon className="h-4 w-4" />
                        {t(name)}
                      </Segment>
                    ))}
                  </div>
                </section>

                {calendar && (
                  <section>
                    <span className={label}>{t("Синхронизация")}</span>
                    <button
                      type="button"
                      onClick={() => setView("calendar")}
                      className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-start ring-1 ring-stone-200 transition hover:bg-stone-100"
                    >
                      <CalendarDays className="h-5 w-5 shrink-0 text-[#1d3b5c]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-stone-700">Google Calendar</span>
                        <span className="block text-xs text-stone-400">
                          {t("Расписание поездки — в календарь, изменения — обратно")}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 rtl:rotate-180" />
                    </button>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

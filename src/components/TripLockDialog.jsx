import { useState } from "react";
import { Loader2, Lock, LockOpen, KeyRound } from "lucide-react";
import {
  PIN_LENGTH,
  isValidPin,
  hashPin,
  rememberUnlock,
  forgetUnlock,
  markRevealed,
} from "@/lib/tripLock";

// Three uses, see lib/tripLock.js:
//   mode "unlock" — anyone opening a locked trip enters the PIN
//   mode "setup"  — the owner picks a PIN (new lock, or a new PIN)
//   mode "manage" — the owner, inside a locked trip: change the PIN or unlock
// No open animation: a fading full-screen layer makes Chrome paint a black
// frame (see CLAUDE.md).

const pinField =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-center text-2xl " +
  "tracking-[0.6em] tabular-nums text-stone-800 outline-none transition " +
  "focus:border-[#1d3b5c] focus:ring-2 focus:ring-[#1d3b5c]/20";

const primary =
  "inline-flex items-center gap-1.5 rounded-full bg-[#1d3b5c] px-4 py-2 text-sm font-medium " +
  "text-white transition hover:bg-[#16304b] disabled:opacity-50";

const secondary =
  "rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-800 " +
  "disabled:opacity-50";

function PinInput({ value, onChange, autoFocus, label }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      pattern="\d*"
      autoComplete="off"
      maxLength={PIN_LENGTH}
      autoFocus={autoFocus}
      aria-label={label}
      placeholder={"•".repeat(PIN_LENGTH)}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
      className={pinField}
    />
  );
}

function RememberBox({ checked, onChange }) {
  return (
    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-stone-600 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#1d3b5c]"
      />
      Запомнить пароль на этом устройстве
    </label>
  );
}

export default function TripLockDialog({
  mode: initialMode,
  trip,
  showName = true,
  onUnlocked,
  onSetPin,
  onClose,
}) {
  const [mode, setMode] = useState(initialMode);
  const [pin, setPin] = useState("");
  const [repeat, setRepeat] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const fail = (message) => {
    setError(message);
    setBusy(false);
  };

  const unlock = async (e) => {
    e.preventDefault();
    if (!isValidPin(pin)) return fail(`Введите ${PIN_LENGTH} цифры.`);
    const hash = await hashPin(trip.id, pin);
    if (hash !== trip.pin_hash) {
      setPin("");
      return fail("Неверный PIN-код.");
    }
    if (remember) rememberUnlock(trip, hash);
    markRevealed(trip, hash);
    onUnlocked();
  };

  const setup = async (e) => {
    e.preventDefault();
    if (!isValidPin(pin)) return fail(`PIN-код — это ${PIN_LENGTH} цифры.`);
    if (pin !== repeat) {
      setRepeat("");
      return fail("PIN-коды не совпадают.");
    }
    setBusy(true);
    setError(null);
    try {
      const hash = await hashPin(trip.id, pin);
      await onSetPin(hash);
      if (remember) rememberUnlock(trip, hash);
      else forgetUnlock(trip.id);
      onClose();
    } catch (err) {
      console.error(err);
      fail("Не удалось сохранить PIN-код.");
    }
  };

  const removeLock = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSetPin(null);
      forgetUnlock(trip.id);
      onClose();
    } catch (err) {
      console.error(err);
      fail("Не удалось снять блокировку.");
    }
  };

  const title =
    mode === "unlock"
      ? "Поездка закрыта"
      : mode === "manage"
      ? "Поездка закрыта PIN-кодом"
      : trip.pin_hash
      ? "Новый PIN-код"
      : "Закрыть поездку";

  const message =
    mode === "unlock"
      ? showName
        ? `Введите PIN-код, чтобы открыть поездку «${trip.city}».`
        : "Введите PIN-код, чтобы открыть эту поездку."
      : mode === "manage"
      ? "Можно сменить PIN-код или снять блокировку — тогда поездку снова откроют все."
      : `Придумайте PIN-код из ${PIN_LENGTH} цифр. Без него поездку не откроет никто, включая вас.`;

  const Icon = mode === "unlock" ? Lock : mode === "manage" ? KeyRound : Lock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/60" onClick={busy ? undefined : onClose} />
      <form
        onSubmit={mode === "unlock" ? unlock : mode === "setup" ? setup : (e) => e.preventDefault()}
        className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{ backgroundColor: "#fbf7f0" }}
      >
        <div className="flex items-center gap-2 text-[#1d3b5c]">
          <Icon className="h-4 w-4" />
          <h2 className="font-display text-xl font-semibold">{title}</h2>
        </div>
        <p className="mt-2 text-sm text-stone-600">{message}</p>

        {mode === "unlock" && (
          <div className="mt-4">
            <PinInput
              value={pin}
              label="PIN-код"
              autoFocus
              onChange={(v) => {
                setPin(v);
                setError(null);
              }}
            />
            <RememberBox checked={remember} onChange={setRemember} />
          </div>
        )}

        {mode === "setup" && (
          <div className="mt-4 space-y-2">
            <PinInput
              value={pin}
              label="PIN-код"
              autoFocus
              onChange={(v) => {
                setPin(v);
                setError(null);
              }}
            />
            <PinInput
              value={repeat}
              label="Повторите PIN-код"
              onChange={(v) => {
                setRepeat(v);
                setError(null);
              }}
            />
            <p className="text-xs text-stone-400">Второй раз — для проверки.</p>
            <RememberBox checked={remember} onChange={setRemember} />
          </div>
        )}

        {error && <p className="mt-2 text-sm text-[#a8451f]">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {mode === "manage" ? (
            <>
              <button type="button" onClick={onClose} disabled={busy} className={secondary}>
                Отмена
              </button>
              <button
                type="button"
                onClick={removeLock}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-[#a8451f] ring-1 ring-[#a8451f]/30 transition hover:bg-[#f7e9e3] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
                Снять блокировку
              </button>
              <button type="button" onClick={() => setMode("setup")} disabled={busy} className={primary}>
                <KeyRound className="h-4 w-4" />
                Сменить PIN
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={busy} className={secondary}>
                {mode === "unlock" ? "К поездкам" : "Отмена"}
              </button>
              <button
                type="submit"
                disabled={busy || pin.length < PIN_LENGTH || (mode === "setup" && repeat.length < PIN_LENGTH)}
                className={primary}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "unlock" ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {mode === "unlock" ? "Открыть" : trip.pin_hash ? "Сохранить" : "Закрыть поездку"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

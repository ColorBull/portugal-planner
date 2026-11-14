import { useState } from "react";
import Sheet, { SheetButton, SheetGroup, SheetSwitch, pinInput } from "@/components/Sheet";
import {
  PIN_LENGTH,
  isValidPin,
  hashPin,
  rememberUnlock,
  forgetUnlock,
  markRevealed,
} from "@/lib/tripLock";
import { t } from "@/lib/i18n";
import { ownerName } from "@/lib/family";
import { tripRangeLabel } from "@/lib/tripDays";

// Three uses, see lib/tripLock.js:
//   mode "unlock" — anyone opening a locked trip enters the PIN
//   mode "setup"  — the owner picks a PIN (new lock, or a new PIN)
//   mode "manage" — the owner, inside a locked trip: change the PIN or unlock
// No open animation: a fading full-screen layer makes Chrome paint a black
// frame (see CLAUDE.md).

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
      className={pinInput}
    />
  );
}

function RememberBox({ checked, onChange }) {
  return (
    <SheetGroup className="mt-4">
      <SheetSwitch label={t("Запомнить пароль на этом устройстве")} checked={checked} onChange={onChange} />
    </SheetGroup>
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
    if (!isValidPin(pin)) return fail(t("Введите {n} цифры.", { n: PIN_LENGTH }));
    const hash = await hashPin(trip.id, pin);
    if (hash !== trip.pin_hash) {
      setPin("");
      return fail(t("Неверный PIN-код."));
    }
    if (remember) rememberUnlock(trip, hash);
    markRevealed(trip, hash);
    onUnlocked();
  };

  const setup = async (e) => {
    e.preventDefault();
    if (!isValidPin(pin)) return fail(t("PIN-код — это {n} цифры.", { n: PIN_LENGTH }));
    if (pin !== repeat) {
      setRepeat("");
      return fail(t("PIN-коды не совпадают."));
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
      fail(t("Не удалось сохранить PIN-код."));
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
      fail(t("Не удалось снять блокировку."));
    }
  };

  const title =
    mode === "unlock"
      ? t("Поездка закрыта")
      : mode === "manage"
      ? t("Поездка закрыта PIN-кодом")
      : trip.pin_hash
      ? t("Новый PIN-код")
      : t("Закрыть поездку");

  const message =
    mode === "unlock"
      ? showName
        ? t("Введите PIN-код, чтобы открыть поездку «{city}».", { city: trip.city })
        : t("Введите PIN-код, чтобы открыть поездку от {name} ({dates}).", {
            name: ownerName(trip),
            dates: tripRangeLabel(trip),
          })
      : mode === "manage"
      ? t("Можно сменить PIN-код или снять блокировку — тогда поездку снова откроют все.")
      : t("Придумайте PIN-код из {n} цифр. Без него поездку не откроет никто, включая вас.", { n: PIN_LENGTH });

  return (
    <Sheet
      as="form"
      onSubmit={mode === "unlock" ? unlock : mode === "setup" ? setup : (e) => e.preventDefault()}
      onClose={onClose}
      busy={busy}
      title={title}
      subtitle={message}
      footer={
        mode === "manage" ? (
          <div className="space-y-2">
            <SheetButton type="button" onClick={() => setMode("setup")} disabled={busy}>
              {t("Сменить PIN")}
            </SheetButton>
            <SheetButton type="button" plain onClick={removeLock} busy={busy} className="!text-[#d6453d]">
              {t("Снять блокировку")}
            </SheetButton>
          </div>
        ) : (
          <div className="space-y-2">
            <SheetButton
              type="submit"
              busy={busy}
              disabled={pin.length < PIN_LENGTH || (mode === "setup" && repeat.length < PIN_LENGTH)}
            >
              {mode === "unlock" ? t("Открыть") : trip.pin_hash ? t("Сохранить") : t("Закрыть поездку")}
            </SheetButton>
            {mode === "unlock" && (
              <SheetButton type="button" plain onClick={onClose} disabled={busy}>
                {t("К поездкам")}
              </SheetButton>
            )}
          </div>
        )
      }
    >
      {mode === "unlock" && (
        <>
          <PinInput
            value={pin}
            label={t("PIN-код")}
            autoFocus
            onChange={(v) => {
              setPin(v);
              setError(null);
            }}
          />
          <RememberBox checked={remember} onChange={setRemember} />
        </>
      )}

      {mode === "setup" && (
        <>
          <div className="space-y-2">
            <PinInput
              value={pin}
              label={t("PIN-код")}
              autoFocus
              onChange={(v) => {
                setPin(v);
                setError(null);
              }}
            />
            <PinInput
              value={repeat}
              label={t("Повторите PIN-код")}
              onChange={(v) => {
                setRepeat(v);
                setError(null);
              }}
            />
          </div>
          <p className="mt-1.5 px-4 text-[13px] text-stone-500">{t("Второй раз — для проверки.")}</p>
          <RememberBox checked={remember} onChange={setRemember} />
        </>
      )}

      {error && <p className="mt-2 px-4 text-[15px] text-[#a8451f]">{error}</p>}
    </Sheet>
  );
}

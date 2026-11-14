import { useState } from "react";
import Sheet, { SheetButton, pinInput } from "@/components/Sheet";
import { sha256, hashPin, isTripLocked } from "@/lib/tripLock";
import { t } from "@/lib/i18n";

// SHA-256 of the passcode for deleting an archived trip. Only the hash is in
// the (public) source; the passcode itself lives with the family.
const PASSCODE_SHA256 = "d9e828652367af311ad485eeb36e0406b6fa40285e7650a002c0afbdea5ff1ab";

// Asks for the passcode, then runs `onConfirm`. For a PIN-locked `trip` the
// trip's own PIN is asked instead, so the lock can't be bypassed this way. No open animation: a fading
// full-screen layer makes Chrome paint a black frame (see CLAUDE.md).
export default function PasscodeDialog({ title, message, trip, onConfirm, onClose }) {
  const locked = isTripLocked(trip);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const entered = code.trim();
    const ok = locked
      ? (await hashPin(trip.id, entered)) === trip.pin_hash
      : (await sha256(entered)) === PASSCODE_SHA256;
    if (!ok) {
      setError(locked ? t("Неверный PIN-код поездки.") : t("Неверный код."));
      setCode("");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t("Не удалось удалить поездку."));
      setBusy(false);
    }
  };

  return (
    <Sheet
      as="form"
      onSubmit={submit}
      onClose={onClose}
      busy={busy}
      title={title}
      subtitle={message}
      footer={
        <SheetButton type="submit" danger busy={busy} disabled={!code}>
          {t("Удалить навсегда")}
        </SheetButton>
      }
    >
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError(null);
        }}
        placeholder={locked ? t("PIN-код поездки") : t("Код")}
        aria-label={locked ? t("PIN-код поездки") : t("Код")}
        className={`${pinInput} placeholder:text-base placeholder:tracking-normal`}
      />
      {error && <p className="mt-2 px-4 text-[15px] text-[#a8451f]">{error}</p>}
    </Sheet>
  );
}

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

// SHA-256 of the passcode for deleting an archived trip. Only the hash is in
// the (public) source; the passcode itself lives with the family.
const PASSCODE_SHA256 = "d9e828652367af311ad485eeb36e0406b6fa40285e7650a002c0afbdea5ff1ab";

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Asks for the passcode, then runs `onConfirm`. No open animation: a fading
// full-screen layer makes Chrome paint a black frame (see CLAUDE.md).
export default function PasscodeDialog({ title, message, onConfirm, onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if ((await sha256(code.trim())) !== PASSCODE_SHA256) {
      setError("Неверный код.");
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
      setError("Не удалось удалить поездку.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/60" onClick={busy ? undefined : onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{ backgroundColor: "#fbf7f0" }}
      >
        <div className="flex items-center gap-2 text-[#a8451f]">
          <Lock className="h-4 w-4" />
          <h2 className="font-display text-xl font-semibold">{title}</h2>
        </div>
        <p className="mt-2 text-sm text-stone-600">{message}</p>

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
          placeholder="Код"
          className="mt-4 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-stone-800 outline-none transition focus:border-[#a8451f] focus:ring-2 focus:ring-[#a8451f]/20"
        />
        {error && <p className="mt-2 text-sm text-[#a8451f]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-800 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={busy || !code}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#a8451f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8f3a19] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Удалить навсегда
          </button>
        </div>
      </form>
    </div>
  );
}

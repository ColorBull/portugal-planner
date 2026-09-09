import { Plane, LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const shell =
  "relative min-h-screen w-full flex flex-col items-center justify-center px-6 py-10 text-center";
const bg = {
  background:
    "radial-gradient(120% 120% at 15% 10%, #fdfaf4 0%, #f5ecdd 45%, #ead9c2 100%)",
};

function GoogleGlyph({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.3 0 20 0 24s.9 7.7 2.5 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.4 0 11.9-2.1 15.8-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.7-3.7-13.6-8.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function SignInScreen() {
  const { signIn, signingIn, error } = useAuth();
  return (
    <div className={shell} style={bg}>
      <span
        className="grid h-16 w-16 place-items-center rounded-2xl mb-6 shadow-lg"
        style={{ background: "linear-gradient(150deg,#1d3b5c,#3a7ca5)" }}
      >
        <Plane className="h-8 w-8 text-white" />
      </span>
      <h1
        className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mb-2"
        style={{ color: "#1d3b5c" }}
      >
        Португалия 2026
      </h1>
      <p className="text-stone-500 mb-8">Войдите, чтобы открыть план поездки</p>

      <button
        onClick={signIn}
        disabled={signingIn}
        className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-stone-700 shadow-md ring-1 ring-stone-200 transition hover:shadow-lg disabled:opacity-60"
      >
        <GoogleGlyph className="h-5 w-5" />
        {signingIn ? "Вход…" : "Войти через Google"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600 max-w-xs">{error}</p>}
    </div>
  );
}

export function AccessRestricted() {
  const { user, signOut } = useAuth();
  return (
    <div className={shell} style={bg}>
      <h1 className="font-display text-3xl font-semibold mb-3" style={{ color: "#1d3b5c" }}>
        Нет доступа
      </h1>
      <p className="text-stone-600 max-w-sm">
        Аккаунт <span className="font-medium">{user?.email}</span> не в списке
        участников поездки. Попросите добавить его или войдите другим аккаунтом.
      </p>
      <button
        onClick={signOut}
        className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-stone-600 ring-1 ring-stone-300 transition hover:bg-white"
      >
        <LogOut className="h-4 w-4" />
        Выйти
      </button>
    </div>
  );
}

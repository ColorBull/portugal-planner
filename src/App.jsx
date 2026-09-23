import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { LogOut, WifiOff } from "lucide-react";
import { useOnline } from "@/lib/useOnline";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import { SignInScreen, AccessRestricted } from "@/pages/SignIn";
import { TripProvider } from "@/lib/TripContext";
import Home from "./pages/Home";
import TripPicker from "./pages/TripPicker";
import MapBackdrop from "@/components/MapBackdrop";

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <button
      onClick={signOut}
      title="Выйти"
      aria-label="Выйти"
      className="fixed top-3 right-3 z-40 grid h-9 w-9 place-items-center rounded-full bg-white/70 text-stone-500 shadow-sm ring-1 ring-stone-200 backdrop-blur transition hover:text-stone-800"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}

// Shown while there is no connection: the app is running on this device's
// saved copy, and edits are queued until the network comes back.
function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      title="Нет подключения. Показаны сохранённые на устройстве данные; изменения отправятся, когда появится сеть."
      className="fixed top-3 right-14 z-40 flex h-9 items-center gap-1.5 rounded-full bg-amber-50/90 px-3 text-xs font-medium text-amber-800 shadow-sm ring-1 ring-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5" />
      Офлайн
    </div>
  );
}

function Gate() {
  const { user, loading, isAllowed } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <SignInScreen />;
  if (!isAllowed) return <AccessRestricted />;

  return (
    <TripProvider>
      <MapBackdrop />
      <OfflineBadge />
      <Routes>
        {/* Sign-out lives on the trip list only; inside a trip that corner
            belongs to the PIN-lock button. */}
        <Route
          path="/"
          element={
            <>
              <SignOutButton />
              <TripPicker />
            </>
          }
        />
        <Route path="/trip/:tripId" element={<Home />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </TripProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Gate />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

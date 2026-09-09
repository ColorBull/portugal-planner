import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { LogOut } from "lucide-react";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import { SignInScreen, AccessRestricted } from "@/pages/SignIn";
import Home from "./pages/Home";

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
    <>
      <SignOutButton />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
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

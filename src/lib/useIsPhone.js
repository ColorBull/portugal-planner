import { useEffect, useState } from "react";

// Below Tailwind's `sm` breakpoint. For the few places where a phone needs a
// different element order, not just different sizes (e.g. the plan editor's
// drag handle, which may only exist once per card).
const QUERY = "(max-width: 639px)";

export function useIsPhone() {
  const [phone, setPhone] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return phone;
}

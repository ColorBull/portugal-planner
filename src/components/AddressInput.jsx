import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

// Address suggestions come from OpenStreetMap's Nominatim, which needs no key
// and no billing. Picking one stores the label plus a Google Maps link built
// from its coordinates, so the plan still opens in Google Maps.
const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_CHARS = 3;
const DEBOUNCE_MS = 450;

const mapUrlFor = (place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.lat},${place.lon}`
  )}`;

export default function AddressInput({ value, onChange, className, placeholder }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const boxRef = useRef(null);
  const abortRef = useRef(null);
  // Set while applying a suggestion, so the resulting value change does not
  // immediately trigger a fresh search for the text we just filled in.
  const justPickedRef = useRef(false);

  useEffect(() => {
    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }

    const query = (value || "").trim();
    if (query.length < MIN_CHARS) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(
          `${ENDPOINT}?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(`Nominatim ${res.status}`);
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch (err) {
        if (err.name !== "AbortError") {
          setResults([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const pick = (place) => {
    justPickedRef.current = true;
    onChange({ address: place.display_name, mapUrl: mapUrlFor(place) });
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        className={className}
        value={value || ""}
        // Typing by hand drops the link of any place picked earlier; the plan
        // then opens a Google Maps search for the typed address instead.
        onChange={(e) => onChange({ address: e.target.value, mapUrl: "" })}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />

      {loading && (
        <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />
      )}

      {open && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
          {results.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => pick(place)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-stone-700 transition hover:bg-stone-100"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                <span className="min-w-0 break-words">{place.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

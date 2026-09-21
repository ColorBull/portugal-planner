import { useEffect, useRef, useState } from "react";
import {
  COUNTRY_PATHS,
  LAND_PATH,
  MAP_HEIGHT,
  MAP_POINTS,
  MAP_WIDTH,
  MAP_WINDOWS,
} from "@/data/worldMap";
import { COUNTRIES } from "@/data/countries";
import CountryFlag from "@/components/CountryFlag";

// A flat vector sketch of the world: continent silhouettes, no borders, no
// labels, no grid. The outlines are projected ahead of time (see
// scripts/gen-worldmap.mjs), so a continent view is the same drawing panned and
// scaled — and CSS animates between the two.

const EASE = "transform 900ms cubic-bezier(0.45, 0, 0.25, 1), opacity 900ms ease";

// Every outline as one path, for the dashed borders of the zoomed-in view.
const BORDERS = Object.values(COUNTRY_PATHS).join("");

// Width of each outline in map units, to skip labels that wouldn't fit.
const widths = {};
function widthOf(ccn3) {
  if (!(ccn3 in widths)) {
    const xs = (COUNTRY_PATHS[ccn3] || "").match(/-?[\d.]+(?= )/g)?.map(Number) || [];
    widths[ccn3] = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  }
  return widths[ccn3];
}

const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

// Whole world: fit it on screen. A continent: fill the screen with its window,
// centred on the trip's country — a narrow screen only shows a slice of a
// continent, and that slice has to be the part with the country in it.
function viewFor(continent, width, height, at) {
  const box = MAP_WINDOWS[continent];
  if (!box) {
    // The world is twice as wide as it is tall, so fitting it whole leaves
    // empty bands — worst of all on a phone, where it shrinks to a strip.
    // Fill the screen instead and let the far edges crop.
    const k = Math.max(width / MAP_WIDTH, height / MAP_HEIGHT);
    return { k, x: (width - MAP_WIDTH * k) / 2, y: (height - MAP_HEIGHT * k) / 2 };
  }
  const [x0, y0, x1, y1] = box;
  const k = Math.max(width / (x1 - x0), height / (y1 - y0));
  // Sideways, keep the country on screen but stay inside the continent.
  const cx = at ? clamp(at[0], x0 + width / (2 * k), x1 - width / (2 * k)) : (x0 + x1) / 2;
  // Vertically, sit it below the header and the day cards instead of under
  // them — otherwise the highlight is hidden by the very page it belongs to.
  const cy = at ? at[1] - (height * 0.18) / k : (y0 + y1) / 2;
  return { k, x: width / 2 - k * cx, y: height / 2 - k * cy };
}

/**
 * The size to draw at. Mobile browsers grow and shrink the viewport as the
 * address bar hides on scroll; re-fitting the map on every one of those would
 * make it drift under the page. So the tallest height seen for a given width
 * wins, and the bar just covers a sliver of the map when it comes back.
 */
function useSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize((prev) => {
        if (prev.width === width && height <= prev.height) return prev;
        // A new width means a rotation or a resized window: start over.
        return { width, height: prev.width === width ? Math.max(prev.height, height) : height };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * The map behind every screen. No `continent` draws the whole world; naming one
 * zooms to it with `highlightCcn3` painted in accent.
 */
export default function WorldMapBackground({ continent = null, highlightCcn3 = null }) {
  const hostRef = useRef(null);
  const { width, height } = useSize(hostRef);

  // Hold on to the last country so it fades out during the zoom back out.
  const [held, setHeld] = useState(highlightCcn3);
  useEffect(() => {
    if (highlightCcn3) setHeld(highlightCcn3);
  }, [highlightCcn3]);
  const [heldContinent, setHeldContinent] = useState(continent);
  useEffect(() => {
    if (continent) setHeldContinent(continent);
  }, [continent]);

  if (!width || !height) return <div ref={hostRef} className="absolute inset-0" />;

  const { k, x, y } = viewFor(continent, width, height, held && MAP_POINTS[held]);
  const countryPath = held && COUNTRY_PATHS[held];
  // Countries too small to have an outline at this resolution get a pin instead.
  const pin = held && !countryPath && MAP_POINTS[held];
  // Name + flag on every country of the continent big enough to hold one.
  const labels = COUNTRIES.filter(
    (c) =>
      c.continent === heldContinent &&
      MAP_POINTS[c.ccn3] &&
      (c.ccn3 === held || widthOf(c.ccn3) * k >= 70)
  );

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="absolute left-0 top-0"
      >
        <g style={{ transform: `translate(${x}px, ${y}px) scale(${k})`, transition: EASE }}>
          <path d={LAND_PATH} fill="#1d3b5c" fillOpacity={0.12} />
          <path
            d={BORDERS}
            fill="none"
            stroke="#1d3b5c"
            strokeOpacity={continent ? 0.35 : 0}
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            style={{ transition: EASE }}
          />
          {countryPath && (
            <path
              d={countryPath}
              fill="#c4623a"
              fillOpacity={continent ? 0.28 : 0}
              stroke="#a8451f"
              strokeOpacity={continent ? 0.5 : 0}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              style={{ transition: EASE }}
            />
          )}
        </g>
        {pin && (
          // Outside the zoomed group, so the pin keeps its size on screen.
          <g
            opacity={continent ? 1 : 0}
            style={{
              transform: `translate(${x + k * pin[0]}px, ${y + k * pin[1]}px)`,
              transition: EASE,
            }}
          >
            <circle r={16} fill="#c4623a" fillOpacity={0.22} />
            <circle r={6} fill="#c4623a" fillOpacity={0.75} />
          </g>
        )}
      </svg>
      {labels.map((c) => (
        <div
          key={c.ccn3}
          className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap text-[11px] font-medium text-[#1d3b5c]/70"
          style={{
            left: x + k * MAP_POINTS[c.ccn3][0],
            top: y + k * MAP_POINTS[c.ccn3][1],
            opacity: continent ? 1 : 0,
            transition: "left 900ms cubic-bezier(0.45, 0, 0.25, 1), top 900ms cubic-bezier(0.45, 0, 0.25, 1), opacity 900ms ease",
          }}
        >
          <CountryFlag code={c.code} width={14} />
          {c.name}
        </div>
      ))}
    </div>
  );
}

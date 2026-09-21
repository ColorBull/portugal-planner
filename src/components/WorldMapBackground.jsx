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

// Dashed borders, one path per continent — the whole world's worth is far too
// heavy to stroke with dashes.
const borders = {};
function bordersOf(continent) {
  if (!(continent in borders)) {
    borders[continent] = COUNTRIES.filter((c) => c.continent === continent)
      .map((c) => COUNTRY_PATHS[c.ccn3] || "")
      .join("");
  }
  return borders[continent];
}

// Each outline as rings of [x, y] points, parsed once.
const rings = {};
function ringsOf(ccn3) {
  if (!(ccn3 in rings)) {
    rings[ccn3] = (COUNTRY_PATHS[ccn3] || "")
      .split("M")
      .filter(Boolean)
      .map((seg) => [...seg.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]));
  }
  return rings[ccn3];
}

// Even-odd point-in-polygon over all rings, so islands and lakes both count.
function inside(rs, px, py) {
  let hit = false;
  for (const r of rs) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

// The main ring's centre and long axis: where a label is tried first, and the
// angle it is tried at when it doesn't fit straight.
function shapeOf(rs) {
  const main = rs.reduce((a, b) => (b.length > a.length ? b : a), []);
  let cx = 0;
  let cy = 0;
  main.forEach(([x, y]) => ((cx += x), (cy += y)));
  cx /= main.length;
  cy /= main.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  main.forEach(([x, y]) => {
    sxx += (x - cx) ** 2;
    syy += (y - cy) ** 2;
    sxy += (x - cx) * (y - cy);
  });
  let angle = (Math.atan2(2 * sxy, sxx - syy) / 2) * (180 / Math.PI);
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return { cx, cy, angle };
}

// Does a w×h box (map units), centred at c and turned by `deg`, sit wholly
// inside the country? Checked along its edges, a few points per side.
function fits(rs, c, w, h, deg) {
  const t = (deg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 2; j++) {
      if (i % 8 && j % 2) continue; // edges only
      const u = (i / 8 - 0.5) * w;
      const v = (j / 2 - 0.5) * h;
      if (!inside(rs, c[0] + u * cos - v * sin, c[1] + u * sin + v * cos)) return false;
    }
  }
  return true;
}

// Where a label of w×h screen pixels fits at zoom k: { x, y, angle } in map
// units and degrees, or null. Straight first, then along the country.
function placeLabel(ccn3, point, w, h, k) {
  const rs = ringsOf(ccn3);
  if (!rs.length) return null;
  const { cx, cy, angle } = shapeOf(rs);
  const mw = (w + 4) / k;
  const mh = (h + 4) / k;
  const angles = [0, Math.round(angle), 15, -15, 30, -30, 45, -45, 60, -60, 90];
  for (const deg of angles) {
    for (const c of [point, [cx, cy]]) {
      if (fits(rs, c, mw, mh, deg)) return { x: c[0], y: c[1], angle: deg };
    }
  }
  return null;
}

// On-screen width of a label: flag (14) + gap (4) + the name at 11px.
const LABEL_FONT_PX = 11;
const LABEL_HEIGHT = 12;
let ctx = null;
const labelWidths = {};
function labelWidth(name) {
  if (!(name in labelWidths)) {
    if (!ctx) {
      ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `500 ${LABEL_FONT_PX}px ${getComputedStyle(document.body).fontFamily}`;
    }
    labelWidths[name] = 18 + ctx.measureText(name).width;
  }
  return labelWidths[name];
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

  // Borders and labels only appear once the zoom has come to rest: drawing
  // them on every frame of the move is what made it lag.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!continent) return undefined;
    const t = setTimeout(() => setSettled(true), 950);
    return () => clearTimeout(t);
  }, [continent, width, height, held]);

  if (!width || !height) return <div ref={hostRef} className="absolute inset-0" />;

  const { k, x, y } = viewFor(continent, width, height, held && MAP_POINTS[held]);
  const countryPath = held && COUNTRY_PATHS[held];
  // Countries too small to have an outline at this resolution get a pin instead.
  const pin = held && !countryPath && MAP_POINTS[held];
  // Name + flag on every country of the continent that can hold one.
  const labels = settled
    ? COUNTRIES.filter((c) => c.continent === continent && MAP_POINTS[c.ccn3])
        .map((c) => ({
          c,
          at: placeLabel(c.ccn3, MAP_POINTS[c.ccn3], labelWidth(c.name), LABEL_HEIGHT, k),
        }))
        .filter((l) => l.at)
    : [];

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
          {settled && (
            <path
              d={bordersOf(continent)}
              fill="none"
              stroke="#1d3b5c"
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
              className="map-fade-in"
            />
          )}
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
      {labels.map(({ c, at }) => (
        <div
          key={c.ccn3}
          className="map-fade-in absolute left-0 top-0 flex items-center gap-1 whitespace-nowrap font-medium text-[#1d3b5c]/70"
          style={{
            left: x + k * at.x,
            top: y + k * at.y,
            fontSize: LABEL_FONT_PX,
            lineHeight: `${LABEL_HEIGHT}px`,
            transform: `translate(-50%, -50%) rotate(${at.angle}deg)`,
          }}
        >
          <CountryFlag code={c.code} width={14} />
          {c.name}
        </div>
      ))}
    </div>
  );
}
